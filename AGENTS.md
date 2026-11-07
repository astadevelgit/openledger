# Working on OpenLedger

Read `DESIGN.md` first. It is the design contract; the CSS mirrors its tokens.

## Constraints

- No build step, no package manager, no ES modules. Plain script globals so `index.html` runs from `file://`.
- No runtime data network calls. `data.js` is seeded and deterministic.
- Keep the demo labelling: illustrative figures, fictional contractor names, risk flags never phrased as allegations.
- Preserve keyboard access: filter buttons need `aria-pressed`, sort headers need `aria-sort`, the drawer needs its focus loop.

## Files

- `index.html` — landmarks, ids referenced by `app.js`.
- `styles.css` — tokens, layout, breakpoints at 1180 / 1024 / 760 / 420.
- `app.js` — filters, budget aggregates, charts, tables, drawer, CSV.
- `data.js` — seed, ministries, states, contractors, awards, provenance.

## Verify

```sh
node --check app.js
node --check data.js
```

Then open `index.html` and check the layout at 1440, 1024 and 390. The flow diagram and data tables scroll horizontally on small screens by design.

If you change a design token, change it in `DESIGN.md` and `styles.css` together. The DESIGN.md CLI lints the contract; it is optional tooling, not a build dependency.
