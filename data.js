/* OpenLedger — seeded demo dataset.
   Illustrative figures modelled on BudgIT / Open Treasury / NASS / state budget
   and procurement portals. Not live official data. Contractor names are fictional.
   No network calls. Deterministic: same seed, same numbers, every load. */

(function () {
  "use strict";

  var SEED = 0x5eed2026;

  function mulberry32(a) {
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  var rnd = mulberry32(SEED);

  function randn() {
    var u = 0;
    var v = 0;
    while (u === 0) u = rnd();
    while (v === 0) v = rnd();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  function pick(list) {
    return list[Math.floor(rnd() * list.length)];
  }

  function intBetween(min, max) {
    return Math.floor(min + rnd() * (max - min + 1));
  }

  var YEARS = [2022, 2023, 2024, 2025, 2026];
  var CURRENT_YEAR = 2026;

  var FEDERAL_TOTAL = {
    2022: 17.13e12,
    2023: 21.83e12,
    2024: 28.77e12,
    2025: 54.99e12,
    2026: 62.4e12
  };

  var STATE_TOTAL = {
    2022: 9.4e12,
    2023: 11.6e12,
    2024: 15.2e12,
    2025: 28.9e12,
    2026: 33.1e12
  };

  var RELEASE_RATE = {
    2022: 0.78,
    2023: 0.76,
    2024: 0.71,
    2025: 0.82,
    2026: 0.68
  };

  var MINISTRIES = [
    { id: "works", name: "Ministry of Works", short: "Works", weight: 0.132, bias: 0.98 },
    { id: "health", name: "Ministry of Health", short: "Health", weight: 0.108, bias: 1.06 },
    { id: "education", name: "Ministry of Education", short: "Education", weight: 0.096, bias: 1.02 },
    { id: "defence", name: "Ministry of Defence", short: "Defence", weight: 0.091, bias: 1.12 },
    { id: "power", name: "Ministry of Power", short: "Power", weight: 0.074, bias: 0.92 },
    { id: "agriculture", name: "Ministry of Agriculture & Food Security", short: "Agriculture", weight: 0.061, bias: 0.95 },
    { id: "transport", name: "Ministry of Transportation", short: "Transportation", weight: 0.052, bias: 0.88 },
    { id: "water", name: "Ministry of Water Resources", short: "Water Resources", weight: 0.049, bias: 0.84 },
    { id: "humanitarian", name: "Ministry of Humanitarian Affairs", short: "Humanitarian Affairs", weight: 0.041, bias: 0.79 },
    { id: "interior", name: "Ministry of Interior", short: "Interior", weight: 0.033, bias: 1.01 },
    { id: "finance", name: "Ministry of Finance, Budget & National Planning", short: "Finance & Budget", weight: 0.031, bias: 1.08 },
    { id: "comms", name: "Ministry of Communications & Digital Economy", short: "Communications", weight: 0.029, bias: 0.9 },
    { id: "environment", name: "Ministry of Environment", short: "Environment", weight: 0.021, bias: 0.82 },
    { id: "petroleum", name: "Ministry of Petroleum Resources", short: "Petroleum", weight: 0.018, bias: 1.15 },
    { id: "nddc", name: "Niger Delta Development Commission", short: "NDDC", weight: 0.046, bias: 0.74, kind: "agency" },
    { id: "ubec", name: "Universal Basic Education Commission", short: "UBEC", weight: 0.038, bias: 0.86, kind: "agency" }
  ];

  var MINISTRY_TOTAL_WEIGHT = MINISTRIES.reduce(function (sum, m) {
    return sum + m.weight;
  }, 0);

  var STATES = [
    { code: "SOK", name: "Sokoto", zone: "North West", pop: 5.9, col: 1, row: 0 },
    { code: "KEB", name: "Kebbi", zone: "North West", pop: 4.9, col: 2, row: 0 },
    { code: "ZAM", name: "Zamfara", zone: "North West", pop: 5.3, col: 3, row: 0 },
    { code: "KAT", name: "Katsina", zone: "North West", pop: 9.3, col: 4, row: 0 },
    { code: "JIG", name: "Jigawa", zone: "North West", pop: 6.8, col: 5, row: 0 },
    { code: "YOB", name: "Yobe", zone: "North East", pop: 3.6, col: 7, row: 0 },
    { code: "BOR", name: "Borno", zone: "North East", pop: 6.1, col: 8, row: 0 },
    { code: "NIG", name: "Niger", zone: "North Central", pop: 6.0, col: 2, row: 1 },
    { code: "KAD", name: "Kaduna", zone: "North West", pop: 8.3, col: 4, row: 1 },
    { code: "KAN", name: "Kano", zone: "North West", pop: 15.1, col: 5, row: 1 },
    { code: "BAU", name: "Bauchi", zone: "North East", pop: 7.5, col: 6, row: 1 },
    { code: "GOM", name: "Gombe", zone: "North East", pop: 3.7, col: 7, row: 1 },
    { code: "ADA", name: "Adamawa", zone: "North East", pop: 4.5, col: 8, row: 1 },
    { code: "KWA", name: "Kwara", zone: "North Central", pop: 3.5, col: 1, row: 2 },
    { code: "FCT", name: "Federal Capital Territory", zone: "North Central", pop: 3.6, col: 3, row: 2, capital: true },
    { code: "PLA", name: "Plateau", zone: "North Central", pop: 4.5, col: 5, row: 2 },
    { code: "TAR", name: "Taraba", zone: "North East", pop: 3.3, col: 7, row: 2 },
    { code: "OYO", name: "Oyo", zone: "South West", pop: 7.8, col: 1, row: 3 },
    { code: "KOG", name: "Kogi", zone: "North Central", pop: 4.4, col: 3, row: 3 },
    { code: "NAS", name: "Nasarawa", zone: "North Central", pop: 2.6, col: 4, row: 3 },
    { code: "BEN", name: "Benue", zone: "North Central", pop: 6.1, col: 6, row: 3 },
    { code: "OGU", name: "Ogun", zone: "South West", pop: 5.9, col: 1, row: 4 },
    { code: "OSU", name: "Osun", zone: "South West", pop: 4.7, col: 2, row: 4 },
    { code: "EKI", name: "Ekiti", zone: "South West", pop: 3.4, col: 3, row: 4 },
    { code: "OND", name: "Ondo", zone: "South West", pop: 5.1, col: 4, row: 4 },
    { code: "EDO", name: "Edo", zone: "South South", pop: 4.5, col: 5, row: 4 },
    { code: "ENU", name: "Enugu", zone: "South East", pop: 4.7, col: 7, row: 4 },
    { code: "EBO", name: "Ebonyi", zone: "South East", pop: 3.1, col: 8, row: 4 },
    { code: "LAG", name: "Lagos", zone: "South West", pop: 15.4, col: 1, row: 5 },
    { code: "DEL", name: "Delta", zone: "South South", pop: 5.6, col: 4, row: 5 },
    { code: "ANA", name: "Anambra", zone: "South East", pop: 5.5, col: 6, row: 5 },
    { code: "ABI", name: "Abia", zone: "South East", pop: 3.7, col: 7, row: 5 },
    { code: "CRO", name: "Cross River", zone: "South South", pop: 4.2, col: 9, row: 5 },
    { code: "BAY", name: "Bayelsa", zone: "South South", pop: 2.4, col: 5, row: 6 },
    { code: "RIV", name: "Rivers", zone: "South South", pop: 7.3, col: 6, row: 6 },
    { code: "IMO", name: "Imo", zone: "South East", pop: 5.4, col: 7, row: 6 },
    { code: "AKW", name: "Akwa Ibom", zone: "South South", pop: 5.5, col: 8, row: 6 }
  ];

  var STATE_TOTAL_POP = STATES.reduce(function (sum, s) {
    return sum + s.pop;
  }, 0);

  var CONTRACTORS = [
    { id: "sahel", name: "Sahel Infra Ltd", sector: "Works", home: "KAD", weight: 1.5 },
    { id: "delta-bridge", name: "Delta Bridge Consortium", sector: "Works", home: "DEL", weight: 1.35 },
    { id: "northstar", name: "Northstar Energy Services", sector: "Power", home: "KAN", weight: 1.3 },
    { id: "kano-renew", name: "Kano Renewables", sector: "Power", home: "KAN", weight: 1.0 },
    { id: "arewa-agro", name: "Arewa Agro Systems", sector: "Agriculture", home: "KAT", weight: 0.95 },
    { id: "greenbelt", name: "Green Belt Irrigation", sector: "Water", home: "BEN", weight: 0.9 },
    { id: "lagos-marine", name: "Lagos Marine Works", sector: "Transportation", home: "LAG", weight: 1.15 },
    { id: "cedar-health", name: "Cedar Health Supply", sector: "Health", home: "LAG", weight: 1.05 },
    { id: "zaria-med", name: "Zaria Medical Logistics", sector: "Health", home: "KAD", weight: 0.8 },
    { id: "horizon-learn", name: "Horizon Learning Systems", sector: "Education", home: "ABI", weight: 0.85 },
    { id: "bauchi-class", name: "Bauchi Classroom Works", sector: "Education", home: "BAU", weight: 0.75 },
    { id: "riverline", name: "Riverline Construction", sector: "Works", home: "RIV", weight: 1.1 },
    { id: "trans-sahel", name: "Trans-Sahel Logistics", sector: "Transportation", home: "KAN", weight: 1.0 },
    { id: "meridian-def", name: "Meridian Defence Systems", sector: "Defence", home: "FCT", weight: 1.25 },
    { id: "frontier-sec", name: "Frontier Security Services", sector: "Defence", home: "BOR", weight: 0.85 },
    { id: "ogun-build", name: "Ogun Industrial Build", sector: "Works", home: "OGU", weight: 0.8 },
    { id: "benue-water", name: "Benue Water Systems", sector: "Water", home: "BEN", weight: 0.7 },
    { id: "plateau-net", name: "Plateau Digital Networks", sector: "Communications", home: "PLA", weight: 0.75 },
    { id: "savannah-cloud", name: "Savannah Cloud Services", sector: "Communications", home: "LAG", weight: 0.8 },
    { id: "coastal-dredge", name: "Coastal Dredging Ltd", sector: "Environment", home: "BAY", weight: 0.7 },
    { id: "nd-marine", name: "Niger Delta Marine", sector: "Environment", home: "RIV", weight: 0.65 },
    { id: "harmony-fac", name: "Harmony Facilities Ltd", sector: "Humanitarian", home: "FCT", weight: 0.6 },
    { id: "relief-chain", name: "Relief Chain Logistics", sector: "Humanitarian", home: "BOR", weight: 0.7 },
    { id: "eastern-gate", name: "Eastern Gate Construction", sector: "Works", home: "ENU", weight: 0.75 },
    { id: "midbelt", name: "Midbelt Engineering", sector: "Works", home: "PLA", weight: 0.7 },
    { id: "sokoto-solar", name: "Sokoto Solar Array", sector: "Power", home: "SOK", weight: 0.65 },
    { id: "atlantic-port", name: "Atlantic Port Services", sector: "Transportation", home: "CRO", weight: 0.6 },
    { id: "unity-pharma", name: "Unity Pharmaceuticals", sector: "Health", home: "ANA", weight: 0.55 },
    { id: "crown-estate", name: "Crown Estate Projects", sector: "Works", home: "LAG", weight: 0.6 },
    { id: "lake-chad", name: "Lake Chad Recovery Initiative", sector: "Humanitarian", home: "BOR", weight: 0.5 },
    { id: "kaduna-rail", name: "Kaduna Rail Systems", sector: "Transportation", home: "KAD", weight: 0.55 }
  ];

  var SECTOR_MINISTRIES = {
    Works: ["works", "transport"],
    Power: ["power"],
    Health: ["health"],
    Education: ["education", "ubec"],
    Agriculture: ["agriculture"],
    Water: ["water"],
    Transportation: ["transport", "works"],
    Defence: ["defence"],
    Communications: ["comms"],
    Environment: ["environment", "nddc"],
    Humanitarian: ["humanitarian", "nddc"]
  };

  var SECTOR_BASE = {
    Works: 9.5e9,
    Power: 14e9,
    Health: 5.2e9,
    Education: 3.6e9,
    Agriculture: 3.1e9,
    Water: 4.4e9,
    Transportation: 11e9,
    Defence: 16e9,
    Communications: 2.8e9,
    Environment: 6.2e9,
    Humanitarian: 2.2e9
  };

  var PROJECT_TEMPLATES = {
    Works: [
      "Rehabilitation of {n}km rural feeder road — {state}",
      "Bridge reconstruction and approach roads — {state}",
      "Drainage and erosion control, phase {p} — {state}",
      "Reconstruction of township roads — {state}"
    ],
    Power: [
      "Solar hybrid mini-grid, {n} communities — {state}",
      "33kV distribution line extension — {state}",
      "Substation upgrade and transformer replacement — {state}",
      "Metering and loss-reduction programme — {state}"
    ],
    Health: [
      "Construction of {n}-bed cottage hospital — {state}",
      "Upgrade of primary healthcare centres — {state}",
      "Procurement of medical equipment — {state}",
      "Cold-chain and pharmaceutical storage — {state}"
    ],
    Education: [
      "Rehabilitation of {n} primary school blocks — {state}",
      "Construction of junior secondary school — {state}",
      "Supply of laboratory and ICT equipment — {state}",
      "Teacher training and classroom materials — {state}"
    ],
    Agriculture: [
      "Irrigation scheme expansion, {n} hectares — {state}",
      "Supply of certified seed and fertiliser — {state}",
      "Grain storage and aggregation facility — {state}",
      "Livestock health and veterinary programme — {state}"
    ],
    Water: [
      "Water treatment plant upgrade — {state}",
      "Drilling and equipping {n} boreholes — {state}",
      "Urban pipe network rehabilitation — {state}",
      "Dam spillway and reservoir maintenance — {state}"
    ],
    Transportation: [
      "Rail signalling and track upgrade — {state} corridor",
      "Procurement of {n} mass-transit buses — {state}",
      "Inland port access road — {state}",
      "Ferry terminal and jetty works — {state}"
    ],
    Defence: [
      "Construction of forward operating base — {state}",
      "Procurement of patrol vehicles — {state}",
      "Barracks accommodation and utilities — {state}",
      "Communications and surveillance equipment — {state}"
    ],
    Communications: [
      "Digital skills centre, {n} workstations — {state}",
      "Fibre backbone extension — {state}",
      "Community broadband access points — {state}",
      "Government service portal integration — {state}"
    ],
    Environment: [
      "Flood mitigation and embankment works — {state}",
      "Reforestation and shelterbelt programme — {state}",
      "Solid waste transfer station — {state}",
      "Coastal erosion protection — {state}"
    ],
    Humanitarian: [
      "Relief supply and logistics contract — {state}",
      "Resettlement housing units — {state}",
      "Cash transfer delivery and verification — {state}",
      "Camp water and sanitation upgrade — {state}"
    ]
  };

  var STATUSES = [
    { value: "Completed", weight: 0.45 },
    { value: "Ongoing", weight: 0.35 },
    { value: "Awarded", weight: 0.12 },
    { value: "Under review", weight: 0.08 }
  ];

  var METHODS = [
    { value: "Open competitive", weight: 0.52 },
    { value: "Restricted", weight: 0.26 },
    { value: "Direct", weight: 0.14 },
    { value: "Single-source", weight: 0.08 }
  ];

  function weighted(list) {
    var total = list.reduce(function (s, item) { return s + item.weight; }, 0);
    var roll = rnd() * total;
    for (var i = 0; i < list.length; i += 1) {
      roll -= list[i].weight;
      if (roll <= 0) return list[i];
    }
    return list[list.length - 1];
  }

  function templateFor(sector) {
    var pool = PROJECT_TEMPLATES[sector] || PROJECT_TEMPLATES.Works;
    var text = pick(pool);
    return text
      .replace("{n}", String(intBetween(6, 84)))
      .replace("{p}", String(intBetween(1, 4)));
  }

  // --- budgets -------------------------------------------------------------

  var ministryBudgets = {};
  MINISTRIES.forEach(function (m) {
    ministryBudgets[m.id] = {};
    YEARS.forEach(function (year) {
      var noise = 0.94 + rnd() * 0.12;
      var share = (m.weight / MINISTRY_TOTAL_WEIGHT) * noise;
      var budget = FEDERAL_TOTAL[year] * share;
      var rate = Math.min(0.97, Math.max(0.42, RELEASE_RATE[year] * m.bias + (rnd() - 0.5) * 0.09));
      ministryBudgets[m.id][year] = { budget: budget, released: budget * rate, rate: rate };
    });
  });

  var stateBudgets = {};
  STATES.forEach(function (s) {
    var weight = Math.pow(s.pop, 0.88);
    if (s.capital) weight *= 1.55;
    weight *= 0.9 + rnd() * 0.2;
    stateBudgets[s.code] = { weight: weight, years: {} };
  });

  var stateWeightTotal = STATES.reduce(function (sum, s) {
    return sum + stateBudgets[s.code].weight;
  }, 0);

  STATES.forEach(function (s) {
    YEARS.forEach(function (year) {
      var budget = STATE_TOTAL[year] * (stateBudgets[s.code].weight / stateWeightTotal);
      var rate = Math.min(0.96, Math.max(0.4, RELEASE_RATE[year] + (rnd() - 0.5) * 0.16));
      var entry = { budget: budget, released: budget * rate, rate: rate, byMinistry: {} };

      // State envelopes are split across the same portfolio profile as the federal
      // budgets, with a per-state noise term. The split is modelled, not published.
      var shares = MINISTRIES.map(function (m) {
        return m.weight * (0.82 + rnd() * 0.36);
      });
      var shareTotal = shares.reduce(function (sum, value) { return sum + value; }, 0);

      MINISTRIES.forEach(function (m, index) {
        var share = shares[index] / shareTotal;
        entry.byMinistry[m.id] = {
          budget: budget * share,
          released: budget * rate * share
        };
      });

      stateBudgets[s.code].years[year] = entry;
    });
  });

  // --- contracts -----------------------------------------------------------

  var contracts = [];
  var counter = 0;

  var contractorWeightTotal = CONTRACTORS.reduce(function (sum, c) {
    return sum + c.weight;
  }, 0);

  YEARS.forEach(function (year) {
    var procurementPool = (FEDERAL_TOTAL[year] + STATE_TOTAL[year]) * 0.095;
    var perYear = 118;
    var raw = [];

    for (var i = 0; i < perYear; i += 1) {
      var contractor = null;
      var roll = rnd() * contractorWeightTotal;
      for (var c = 0; c < CONTRACTORS.length; c += 1) {
        roll -= CONTRACTORS[c].weight;
        if (roll <= 0) { contractor = CONTRACTORS[c]; break; }
      }
      if (!contractor) contractor = CONTRACTORS[0];

      var sector = contractor.sector;
      if (rnd() < 0.14) {
        var sectors = Object.keys(SECTOR_MINISTRIES);
        sector = pick(sectors);
      }

      var ministriesForSector = SECTOR_MINISTRIES[sector] || ["works"];
      var ministryId = pick(ministriesForSector);

      var stateCode;
      if (rnd() < 0.55) {
        stateCode = contractor.home;
      } else {
        var popRoll = rnd() * STATE_TOTAL_POP;
        for (var s = 0; s < STATES.length; s += 1) {
          popRoll -= STATES[s].pop;
          if (popRoll <= 0) { stateCode = STATES[s].code; break; }
        }
        if (!stateCode) stateCode = "FCT";
      }

      // State-level awards are made by a state MDA; federal awards by a federal MDA.
      var level = rnd() < 0.58 ? "federal" : "state";
      var agency = null;
      if (level === "state") {
        ministryId = null;
        agency = stateName(stateCode) + " State Ministry of " + sector;
      }

      var base = SECTOR_BASE[sector] || 5e9;
      var value = base * Math.exp(randn() * 0.85) * 0.55;
      value = Math.max(1.8e8, Math.min(4.8e10, value));
      if (level === "state") value *= 0.62;

      var status = weighted(STATUSES).value;
      var method = weighted(METHODS).value;
      if (status === "Completed" && rnd() < 0.12) method = "Single-source";

      raw.push({
        project: templateFor(sector).replace("{state}", stateName(stateCode)),
        sector: sector,
        ministryId: ministryId,
        agency: agency,
        level: level,
        stateCode: stateCode,
        contractorId: contractor.id,
        value: value,
        status: status,
        method: method
      });
    }

    // normalise raw pool to the year's procurement total
    var rawTotal = raw.reduce(function (sum, r) { return sum + r.value; }, 0);
    var scale = procurementPool / rawTotal;

    raw.forEach(function (r) {
      counter += 1;
      var month = intBetween(1, 12);
      var day = intBetween(1, 28);
      contracts.push({
        id: "OL-" + year + "-" + String(counter).padStart(4, "0"),
        project: r.project,
        sector: r.sector,
        ministryId: r.ministryId,
        agency: r.agency,
        level: r.level,
        stateCode: r.stateCode,
        contractorId: r.contractorId,
        value: Math.round(r.value * scale),
        year: year,
        awardDate: year + "-" + String(month).padStart(2, "0") + "-" + String(day).padStart(2, "0"),
        status: r.status,
        method: r.method
      });
    });
  });

  function stateName(code) {
    for (var i = 0; i < STATES.length; i += 1) {
      if (STATES[i].code === code) return STATES[i].name;
    }
    return code;
  }

  // single-bid flag: single-source, or restricted with a low competition draw
  contracts.forEach(function (c) {
    c.singleBid = c.method === "Single-source" || (c.method === "Direct" && rnd() < 0.45);
    c.noOwnership = rnd() < 0.34;
  });

  var sources = [
    {
      name: "BudgIT",
      kind: "Civic data",
      coverage: "Federal + 36 states",
      cadence: "Quarterly",
      lastSync: "2026-11-04",
      status: "synced",
      note: "Budget summaries, state fiscal factsheets and trackers."
    },
    {
      name: "Open Treasury",
      kind: "Federal releases",
      coverage: "Federal ministries, agencies",
      cadence: "Monthly",
      lastSync: "2026-11-05",
      status: "synced",
      note: "Daily treasury releases and payment totals by MDA."
    },
    {
      name: "NASS appropriation",
      kind: "Legislative",
      coverage: "Federal",
      cadence: "Annual",
      lastSync: "2026-10-29",
      status: "synced",
      note: "Appropriation Act line items, as passed."
    },
    {
      name: "State budget portals",
      kind: "Subnational",
      coverage: "31 of 37 portals",
      cadence: "Annual",
      lastSync: "2026-10-18",
      status: "partial",
      note: "Six states publish PDF-only or not at all."
    },
    {
      name: "Procurement portals",
      kind: "Awards",
      coverage: "Federal + 22 states",
      cadence: "Weekly",
      lastSync: "2026-11-06",
      status: "synced",
      note: "Contract awards, methods and bidder counts where published."
    }
  ];

  window.OpenLedgerData = {
    years: YEARS,
    currentYear: CURRENT_YEAR,
    federalTotal: FEDERAL_TOTAL,
    stateTotal: STATE_TOTAL,
    ministries: MINISTRIES,
    states: STATES,
    contractors: CONTRACTORS,
    contracts: contracts,
    ministryBudgets: ministryBudgets,
    stateBudgets: stateBudgets,
    sources: sources,
    meta: {
      label: "Demo dataset",
      updated: "6 Nov 2026",
      currency: "NGN",
      methodology:
        "Figures are generated from a fixed seed and shaped to match the scale of published Nigerian federal and state budgets. Ministry and agency names are real; contractor names, projects and risk flags are fictional. Nothing here is an allegation.",
      licence: "Code MIT · data CC BY 4.0 (illustrative)"
    }
  };
})();
