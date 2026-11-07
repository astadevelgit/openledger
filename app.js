/* OpenLedger — interface logic.
   No framework, no network. Reads window.OpenLedgerData and renders every panel.
   Figures are illustrative; see data.js and DESIGN.md. */

(function () {
  "use strict";

  var D = window.OpenLedgerData;
  if (!D) return;

  var PAGE_SIZE = 12;
  var MINISTRY_LIMIT = 8;
  var CURRENT_YEAR = D.currentYear;
  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  var reducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var ministryById = {};
  var stateByCode = {};
  var contractorById = {};

  D.ministries.forEach(function (m) { ministryById[m.id] = m; });
  D.states.forEach(function (s) { stateByCode[s.code] = s; });
  D.contractors.forEach(function (c) { contractorById[c.id] = c; });

  var SECTOR_COLOURS = {
    Works: "#2f6f6b",
    Power: "#c97a1a",
    Health: "#b4432f",
    Education: "#6b4a5b",
    Agriculture: "#b98a3c",
    Transportation: "#5a6b72",
    Defence: "#0e2a24",
    Communications: "#0b5d45",
    Environment: "#6f8f5e",
    Humanitarian: "#a8742c"
  };

  var ui = {
    scope: "all",
    year: CURRENT_YEAR,
    ministry: "all",
    stateCode: "all",
    query: "",
    sort: "value",
    dir: "desc",
    page: 1,
    showAllMinistries: false
  };

  var shownMoney = {};
  var moneyTokens = {};
  var toastTimer = null;
  var drawerTimer = null;
  var tipEl = null;
  var lastFocus = null;

  function $(id) { return document.getElementById(id); }

  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
    });
  }

  function trimDecimal(value, digits) {
    return value.toFixed(digits).replace(/\.0+$/, "").replace(/(\.\d*[1-9])0+$/, "$1");
  }

  function money(value) {
    var n = Number(value) || 0;
    var abs = Math.abs(n);
    var sign = n < 0 ? "\u2212" : "";
    if (abs >= 1e12) return sign + "\u20a6" + trimDecimal(abs / 1e12, 1) + "trn";
    if (abs >= 1e9) return sign + "\u20a6" + trimDecimal(abs / 1e9, 1) + "bn";
    if (abs >= 1e6) return sign + "\u20a6" + trimDecimal(abs / 1e6, 0) + "m";
    if (abs >= 1e4) return sign + "\u20a6" + trimDecimal(abs / 1e3, 0) + "k";
    return sign + "\u20a6" + Math.round(abs).toLocaleString("en-NG");
  }

  function moneyFull(value) {
    return "\u20a6" + Math.round(Number(value) || 0).toLocaleString("en-NG");
  }

  function pct(value, digits) {
    if (!isFinite(value)) return "0%";
    return (value * 100).toFixed(digits == null ? 1 : digits) + "%";
  }

  function formatDate(iso) {
    var parts = String(iso).split("-");
    if (parts.length !== 3) return iso;
    return Number(parts[2]) + " " + MONTHS[Number(parts[1]) - 1] + " " + parts[0];
  }

  function stateNameOf(code) {
    return stateByCode[code] ? stateByCode[code].name : code;
  }

  function stateLabelOf(code) {
    return code === "FCT" ? "FCT" : stateNameOf(code);
  }

  function ministryNameOf(id) {
    return ministryById[id] ? ministryById[id].name : "Federal MDA";
  }

  function ministryShortOf(id) {
    return ministryById[id] ? ministryById[id].short : "Federal MDA";
  }

  function contractorNameOf(id) {
    return contractorById[id] ? contractorById[id].name : "Contractor";
  }

  function awardAgency(c) {
    return c.level === "state"
      ? stateNameOf(c.stateCode) + " \u00b7 " + c.sector
      : ministryShortOf(c.ministryId);
  }

  function levelLabel() {
    if (ui.scope === "federal") return "federal awards";
    if (ui.scope === "states") return "state awards";
    return "federal + state awards";
  }

  function scopeLabel() {
    var one = ui.stateCode === "all" ? null : stateByCode[ui.stateCode];
    if (ui.scope === "federal") return "Federal, national envelope";
    if (ui.scope === "states") return one ? one.name + " State" : "37 state envelopes";
    return one ? "Federal + " + one.name + " State" : "Federal + 37 states";
  }

  function queryTokens() {
    return ui.query.toLowerCase().split(/\s+/).filter(function (t) { return t.length > 0; });
  }

  function matchesQuery(c, tokens) {
    if (!tokens.length) return true;
    var haystack = [
      c.project, c.sector, c.id, c.status, c.method, c.level,
      c.agency || "", stateNameOf(c.stateCode), contractorNameOf(c.contractorId),
      c.ministryId ? ministryNameOf(c.ministryId) : ""
    ].join(" ").toLowerCase();
    return tokens.every(function (token) { return haystack.indexOf(token) !== -1; });
  }

  function passesLevel(c) {
    if (ui.scope === "federal") return c.level === "federal";
    if (ui.scope === "states") return c.level === "state";
    return true;
  }

  function filteredContracts() {
    var tokens = queryTokens();
    return D.contracts.filter(function (c) {
      if (c.year !== ui.year) return false;
      if (!passesLevel(c)) return false;
      if (ui.ministry !== "all" && c.ministryId !== ui.ministry) return false;
      if (ui.stateCode !== "all" && c.stateCode !== ui.stateCode) return false;
      return matchesQuery(c, tokens);
    });
  }

  /* The cartogram keeps every state in view; the selected state is highlighted,
     not used to collapse the map. */
  function cartogramContracts() {
    var tokens = queryTokens();
    return D.contracts.filter(function (c) {
      if (c.year !== ui.year) return false;
      if (!passesLevel(c)) return false;
      if (ui.ministry !== "all" && c.ministryId !== ui.ministry) return false;
      return matchesQuery(c, tokens);
    });
  }

  function federalBudgetFor(year, ministryId) {
    var budget = 0;
    var released = 0;
    D.ministries.forEach(function (m) {
      if (ministryId !== "all" && m.id !== ministryId) return;
      var entry = D.ministryBudgets[m.id][year];
      if (!entry) return;
      budget += entry.budget;
      released += entry.released;
    });
    return { budget: budget, released: released };
  }

  function stateBudgetFor(year, ministryId) {
    var budget = 0;
    var released = 0;
    D.states.forEach(function (s) {
      if (ui.stateCode !== "all" && s.code !== ui.stateCode) return;
      var entry = D.stateBudgets[s.code].years[year];
      if (!entry) return;
      if (ministryId === "all") {
        budget += entry.budget;
        released += entry.released;
      } else if (entry.byMinistry[ministryId]) {
        budget += entry.byMinistry[ministryId].budget;
        released += entry.byMinistry[ministryId].released;
      }
    });
    return { budget: budget, released: released };
  }

  function selectionBudget(year) {
    var budget = 0;
    var released = 0;
    if (ui.scope !== "states") {
      var fed = federalBudgetFor(year, ui.ministry);
      budget += fed.budget;
      released += fed.released;
    }
    if (ui.scope !== "federal") {
      var sub = stateBudgetFor(year, ui.ministry);
      budget += sub.budget;
      released += sub.released;
    }
    return { budget: budget, released: released, rate: budget > 0 ? released / budget : 0 };
  }

  function ministryRows(year) {
    return D.ministries.map(function (m) {
      var budget = 0;
      var released = 0;
      if (ui.scope !== "states") {
        var fed = D.ministryBudgets[m.id][year];
        if (fed) {
          budget += fed.budget;
          released += fed.released;
        }
      }
      if (ui.scope !== "federal") {
        D.states.forEach(function (s) {
          if (ui.stateCode !== "all" && s.code !== ui.stateCode) return;
          var slice = D.stateBudgets[s.code].years[year].byMinistry[m.id];
          budget += slice.budget;
          released += slice.released;
        });
      }
      return { ministry: m, budget: budget, released: released };
    }).sort(function (a, b) { return b.budget - a.budget; });
  }

  function setText(id, text) {
    var node = $(id);
    if (node) node.textContent = text;
  }

  function animateMoney(node, key, value) {
    if (!node) return;
    var from = typeof shownMoney[key] === "number" ? shownMoney[key] : 0;
    shownMoney[key] = value;
    moneyTokens[key] = (moneyTokens[key] || 0) + 1;
    var token = moneyTokens[key];

    if (reducedMotion || !isFinite(value)) {
      node.textContent = money(value);
      return;
    }
    if (from !== 0 && Math.abs(value - from) / Math.max(1, Math.abs(from)) < 0.015) {
      node.textContent = money(value);
      return;
    }

    var start = null;
    var duration = 420;
    function frame(ts) {
      if (moneyTokens[key] !== token) return;
      if (start === null) start = ts;
      var t = Math.min(1, (ts - start) / duration);
      var eased = 1 - Math.pow(1 - t, 3);
      node.textContent = money(from + (value - from) * eased);
      if (t < 1) window.requestAnimationFrame(frame);
    }
    window.requestAnimationFrame(frame);
  }

  function deltaText(now, previous) {
    if (!previous || previous <= 0) return "No prior-year comparison";
    var change = (now - previous) / previous;
    var arrow = change >= 0 ? "+" : "\u2212";
    return arrow + pct(Math.abs(change), 1) + " vs FY" + (ui.year - 1);
  }

  function renderSparkline() {
    var svg = $("sparkBudget");
    if (!svg) return;
    var values = D.years.map(function (year) { return selectionBudget(year).budget; });
    var max = Math.max.apply(null, values);
    var min = Math.min.apply(null, values);
    var span = max - min || 1;
    var points = values.map(function (value, index) {
      var x = 3 + (index / Math.max(1, values.length - 1)) * 114;
      var y = 28 - ((value - min) / span) * 24;
      return [x, y];
    });
    var d = points.map(function (point, index) {
      return (index === 0 ? "M" : "L") + point[0].toFixed(1) + " " + point[1].toFixed(1);
    }).join(" ");
    var last = points[points.length - 1];
    svg.innerHTML =
      '<path d="' + d + '" fill="none" stroke="#0b5d45" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />' +
      '<circle cx="' + last[0].toFixed(1) + '" cy="' + last[1].toFixed(1) + '" r="2.2" fill="#0b5d45" />' +
      '<title>Budget trend, FY' + D.years[0] + " to FY" + D.years[D.years.length - 1] + "</title>";
  }

  function updateKpis(contracts, budget) {
    var prevYear = D.years.indexOf(ui.year) > 0 ? D.years[D.years.indexOf(ui.year) - 1] : null;
    var previous = prevYear ? selectionBudget(prevYear) : null;

    animateMoney($("kpiBudget"), "budget", budget.budget);
    setText("kpiBudgetDelta", previous ? deltaText(budget.budget, previous.budget) : "First year in the series");

    animateMoney($("kpiReleased"), "released", budget.released);
    setText("kpiReleaseRate", pct(budget.rate, 0) + " released \u00b7 " + scopeLabel());
    var meter = $("releaseMeter");
    if (meter) meter.style.width = Math.max(0, Math.min(100, budget.rate * 100)).toFixed(1) + "%";

    var awardTotal = 0;
    var contractorTotals = {};
    var stateSet = {};
    contracts.forEach(function (c) {
      awardTotal += c.value;
      contractorTotals[c.contractorId] = (contractorTotals[c.contractorId] || 0) + c.value;
      stateSet[c.stateCode] = true;
    });

    animateMoney($("kpiContracts"), "contracts", awardTotal);
    setText("kpiContractsMeta", contracts.length === 0
      ? "No awards match the filters"
      : contracts.length + " awards \u00b7 avg " + money(awardTotal / contracts.length) + " \u00b7 " + levelLabel());

    var topContractor = null;
    Object.keys(contractorTotals).forEach(function (id) {
      if (!topContractor || contractorTotals[id] > contractorTotals[topContractor]) topContractor = id;
    });

    setText("kpiContractors", String(Object.keys(contractorTotals).length));
    setText("kpiContractorsMeta", topContractor && awardTotal > 0
      ? "Top: " + contractorById[topContractor].name + " \u00b7 " + pct(contractorTotals[topContractor] / awardTotal, 0)
      : "No awards in view");

    setText("kpiStates", String(Object.keys(stateSet).length));
    var statesNode = $("kpiStates");
    if (statesNode) statesNode.setAttribute("title", Object.keys(stateSet).length + " of 37 states have at least one award in view");

    renderSparkline();
  }

  function renderMinistry() {
    var host = $("ministryChart");
    if (!host) return;
    var rows = ministryRows(ui.year);
    var max = rows.length ? rows[0].budget : 0;
    var visible = ui.showAllMinistries ? rows : rows.slice(0, MINISTRY_LIMIT);

    host.innerHTML = visible.map(function (row) {
      var m = row.ministry;
      var budgetWidth = max > 0 ? (row.budget / max) * 100 : 0;
      var releasedWidth = max > 0 ? (row.released / max) * 100 : 0;
      var rate = row.budget > 0 ? row.released / row.budget : 0;
      var tip = m.name + "\nBudget " + money(row.budget) + "\nReleased " + money(row.released) + " (" + pct(rate, 0) + ")";
      return '<button type="button" class="bar-row" data-ministry="' + esc(m.id) + '" aria-pressed="' +
        (ui.ministry === m.id ? "true" : "false") + '" data-tip="' + esc(tip) + '">' +
        '<span class="bar-row__name">' + esc(m.short) + '</span>' +
        '<span class="bar-row__track" aria-hidden="true">' +
          '<span class="bar-row__budget" style="width:' + budgetWidth.toFixed(1) + '%"></span>' +
          '<span class="bar-row__released" style="width:' + releasedWidth.toFixed(1) + '%"></span>' +
        '</span>' +
        '<span class="bar-row__value">' + money(row.budget) + '</span>' +
      '</button>';
    }).join("");

    var toggle = $("ministryToggle");
    if (toggle) {
      toggle.textContent = ui.showAllMinistries ? "Show top 8" : "View all " + rows.length;
      toggle.setAttribute("aria-expanded", ui.showAllMinistries ? "true" : "false");
    }
  }

  function cartogramData(contracts) {
    var awards = {};
    contracts.forEach(function (c) {
      awards[c.stateCode] = (awards[c.stateCode] || 0) + c.value;
    });

    return D.states.map(function (s) {
      var entry = D.stateBudgets[s.code].years[ui.year];
      var budget = 0;
      if (ui.scope !== "federal") {
        budget = ui.ministry === "all"
          ? entry.budget
          : entry.byMinistry[ui.ministry].budget;
      }
      var award = awards[s.code] || 0;
      var total = budget + award;
      return {
        state: s,
        budget: budget,
        awards: award,
        total: total,
        perCapita: total / (s.pop * 1e6)
      };
    });
  }

  function renderCartogram() {
    var host = $("cartogram");
    if (!host) return;
    var rows = cartogramData(cartogramContracts());
    var sorted = rows.map(function (row) { return row.perCapita; }).sort(function (a, b) { return a - b; });
    var cuts = [0.2, 0.4, 0.6, 0.8].map(function (share) {
      return sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * share))];
    });

    function binFor(value) {
      var bin = 1;
      cuts.forEach(function (cut) { if (value > cut) bin += 1; });
      return bin;
    }

    host.innerHTML = rows.map(function (row) {
      var bin = binFor(row.perCapita);
      var tip = row.state.name +
        "\nPer person " + money(row.perCapita) +
        "\nState budget " + money(row.budget) +
        "\nAwards " + money(row.awards);
      return '<button type="button" class="tile b--' + bin + '" ' +
        'style="grid-column:' + (row.state.col + 1) + ';grid-row:' + (row.state.row + 1) + '" ' +
        'data-state="' + esc(row.state.code) + '" aria-pressed="' + (ui.stateCode === row.state.code ? "true" : "false") + '" ' +
        'data-tip="' + esc(tip) + '" ' +
        'aria-label="' + esc(row.state.name + ": " + money(row.perCapita) + " per person, " + money(row.total) + " total. Filter by this state.") + '">' +
        '<span class="tile__code">' + esc(row.state.code) + '</span>' +
        '<span class="tile__value">' + money(row.perCapita) + '</span>' +
      '</button>';
    }).join("");

    var ranked = rows.slice().sort(function (a, b) { return b.perCapita - a.perCapita; }).slice(0, 8);
    var ranking = $("stateRanking");
    if (ranking) {
      ranking.innerHTML = ranked.map(function (row) {
        return '<button type="button" class="rank-item" data-state-detail="' + esc(row.state.code) + '" ' +
          'aria-label="Open detail for ' + esc(row.state.name) + '">' +
          '<span><strong>' + esc(row.state.name) + '</strong></span>' +
          '<span>' + money(row.perCapita) + '<span class="visually-hidden"> per person</span></span>' +
        '</button>';
      }).join("");
    }
  }

  function groupNodes(counts, limit, otherKey, otherLabel) {
    var keys = Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a]; });
    var map = {};
    var nodes = [];

    if (keys.length > limit) {
      keys.slice(0, limit - 1).forEach(function (key) {
        map[key] = key;
        nodes.push({ key: key, value: counts[key] });
      });
      var sum = 0;
      keys.slice(limit - 1).forEach(function (key) {
        map[key] = otherKey;
        sum += counts[key];
      });
      nodes.push({ key: otherKey, value: sum, label: otherLabel, isOther: true });
    } else {
      keys.forEach(function (key) {
        map[key] = key;
        nodes.push({ key: key, value: counts[key] });
      });
    }
    return { nodes: nodes, map: map };
  }

  function renderSankey(contracts) {
    var host = $("sankey");
    if (!host) return;

    if (!contracts.length) {
      host.innerHTML = '<p class="empty">No awards match this selection. Widen the filters to see the flow.</p>';
      setText("sankeyNote", "No awards in view");
      return;
    }

    var leftCounts = {};
    var midCounts = {};
    var rightCounts = {};
    var totalValue = 0;

    contracts.forEach(function (c) {
      var leftKey = c.level === "state" ? "gov" : (c.ministryId || "federal");
      leftCounts[leftKey] = (leftCounts[leftKey] || 0) + c.value;
      midCounts[c.stateCode] = (midCounts[c.stateCode] || 0) + c.value;
      rightCounts[c.sector] = (rightCounts[c.sector] || 0) + c.value;
      totalValue += c.value;
    });

    var left = groupNodes(leftCounts, 7, "other-left", "Other MDAs");
    var mid = groupNodes(midCounts, 9, "other-mid", "Other states");
    var right = groupNodes(rightCounts, 7, "other-right", "Other sectors");

    function leftMeta(key) {
      if (key === "gov") {
        return { label: "State governments", color: "#c97a1a", action: { kind: "gov" } };
      }
      if (key === "other-left") {
        return { label: "Other MDAs", color: "#5a6b72", action: null };
      }
      var m = ministryById[key];
      return {
        label: m ? m.short : "Federal MDA",
        color: "#0e2a24",
        action: { kind: "ministry", value: key }
      };
    }

    function midMeta(key) {
      if (key === "other-mid") {
        return { label: "Other states", color: "#5a6b72", action: null };
      }
      return {
        label: stateLabelOf(key),
        color: "#0b5d45",
        action: { kind: "state", value: key }
      };
    }

    function rightMeta(key) {
      if (key === "other-right") {
        return { label: "Other sectors", color: "#5a6b72", action: null };
      }
      return {
        label: key,
        color: SECTOR_COLOURS[key] || "#5a6b72",
        action: { kind: "sector", value: key }
      };
    }

    var W = 960;
    var H = 440;
    var padTop = 34;
    var padBottom = 10;
    var gap = 7;
    var nodeWidth = 9;

    var columns = [
      { prefix: "L", x: 14, nodes: left.nodes, meta: leftMeta, label: "Awarding MDA" },
      { prefix: "M", x: 452, nodes: mid.nodes, meta: midMeta, label: "State" },
      { prefix: "R", x: 850, nodes: right.nodes, meta: rightMeta, label: "Sector" }
    ];

    columns.forEach(function (column) {
      var usable = H - padTop - padBottom - gap * Math.max(0, column.nodes.length - 1);
      var sum = column.nodes.reduce(function (acc, node) { return acc + node.value; }, 0) || 1;
      var scale = usable / sum;
      var y = padTop;
      column.nodes.forEach(function (node) {
        var meta = column.meta(node.key);
        node.label = meta.label;
        node.color = meta.color;
        node.action = meta.action;
        node.nodeKey = column.prefix + ":" + node.key;
        node.scale = scale;
        node.y = y;
        node.h = Math.max(3, node.value * scale);
        node.inOffset = 0;
        node.outOffset = 0;
        y += node.h + gap;
      });
      column.key = column.prefix;
      column.nodeMap = {};
      column.nodes.forEach(function (node) { column.nodeMap[node.key] = node; });
    });

    var byNodeKey = {};
    columns.forEach(function (column) {
      column.nodes.forEach(function (node) { byNodeKey[node.nodeKey] = node; });
    });

    var leftLinks = {};
    var rightLinks = {};

    function addLink(bucket, source, target, value) {
      var key = source + "|" + target;
      if (!bucket[key]) bucket[key] = { source: source, target: target, value: 0, count: 0 };
      bucket[key].value += value;
      bucket[key].count += 1;
    }

    contracts.forEach(function (c) {
      var lk = left.map[c.level === "state" ? "gov" : (c.ministryId || "federal")];
      var mk = mid.map[c.stateCode];
      var rk = right.map[c.sector];
      if (!lk || !mk || !rk) return;
      addLink(leftLinks, lk, mk, c.value);
      addLink(rightLinks, mk, rk, c.value);
    });

    function buildLinkPaths(bucket, srcPrefix, dstPrefix) {
      return Object.keys(bucket).map(function (key) {
        var link = bucket[key];
        var source = byNodeKey[srcPrefix + ":" + link.source];
        var target = byNodeKey[dstPrefix + ":" + link.target];
        if (!source || !target) return "";
        var width = Math.max(1, link.value * source.scale);
        var x1 = (srcPrefix === "L" ? columns[0].x : columns[1].x) + nodeWidth;
        var x2 = dstPrefix === "M" ? columns[1].x : columns[2].x;
        var y1 = source.y + source.outOffset + width / 2;
        var y2 = target.y + target.inOffset + width / 2;
        source.outOffset += width;
        target.inOffset += width;
        var midX = (x1 + x2) / 2;
        var d = "M" + x1.toFixed(1) + " " + y1.toFixed(1) +
          "C" + midX.toFixed(1) + " " + y1.toFixed(1) + " " +
          midX.toFixed(1) + " " + y2.toFixed(1) + " " +
          x2.toFixed(1) + " " + y2.toFixed(1);
        var colour = srcPrefix === "L"
          ? (link.source === "gov" ? "#c97a1a" : "#0e2a24")
          : (SECTOR_COLOURS[link.target] || "#5a6b72");
        var tip = source.label + " \u2192 " + target.label + "\n" +
          money(link.value) + " \u00b7 " + link.count + " awards";
        return '<path class="link" d="' + d + '" stroke="' + colour + '" stroke-width="' + width.toFixed(1) + '" ' +
          'data-source="' + srcPrefix + ":" + link.source + '" data-target="' + dstPrefix + ":" + link.target + '" ' +
          'data-tip="' + esc(tip) + '"></path>';
      }).join("");
    }

    var linksMarkup = buildLinkPaths(leftLinks, "L", "M") + buildLinkPaths(rightLinks, "M", "R");

    var nodesMarkup = columns.map(function (column) {
      return column.nodes.map(function (node) {
        var labelX = column.x + nodeWidth + 7;
        var centre = node.y + node.h / 2;
        var twoLine = node.h >= 20;
        var actionAttrs = node.action
          ? ' tabindex="0" role="button" data-action="' + node.action.kind + '" data-value="' + esc(node.action.value) + '" ' +
            'aria-label="' + esc("Filter by " + node.label) + '"'
          : "";
        var tip = node.label + "\n" + money(node.value) + " \u00b7 " + pct(node.value / (totalValue || 1), 1) + " of awards";
        return '<g class="node" data-node-key="' + node.nodeKey + '" data-tip="' + esc(tip) + '"' + actionAttrs + '>' +
          '<rect x="' + column.x + '" y="' + node.y.toFixed(1) + '" width="' + nodeWidth + '" height="' + node.h.toFixed(1) + '" rx="1" fill="' + node.color + '"></rect>' +
          '<text class="node-label" x="' + labelX + '" y="' + (centre + (twoLine ? -1 : 3.5)).toFixed(1) + '">' + esc(node.label) + '</text>' +
          (twoLine
            ? '<text class="node-value" x="' + labelX + '" y="' + (centre + 10).toFixed(1) + '">' + money(node.value) + '</text>'
            : "") +
        '</g>';
      }).join("");
    }).join("");

    var headers = columns.map(function (column) {
      return '<text class="col-label" x="' + column.x + '" y="12">' + column.label + '</text>';
    }).join("");

    host.innerHTML = '<svg viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="Contract award flow from ' +
      contracts.length + ' awards: awarding ministry to state to sector">' +
      headers + '<g class="links">' + linksMarkup + '</g><g class="nodes">' + nodesMarkup + '</g></svg>';

    setText("sankeyNote", money(totalValue) + " \u00b7 " + contracts.length + " awards \u00b7 " +
      left.nodes.length + " MDAs, " + mid.nodes.length + " states, " + right.nodes.length + " sectors");
  }

  function clearSankeyState() {
    var host = $("sankey");
    if (!host) return;
    host.classList.remove("is-hovering");
    host.querySelectorAll(".is-active").forEach(function (node) { node.classList.remove("is-active"); });
  }

  function highlightSankeyLink(link) {
    var host = $("sankey");
    host.classList.add("is-hovering");
    host.querySelectorAll(".link").forEach(function (node) {
      node.classList.toggle("is-active", node === link);
    });
    var keys = [link.getAttribute("data-source"), link.getAttribute("data-target")];
    host.querySelectorAll(".node").forEach(function (node) {
      var rect = node.querySelector("rect");
      if (rect) rect.classList.toggle("is-active", keys.indexOf(node.getAttribute("data-node-key")) !== -1);
    });
  }

  function highlightSankeyNode(node) {
    var host = $("sankey");
    var key = node.getAttribute("data-node-key");
    host.classList.add("is-hovering");
    host.querySelectorAll(".node rect").forEach(function (rect) { rect.classList.remove("is-active"); });
    var ownRect = node.querySelector("rect");
    if (ownRect) ownRect.classList.add("is-active");

    host.querySelectorAll(".link").forEach(function (link) {
      var related = link.getAttribute("data-source") === key || link.getAttribute("data-target") === key;
      link.classList.toggle("is-active", related);
      if (!related) return;
      var otherKey = link.getAttribute("data-source") === key
        ? link.getAttribute("data-target")
        : link.getAttribute("data-source");
      var other = host.querySelector('.node[data-node-key="' + otherKey + '"] rect');
      if (other) other.classList.add("is-active");
    });
  }

  function contractorRows(contracts) {
    var map = {};
    contracts.forEach(function (c) {
      if (!map[c.contractorId]) {
        map[c.contractorId] = {
          id: c.contractorId,
          name: contractorNameOf(c.contractorId),
          sector: contractorById[c.contractorId] ? contractorById[c.contractorId].sector : c.sector,
          home: contractorById[c.contractorId] ? contractorById[c.contractorId].home : c.stateCode,
          value: 0,
          count: 0,
          single: 0,
          noOwn: 0,
          states: {},
          ministries: {}
        };
      }
      var row = map[c.contractorId];
      row.value += c.value;
      row.count += 1;
      if (c.singleBid) row.single += 1;
      if (c.noOwnership) row.noOwn += 1;
      row.states[c.stateCode] = true;
      if (c.ministryId) row.ministries[c.ministryId] = (row.ministries[c.ministryId] || 0) + c.value;
    });

    return Object.keys(map).map(function (key) { return map[key]; }).sort(function (a, b) {
      return b.value - a.value;
    });
  }

  function contractorFlags(row) {
    var flags = [];
    if (row.single >= 2) flags.push({ label: "single-bid \u00d7" + row.single, cls: "flag--coral" });
    if (row.count > 0 && row.noOwn / row.count >= 0.5) flags.push({ label: "no ownership record", cls: "flag--amber" });

    var topShare = 0;
    Object.keys(row.ministries).forEach(function (id) {
      topShare = Math.max(topShare, row.ministries[id] / (row.value || 1));
    });
    if (topShare >= 0.65 && row.count >= 3) flags.push({ label: "concentrated", cls: "" });
    return flags;
  }

  function renderContractors(contracts) {
    var body = $("contractorBody");
    if (!body) return;
    var rows = contractorRows(contracts).slice(0, 10);

    if (!rows.length) {
      body.innerHTML = '<tr><td colspan="5" class="empty-cell">No awards match this selection.</td></tr>';
      return;
    }

    body.innerHTML = rows.map(function (row, index) {
      var flags = contractorFlags(row);
      var flagMarkup = flags.length
        ? flags.map(function (flag) { return '<span class="flag ' + flag.cls + '">' + esc(flag.label) + '</span>'; }).join("")
        : '<span class="cell-sub">None</span>';
      return "<tr>" +
        '<td class="num">' + (index + 1) + "</td>" +
        '<td><button type="button" class="row-button" data-contractor="' + esc(row.id) + '">' + esc(row.name) + "</button>" +
          '<span class="cell-sub">' + esc(row.sector) + " \u00b7 " + esc(stateNameOf(row.home)) + "</span></td>" +
        '<td class="num">' + money(row.value) + "</td>" +
        '<td class="num">' + row.count + "</td>" +
        "<td>" + flagMarkup + "</td>" +
      "</tr>";
    }).join("");
  }

  function contractSortValue(c, key) {
    if (key === "project") return c.project.toLowerCase();
    if (key === "ministry") return awardAgency(c).toLowerCase();
    if (key === "state") return stateNameOf(c.stateCode).toLowerCase();
    if (key === "contractor") return contractorNameOf(c.contractorId).toLowerCase();
    if (key === "awardDate") return c.awardDate;
    return c.value;
  }

  function sortedContracts(contracts) {
    var key = ui.sort;
    var direction = ui.dir === "asc" ? 1 : -1;
    return contracts.slice().sort(function (a, b) {
      var left = contractSortValue(a, key);
      var right = contractSortValue(b, key);
      if (typeof left === "string") return left.localeCompare(right) * direction;
      return (left - right) * direction;
    });
  }

  function statusMarkup(status) {
    var cls = status === "Completed" ? "status--completed"
      : status === "Ongoing" ? "status--ongoing"
      : status === "Awarded" ? "status--awarded"
      : "status--review";
    return '<span class="status ' + cls + '">' + esc(status) + "</span>";
  }

  function renderExplorer(contracts) {
    var body = $("explorerBody");
    var count = $("explorerCount");
    if (!body) return;

    var sorted = sortedContracts(contracts);
    var pages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
    if (ui.page > pages) ui.page = pages;
    if (ui.page < 1) ui.page = 1;
    var start = (ui.page - 1) * PAGE_SIZE;
    var end = Math.min(sorted.length, start + PAGE_SIZE);
    var pageRows = sorted.slice(start, end);

    if (!pageRows.length) {
      body.innerHTML = '<tr><td colspan="8" class="empty-cell">No awards match the current filters. Reset a filter or widen the year.</td></tr>';
    } else {
      body.innerHTML = pageRows.map(function (c) {
        var agency = c.level === "state"
          ? stateNameOf(c.stateCode) + " \u00b7 " + c.sector
          : ministryShortOf(c.ministryId);
        var sub = c.level === "state" ? "State award" : "Federal MDA";
        return "<tr>" +
          '<td><button type="button" class="row-button" data-contract="' + esc(c.id) + '">' + esc(c.project) + "</button>" +
            '<span class="cell-sub">' + esc(c.id) + " \u00b7 " + esc(c.sector) + "</span></td>" +
          "<td>" + esc(agency) + '<span class="cell-sub">' + sub + "</span></td>" +
          "<td>" + esc(stateNameOf(c.stateCode)) + "</td>" +
          "<td>" + esc(contractorNameOf(c.contractorId)) + "</td>" +
          '<td class="num">' + money(c.value) + "</td>" +
          "<td>" + esc(formatDate(c.awardDate)) + '<span class="cell-sub">FY' + c.year + "</span></td>" +
          "<td>" + statusMarkup(c.status) + "</td>" +
          '<td class="col-method">' + esc(c.method) + "</td>" +
        "</tr>";
      }).join("");
    }

    var shownStart = sorted.length ? start + 1 : 0;
    if (count) {
      count.textContent = sorted.length
        ? "Showing " + shownStart + "\u2013" + end + " of " + sorted.length + " awards \u00b7 FY" + ui.year + " \u00b7 " + levelLabel()
        : "No awards match the current filters.";
    }
    setText("explorerCaption", "Contracts matching the current filters (" + sorted.length + ")");
    setText("pageLabel", sorted.length ? "Page " + ui.page + " of " + pages + " \u00b7 " + sorted.length + " awards" : "Page 0 of 0");

    var prev = $("pagePrev");
    var next = $("pageNext");
    if (prev) prev.disabled = ui.page <= 1 || sorted.length === 0;
    if (next) next.disabled = ui.page >= pages || sorted.length === 0;

    var exportButton = $("exportCsv");
    if (exportButton) exportButton.disabled = sorted.length === 0;

    document.querySelectorAll('#contractTable thead th[aria-sort]').forEach(function (th) {
      var button = th.querySelector("button[data-sort]");
      var active = button && button.getAttribute("data-sort") === ui.sort;
      th.setAttribute("aria-sort", active ? (ui.dir === "asc" ? "ascending" : "descending") : "none");
    });
  }

  function csvCell(value) {
    var text = String(value == null ? "" : value);
    if (/[",\r\n]/.test(text)) return '"' + text.replace(/"/g, '""') + '"';
    return text;
  }

  function exportCsv() {
    var rows = sortedContracts(filteredContracts());
    if (!rows.length) return;
    var header = [
      "Reference", "Project", "Level", "Ministry / agency", "State", "Contractor",
      "Sector", "Value (NGN)", "Award date", "Status", "Method", "Single bid", "Ownership record"
    ];
    var lines = [header.join(",")];
    rows.forEach(function (c) {
      lines.push([
        c.id,
        c.project,
        c.level,
        c.level === "state" ? (stateNameOf(c.stateCode) + " State Ministry of " + c.sector) : ministryNameOf(c.ministryId),
        stateNameOf(c.stateCode),
        contractorNameOf(c.contractorId),
        c.sector,
        c.value,
        c.awardDate,
        c.status,
        c.method,
        c.singleBid ? "yes" : "no",
        c.noOwnership ? "missing" : "recorded"
      ].map(csvCell).join(","));
    });

    var blob = new Blob(["\ufeff" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var link = document.createElement("a");
    link.href = url;
    link.download = "openledger-awards-" + ui.year + ".csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    toast("Exported " + rows.length + " award records");
  }

  function renderInsights(contracts, budget) {
    var grid = $("insightsGrid");
    if (!grid) return;

    var rows = ministryRows(ui.year);
    var totalBudget = rows.reduce(function (sum, row) { return sum + row.budget; }, 0);
    var top = rows[0] || null;
    var gap = Math.max(0, budget.budget - budget.released);
    var cards = [];

    cards.push({
      figure: pct(budget.budget > 0 ? gap / budget.budget : 0, 0),
      title: "of the envelope was not released",
      text: money(gap) + " of " + money(budget.budget) + " remains unreleased for " + scopeLabel().toLowerCase() + ".",
      source: "Appropriation vs release"
    });

    cards.push({
      figure: top ? pct(totalBudget > 0 ? top.budget / totalBudget : 0, 0) : "0%",
      title: top ? "of the envelope sits with " + top.ministry.short : "no envelope in view",
      text: top
        ? money(top.budget) + " appropriated, " + money(top.released) + " released (" + pct(top.budget > 0 ? top.released / top.budget : 0, 0) + ")."
        : "Change the level or year to load an appropriation.",
      source: "Ministry envelope"
    });

    if (contracts.length) {
      var awardTotal = contracts.reduce(function (sum, c) { return sum + c.value; }, 0);
      var ranked = contractorRows(contracts);
      var leader = ranked[0];
      cards.push({
        figure: leader ? pct(leader.value / (awardTotal || 1), 0) : "0%",
        title: "of award value goes to one contractor",
        text: leader
          ? leader.name + " holds " + money(leader.value) + " across " + leader.count + " awards in view."
          : "No contractor records in view.",
        source: "Contractor concentration"
      });

      var singleValue = 0;
      var singleCount = 0;
      contracts.forEach(function (c) {
        if (c.singleBid) {
          singleValue += c.value;
          singleCount += 1;
        }
      });
      cards.push({
        figure: pct(singleValue / (awardTotal || 1), 0),
        title: "of award value used a single-bid route",
        text: singleCount + " awards worth " + money(singleValue) + " were single-source or direct.",
        source: "Procurement method"
      });
    } else {
      cards.push({
        figure: "0",
        title: "no awards match this selection",
        text: "Widen the year, level or ministry filters to see procurement findings.",
        source: "Awards in view"
      });
      cards.push({
        figure: "\u2014",
        title: "procurement findings are paused",
        text: "The two budget findings above still describe the selected envelope.",
        source: "Awards in view"
      });
    }

    grid.innerHTML = cards.map(function (card) {
      return '<article class="insight">' +
        '<p class="insight__figure">' + esc(card.figure) + "</p>" +
        "<h3>" + esc(card.title) + "</h3>" +
        "<p>" + esc(card.text) + "</p>" +
        '<p class="insight__source">' + esc(card.source) + "</p>" +
      "</article>";
    }).join("");
  }

  function renderSources() {
    var host = $("sourcesGrid");
    if (host) {
      host.innerHTML = D.sources.map(function (source) {
        var partial = source.status === "partial";
        return '<article class="source">' +
          '<div class="source__top"><h3>' + esc(source.name) + "</h3>" +
            '<span class="source__status' + (partial ? " source__status--partial" : "") + '">' +
              (partial ? "Partial" : "Synced") + "</span></div>" +
          '<p class="source__kind">' + esc(source.kind) + "</p>" +
          '<p class="source__meta">' + esc(source.coverage) + "<br>Updated " + esc(formatDate(source.lastSync)) + " \u00b7 " + esc(source.cadence) + "</p>" +
          '<p class="source__meta">' + esc(source.note) + "</p>" +
        "</article>";
      }).join("");
    }
    setText("methodText", D.meta.methodology);
    setText("licenceText", "Licence: " + D.meta.licence + ".");
  }

  function renderChips() {
    var host = $("chips");
    if (!host) return;
    var chips = [];
    if (ui.scope !== "all") chips.push({ key: "scope", label: ui.scope === "federal" ? "Federal only" : "States only" });
    if (ui.ministry !== "all") chips.push({ key: "ministry", label: ministryShortOf(ui.ministry) });
    if (ui.stateCode !== "all") chips.push({ key: "state", label: stateNameOf(ui.stateCode) });
    if (ui.query) chips.push({ key: "query", label: "\u201c" + ui.query + "\u201d" });

    if (!chips.length) {
      host.innerHTML = '<span class="chip chip--empty">No filters applied</span>';
      return;
    }
    host.innerHTML = chips.map(function (chip) {
      return '<span class="chip">' + esc(chip.label) +
        '<button type="button" data-chip="' + chip.key + '" aria-label="Remove filter ' + esc(chip.label) + '">\u00d7</button>' +
      "</span>";
    }).join("") + '<button type="button" class="chip chip--empty" data-chip="all">Clear all</button>';
  }

  function renderSummary(contracts, budget) {
    var uniqueStates = {};
    var uniqueContractors = {};
    contracts.forEach(function (c) {
      uniqueStates[c.stateCode] = true;
      uniqueContractors[c.contractorId] = true;
    });
    var summary = "Showing " + contracts.length + " awards for FY" + ui.year + " across " +
      Object.keys(uniqueStates).length + " states and " + Object.keys(uniqueContractors).length + " contractors. " +
      "Selected budget " + money(budget.budget) + ", released " + money(budget.released) + ".";
    setText("filterSummary", summary);
  }

  function contractFlags(c) {
    var flags = [];
    if (c.singleBid) flags.push({ label: "single-bid route", cls: "flag--coral" });
    if (c.noOwnership) flags.push({ label: "no ownership record", cls: "flag--amber" });
    if (c.value >= 2e10) flags.push({ label: "high value", cls: "" });
    return flags;
  }

  function openDrawer(title, html, trigger) {
    lastFocus = trigger || document.activeElement;
    setText("drawerTitle", title);
    var body = $("drawerBody");
    if (body) body.innerHTML = html;
    var drawer = $("drawer");
    var scrim = $("scrim");
    if (!drawer) return;
    window.clearTimeout(drawerTimer);
    scrim.hidden = false;
    drawer.hidden = false;
    window.requestAnimationFrame(function () { drawer.classList.add("is-open"); });
    document.body.style.overflow = "hidden";
    var close = $("drawerClose");
    if (close) close.focus();
  }

  function closeDrawer() {
    var drawer = $("drawer");
    var scrim = $("scrim");
    if (!drawer || drawer.hidden) return;
    drawer.classList.remove("is-open");
    document.body.style.overflow = "";
    drawerTimer = window.setTimeout(function () {
      drawer.hidden = true;
      if (scrim) scrim.hidden = true;
    }, reducedMotion ? 0 : 220);
    if (lastFocus && typeof lastFocus.focus === "function") lastFocus.focus();
  }

  function openContractById(id) {
    var contract = null;
    for (var i = 0; i < D.contracts.length; i += 1) {
      if (D.contracts[i].id === id) { contract = D.contracts[i]; break; }
    }
    if (contract) openContract(contract);
  }

  function openContract(c) {
    var flags = contractFlags(c);
    var flagMarkup = flags.length
      ? '<p>' + flags.map(function (flag) { return '<span class="flag ' + flag.cls + '">' + esc(flag.label) + "</span>"; }).join("") + "</p>"
      : '<p class="cell-sub">No illustrative flags on this record.</p>';
    var agency = c.level === "state"
      ? stateNameOf(c.stateCode) + " State Ministry of " + c.sector
      : ministryNameOf(c.ministryId);
    var html = '<dl class="detail-list">' +
      "<dt>Reference</dt><dd>" + esc(c.id) + "</dd>" +
      "<dt>Level</dt><dd>" + (c.level === "state" ? "State award" : "Federal award") + "</dd>" +
      "<dt>Awarding body</dt><dd>" + esc(agency) + "</dd>" +
      "<dt>State</dt><dd>" + esc(stateNameOf(c.stateCode)) + "</dd>" +
      "<dt>Contractor</dt><dd><button type=\"button\" class=\"row-button\" data-contractor=\"" + esc(c.contractorId) + "\">" + esc(contractorNameOf(c.contractorId)) + "</button></dd>" +
      "<dt>Sector</dt><dd>" + esc(c.sector) + "</dd>" +
      "<dt>Value</dt><dd>" + moneyFull(c.value) + "</dd>" +
      "<dt>Award date</dt><dd>" + esc(formatDate(c.awardDate)) + "</dd>" +
      "<dt>Status</dt><dd>" + statusMarkup(c.status) + "</dd>" +
      "<dt>Method</dt><dd>" + esc(c.method) + "</dd>" +
    "</dl>" +
    "<h3>Risk flags</h3>" + flagMarkup +
    "<h3>Record notes</h3>" +
    "<p>This is an illustrative demo record. The project, value and contractor are generated from a fixed seed; nothing here is an allegation about a real supplier.</p>";
    openDrawer(c.project, html);
  }

  function openContractorById(id) {
    var contractor = contractorById[id];
    if (!contractor) return;
    var rows = filteredContracts().filter(function (c) { return c.contractorId === id; });
    var row = contractorRows(rows)[0];
    if (!row) {
      openDrawer(contractor.name, "<p>No awards from this contractor match the current filters.</p>");
      return;
    }
    var flags = contractorFlags(row);
    var flagMarkup = flags.length
      ? '<p>' + flags.map(function (flag) { return '<span class="flag ' + flag.cls + '">' + esc(flag.label) + "</span>"; }).join("") + "</p>"
      : '<p class="cell-sub">No illustrative flags on this contractor in view.</p>';
    var topMinistry = null;
    Object.keys(row.ministries).forEach(function (key) {
      if (!topMinistry || row.ministries[key] > row.ministries[topMinistry]) topMinistry = key;
    });
    var largest = rows.slice().sort(function (a, b) { return b.value - a.value; }).slice(0, 5);

    var html = '<dl class="detail-list">' +
      "<dt>Home state</dt><dd>" + esc(stateNameOf(contractor.home)) + "</dd>" +
      "<dt>Primary sector</dt><dd>" + esc(contractor.sector) + "</dd>" +
      "<dt>Value in view</dt><dd>" + moneyFull(row.value) + "</dd>" +
      "<dt>Awards in view</dt><dd>" + row.count + "</dd>" +
      "<dt>States reached</dt><dd>" + Object.keys(row.states).length + "</dd>" +
      "<dt>Top ministry</dt><dd>" + esc(topMinistry ? ministryNameOf(topMinistry) : "\u2014") + "</dd>" +
    "</dl>" +
    "<h3>Risk flags</h3>" + flagMarkup +
    "<h3>Largest awards in view</h3><ul>" +
      largest.map(function (c) {
        return '<li><button type="button" class="row-button" data-contract="' + esc(c.id) + '">' + esc(c.project) + "</button> " +
          '<span class="cell-sub">' + money(c.value) + " \u00b7 " + esc(stateNameOf(c.stateCode)) + "</span></li>";
      }).join("") +
    "</ul>" +
    "<h3>Record notes</h3><p>Contractor names are fictional and risk flags are illustrative. Beneficial-ownership status is modelled, not verified.</p>";
    openDrawer(contractor.name, html);
  }

  function openStateDetail(code) {
    var state = stateByCode[code];
    if (!state) return;
    var entry = D.stateBudgets[code].years[ui.year];
    var awards = D.contracts.filter(function (c) {
      if (c.year !== ui.year || c.stateCode !== code) return false;
      if (!passesLevel(c)) return false;
      if (ui.ministry !== "all" && c.ministryId !== ui.ministry) return false;
      return matchesQuery(c, queryTokens());
    });
    var awardTotal = awards.reduce(function (sum, c) { return sum + c.value; }, 0);
    var topContractors = contractorRows(awards).slice(0, 3);
    var sectors = {};
    awards.forEach(function (c) { sectors[c.sector] = (sectors[c.sector] || 0) + c.value; });
    var topSectors = Object.keys(sectors).sort(function (a, b) { return sectors[b] - sectors[a]; }).slice(0, 3);
    var perPerson = (entry.budget + awardTotal) / (state.pop * 1e6);

    var html = '<dl class="detail-list">' +
      "<dt>Zone</dt><dd>" + esc(state.zone) + "</dd>" +
      "<dt>Population</dt><dd>" + state.pop.toFixed(1) + " million (2022 est.)</dd>" +
      "<dt>State budget</dt><dd>" + moneyFull(entry.budget) + "</dd>" +
      "<dt>Released</dt><dd>" + moneyFull(entry.released) + " (" + pct(entry.rate, 0) + ")</dd>" +
      "<dt>Awards in view</dt><dd>" + moneyFull(awardTotal) + " \u00b7 " + awards.length + "</dd>" +
      "<dt>Per person</dt><dd>" + money(perPerson) + "</dd>" +
    "</dl>" +
    "<h3>Largest contractors in view</h3>" +
    (topContractors.length
      ? "<ul>" + topContractors.map(function (row) {
          return "<li><button type=\"button\" class=\"row-button\" data-contractor=\"" + esc(row.id) + "\">" + esc(row.name) + "</button> " +
            '<span class="cell-sub">' + money(row.value) + " \u00b7 " + row.count + " awards</span></li>";
        }).join("") + "</ul>"
      : '<p class="cell-sub">No awards match the current filters.</p>') +
    "<h3>Top sectors in view</h3>" +
    (topSectors.length
      ? "<ul>" + topSectors.map(function (sector) {
          return "<li>" + esc(sector) + ' <span class="cell-sub">' + money(sectors[sector]) + "</span></li>";
        }).join("") + "</ul>"
      : '<p class="cell-sub">No sector flow in view.</p>') +
    '<p style="margin-top:18px"><button type="button" class="button" data-filter-state="' + esc(code) + '">Filter dashboard to ' + esc(state.name) + "</button></p>" +
    "<h3>Record notes</h3><p>State envelopes are modelled from published totals; per-capita figures use 2022 population estimates for comparison only.</p>";
    openDrawer(state.name + " State", html);
  }

  function toast(message) {
    var el = $("toast");
    if (!el) return;
    el.textContent = message;
    el.hidden = false;
    window.clearTimeout(toastTimer);
    window.requestAnimationFrame(function () { el.classList.add("is-visible"); });
    toastTimer = window.setTimeout(function () {
      el.classList.remove("is-visible");
      window.setTimeout(function () { el.hidden = true; }, 180);
    }, 2800);
  }

  function positionTip(x, y) {
    if (!tipEl || tipEl.hidden) return;
    var width = tipEl.offsetWidth;
    var height = tipEl.offsetHeight;
    var left = Math.min(window.innerWidth - width - 8, x + 14);
    var top = y + 16;
    if (top + height > window.innerHeight - 8) top = y - height - 12;
    tipEl.style.left = Math.max(8, left) + "px";
    tipEl.style.top = Math.max(8, top) + "px";
  }

  function showTip(text, x, y) {
    if (!tipEl) return;
    tipEl.textContent = text;
    tipEl.hidden = false;
    positionTip(x, y);
  }

  function hideTip() {
    if (tipEl) tipEl.hidden = true;
  }

  function syncControls() {
    var yearSelect = $("yearFilter");
    if (yearSelect) yearSelect.value = String(ui.year);
    var ministrySelect = $("ministryFilter");
    if (ministrySelect) ministrySelect.value = ui.ministry;
    var stateSelect = $("stateFilter");
    if (stateSelect) stateSelect.value = ui.stateCode;

    var queryInput = $("queryFilter");
    if (queryInput && document.activeElement !== queryInput) queryInput.value = ui.query;
    var globalInput = $("globalSearch");
    if (globalInput && document.activeElement !== globalInput) globalInput.value = ui.query;

    document.querySelectorAll('input[name="scope"]').forEach(function (radio) {
      radio.checked = radio.value === ui.scope;
    });
  }

  function setMinistry(id) {
    ui.ministry = ui.ministry === id ? "all" : id;
    ui.page = 1;
    render();
  }

  function setStateFilter(code) {
    ui.stateCode = ui.stateCode === code ? "all" : code;
    ui.page = 1;
    render();
  }

  function setScope(scope) {
    ui.scope = scope;
    ui.page = 1;
    render();
  }

  function resetFilters() {
    ui.scope = "all";
    ui.year = CURRENT_YEAR;
    ui.ministry = "all";
    ui.stateCode = "all";
    ui.query = "";
    ui.sort = "value";
    ui.dir = "desc";
    ui.page = 1;
    render();
  }

  function render() {
    var contracts = filteredContracts();
    var budget = selectionBudget(ui.year);
    updateKpis(contracts, budget);
    renderMinistry();
    renderCartogram();
    renderSankey(contracts);
    renderContractors(contracts);
    renderExplorer(contracts);
    renderInsights(contracts, budget);
    renderChips();
    renderSummary(contracts, budget);
    syncControls();
  }

  function populateSelects() {
    var yearSelect = $("yearFilter");
    if (yearSelect) {
      D.years.slice().sort(function (a, b) { return b - a; }).forEach(function (year) {
        var option = document.createElement("option");
        option.value = String(year);
        option.textContent = "FY" + year;
        yearSelect.appendChild(option);
      });
    }

    var ministrySelect = $("ministryFilter");
    if (ministrySelect) {
      var allMinistries = document.createElement("option");
      allMinistries.value = "all";
      allMinistries.textContent = "All ministries";
      ministrySelect.appendChild(allMinistries);
      D.ministries.forEach(function (m) {
        var option = document.createElement("option");
        option.value = m.id;
        option.textContent = m.short;
        ministrySelect.appendChild(option);
      });
    }

    var stateSelect = $("stateFilter");
    if (stateSelect) {
      var allStates = document.createElement("option");
      allStates.value = "all";
      allStates.textContent = "All states + FCT";
      stateSelect.appendChild(allStates);
      D.states.slice().sort(function (a, b) { return a.name.localeCompare(b.name); }).forEach(function (s) {
        var option = document.createElement("option");
        option.value = s.code;
        option.textContent = s.name;
        stateSelect.appendChild(option);
      });
    }
  }

  function activateSankeyNode(node) {
    var kind = node.getAttribute("data-action");
    var value = node.getAttribute("data-value");
    if (kind === "ministry") setMinistry(value);
    else if (kind === "state") setStateFilter(value);
    else if (kind === "sector") {
      ui.query = ui.query === value ? "" : value;
      ui.page = 1;
      render();
    } else if (kind === "gov") {
      setScope(ui.scope === "states" ? "all" : "states");
    }
  }

  function bindEvents() {
    document.querySelectorAll('input[name="scope"]').forEach(function (radio) {
      radio.addEventListener("change", function () { setScope(this.value); });
    });

    var yearSelect = $("yearFilter");
    if (yearSelect) {
      yearSelect.addEventListener("change", function () {
        ui.year = Number(this.value);
        ui.page = 1;
        render();
      });
    }

    var ministrySelect = $("ministryFilter");
    if (ministrySelect) {
      ministrySelect.addEventListener("change", function () {
        ui.ministry = this.value;
        ui.page = 1;
        render();
      });
    }

    var stateSelect = $("stateFilter");
    if (stateSelect) {
      stateSelect.addEventListener("change", function () {
        ui.stateCode = this.value;
        ui.page = 1;
        render();
      });
    }

    function handleQueryInput(event) {
      ui.query = event.target.value;
      ui.page = 1;
      render();
    }
    var queryInput = $("queryFilter");
    if (queryInput) queryInput.addEventListener("input", handleQueryInput);
    var globalInput = $("globalSearch");
    if (globalInput) globalInput.addEventListener("input", handleQueryInput);

    var reset = $("resetFilters");
    if (reset) reset.addEventListener("click", resetFilters);

    var ministryChart = $("ministryChart");
    if (ministryChart) {
      ministryChart.addEventListener("click", function (event) {
        var row = event.target.closest("[data-ministry]");
        if (row) setMinistry(row.getAttribute("data-ministry"));
      });
    }

    var ministryToggle = $("ministryToggle");
    if (ministryToggle) {
      ministryToggle.addEventListener("click", function () {
        ui.showAllMinistries = !ui.showAllMinistries;
        renderMinistry();
      });
    }

    var cartogram = $("cartogram");
    if (cartogram) {
      cartogram.addEventListener("click", function (event) {
        var tile = event.target.closest("[data-state]");
        if (tile) setStateFilter(tile.getAttribute("data-state"));
      });
    }

    var ranking = $("stateRanking");
    if (ranking) {
      ranking.addEventListener("click", function (event) {
        var item = event.target.closest("[data-state-detail]");
        if (item) openStateDetail(item.getAttribute("data-state-detail"));
      });
    }

    var chips = $("chips");
    if (chips) {
      chips.addEventListener("click", function (event) {
        var button = event.target.closest("[data-chip]");
        if (!button) return;
        var key = button.getAttribute("data-chip");
        if (key === "all") resetFilters();
        else {
          if (key === "scope") ui.scope = "all";
          if (key === "ministry") ui.ministry = "all";
          if (key === "state") ui.stateCode = "all";
          if (key === "query") ui.query = "";
          ui.page = 1;
          render();
        }
      });
    }

    document.querySelectorAll("#contractTable [data-sort]").forEach(function (button) {
      button.addEventListener("click", function () {
        var key = this.getAttribute("data-sort");
        if (ui.sort === key) {
          ui.dir = ui.dir === "asc" ? "desc" : "asc";
        } else {
          ui.sort = key;
          ui.dir = key === "value" || key === "awardDate" ? "desc" : "asc";
        }
        ui.page = 1;
        render();
      });
    });

    var exportButton = $("exportCsv");
    if (exportButton) exportButton.addEventListener("click", exportCsv);

    var prev = $("pagePrev");
    if (prev) prev.addEventListener("click", function () { ui.page -= 1; render(); });
    var next = $("pageNext");
    if (next) next.addEventListener("click", function () { ui.page += 1; render(); });

    var refresh = $("refreshSources");
    if (refresh) {
      refresh.addEventListener("click", function () {
        var button = this;
        button.disabled = true;
        button.textContent = "Re-checking\u2026";
        toast("Re-checking 5 sources\u2026");
        window.setTimeout(function () {
          D.sources.forEach(function (source) { source.lastSync = "2026-11-06"; });
          renderSources();
          button.disabled = false;
          button.textContent = "Refresh data";
          toast("Sources re-checked \u00b7 demo dataset unchanged");
        }, 700);
      });
    }

    var sankey = $("sankey");
    if (sankey) {
      sankey.addEventListener("mouseover", function (event) {
        var node = event.target.closest(".node");
        if (node) {
          highlightSankeyNode(node);
          return;
        }
        var link = event.target.closest(".link");
        if (link) highlightSankeyLink(link);
      });
      sankey.addEventListener("mouseleave", clearSankeyState);
      sankey.addEventListener("focusin", function (event) {
        var node = event.target.closest(".node");
        if (node) highlightSankeyNode(node);
      });
      sankey.addEventListener("focusout", clearSankeyState);
      sankey.addEventListener("click", function (event) {
        var node = event.target.closest(".node");
        if (node && node.getAttribute("data-action")) activateSankeyNode(node);
      });
      sankey.addEventListener("keydown", function (event) {
        var node = event.target.closest(".node");
        if (!node || !node.getAttribute("data-action")) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          activateSankeyNode(node);
        }
      });
    }

    document.addEventListener("click", function (event) {
      var contractButton = event.target.closest("[data-contract]");
      if (contractButton) {
        openContractById(contractButton.getAttribute("data-contract"));
        return;
      }
      var contractorButton = event.target.closest("[data-contractor]");
      if (contractorButton) {
        openContractorById(contractorButton.getAttribute("data-contractor"));
        return;
      }
      var filterButton = event.target.closest("[data-filter-state]");
      if (filterButton) {
        closeDrawer();
        setStateFilter(filterButton.getAttribute("data-filter-state"));
      }
    });

    var drawerClose = $("drawerClose");
    if (drawerClose) drawerClose.addEventListener("click", closeDrawer);
    var scrim = $("scrim");
    if (scrim) scrim.addEventListener("click", closeDrawer);

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        closeDrawer();
        hideTip();
        return;
      }
      if (event.key !== "Tab") return;
      var drawer = $("drawer");
      if (!drawer || drawer.hidden) return;
      var focusable = drawer.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
      if (!focusable.length) return;
      var first = focusable[0];
      var last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });

    document.addEventListener("mouseover", function (event) {
      var target = event.target.closest ? event.target.closest("[data-tip]") : null;
      if (!target) return;
      showTip(target.getAttribute("data-tip"), event.clientX, event.clientY);
    });
    document.addEventListener("mousemove", function (event) {
      if (tipEl && !tipEl.hidden) positionTip(event.clientX, event.clientY);
    });
    document.addEventListener("mouseout", function (event) {
      var target = event.target.closest ? event.target.closest("[data-tip]") : null;
      if (!target) return;
      if (event.relatedTarget && target.contains(event.relatedTarget)) return;
      hideTip();
    });
    document.addEventListener("focusin", function (event) {
      var target = event.target.closest ? event.target.closest("[data-tip]") : null;
      if (!target) return;
      var rect = target.getBoundingClientRect();
      showTip(target.getAttribute("data-tip"), rect.left + rect.width / 2, rect.bottom - 8);
    });
    document.addEventListener("focusout", hideTip);
    document.addEventListener("click", hideTip);
  }

  function init() {
    tipEl = $("tooltip");
    populateSelects();
    bindEvents();
    renderSources();
    render();
  }

  init();
})();
