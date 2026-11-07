---
version: alpha
name: OpenLedger
description: Civic-tech editorial design system for Nigerian budget and procurement data.
colors:
  paper: "#F7F4EC"
  surface: "#FFFDF7"
  ink: "#0E2A24"
  ink-soft: "#3F4C46"
  primary: "#0B5D45"
  primary-tint: "#E4EDE8"
  amber: "#C97A1A"
  coral: "#B4432F"
  rule: "#D9D2C3"
  teal: "#2F6F6B"
  ochre: "#B98A3C"
  plum: "#6B4A5B"
  slate: "#5A6B72"
  sand: "#D9C9A8"
typography:
  display:
    fontFamily: Fraunces
    fontSize: 3.5rem
    fontWeight: 600
    lineHeight: 1.05
    letterSpacing: -0.02em
  heading:
    fontFamily: Fraunces
    fontSize: 1.75rem
    fontWeight: 600
    lineHeight: 1.2
  body:
    fontFamily: Inter
    fontSize: 1rem
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: Inter
    fontSize: 0.75rem
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: 0.08em
  figure:
    fontFamily: Inter
    fontSize: 2.25rem
    fontWeight: 600
    lineHeight: 1.1
    fontFeature: tnum
rounded:
  sm: 4px
  md: 6px
  full: 999px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 40px
  xxl: 64px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.paper}"
    rounded: "{rounded.sm}"
    padding: 10px 16px
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: 10px 16px
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: 24px
  chip-active:
    backgroundColor: "{colors.primary-tint}"
    textColor: "{colors.primary}"
    rounded: "{rounded.full}"
    padding: 4px 10px
  badge-warning:
    backgroundColor: "{colors.amber}"
    textColor: "{colors.ink}"
    rounded: "{rounded.full}"
    padding: 2px 8px
  badge-critical:
    backgroundColor: "{colors.coral}"
    textColor: "{colors.paper}"
    rounded: "{rounded.full}"
    padding: 2px 8px
  table-header:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink-soft}"
    typography: "{typography.label}"
    padding: 8px 12px
---

# OpenLedger

## Overview

A public-interest data product with the manners of a broadsheet and the density of an audit. Warm paper instead of white, ink instead of black, one green doing all the interactive work. Numbers are the subject, so furniture stays quiet: hairline rules, small caps labels, generous margins, almost no shadow. Nothing glows, nothing floats, no gradient suggests magic.

The reader should feel they are being shown the ledger itself, not a product tour of it.

## Colors

Warm paper is the base, ink green is the voice, and exactly one accent carries action.

- **Paper (#F7F4EC):** page ground. Never replaced with pure white.
- **Surface (#FFFDF7):** cards and drawers, one step lighter than paper. Separation comes from the hairline rule, not from shadow.
- **Ink (#0E2A24):** headlines, body, chart labels. Near-black with green in it.
- **Green (#0B5D45):** links, active filters, the single primary button, current selection in charts.
- **Green tint (#E4EDE8):** selected rows, filter chips, hover fills.
- **Amber (#C97A1A):** attention without alarm — concentration warnings, "under review" states.
- **Coral (#B4432F):** reserved for data that fails a rule. Never decorative.
- **Rule (#D9D2C3):** every divider, table border and chart baseline.
- **Chart series (teal, ochre, plum, slate, sand):** categorical only, ordered by this list. Never reused to mean a different series within one view.

Status is carried by label and shape as well as color. Coral text always sits beside a word.

## Typography

Fraunces for anything that reads as editorial voice; Inter for anything that must be scanned or compared.

- **Display:** section openers and the one question the product exists to answer. 56px, tight tracking, never in a card.
- **Heading:** panel titles. 28px. Sentence case.
- **Body:** 16px, 1.55 line height, maximum 68 characters per line.
- **Label:** 12px, uppercase, 0.08em tracking, ink-soft. Used for every column header and axis title.
- **Figure:** 36px tabular numerals, `tnum` on. Money and percentages only.

All monetary figures use tabular numerals so columns align without code. Units are always written: ₦ trillions at headline scale, ₦ billions inside tables, ₦ millions in contract rows.

## Layout

A 12-column grid with a 1200px content cap and 24px gutters. The page is dense by intent, but every block is separated by at least 40px of paper.

- Spacing scale: 4, 8, 16, 24, 40, 64. Nothing off-scale.
- KPI row: five cards on one line at 1440, two columns at 1024, a single scrollable row at 390 with the first two visible.
- Analytics grid: 7/5 split at desktop (ministry bars left, cartogram right), stacked at 1024, chart-first at mobile.
- Tables keep a sticky header and lose columns in a fixed order on narrow screens: contractor, value, status survive; method and award date collapse into the row drawer.

## Elevation & Depth

Depth is a border, not a shadow. One hairline rule at 1px `rule` separates surfaces; the only permitted shadow is a 0 12px 32px rgba(14,42,36,0.08) on the open drawer.

Hover states lift by tint, never by scale. Nothing moves on scroll except a 200ms fade-and-rise of section content on first entry.

## Shapes

Corners are functional. 4px on controls, 6px on cards and drawers, full pill only on filter chips and status badges. No large radii, no rounded rectangles pretending to be buttons.

Charts use square ends on bars and 2px strokes on lines. The cartogram tiles are 4px.

## Components

- **Primary button:** green fill, paper text, 4px radius, 10×16 padding. One per view, maximum.
- **Secondary button:** surface fill, ink text, 1px rule. Used for exports and resets.
- **Card:** surface fill, 1px rule, 6px radius, 24px padding, no shadow. Title in heading size, label above the figure.
- **Filter chip:** pill, green-tint fill when active, rule outline when not. Always dismissible by keyboard.
- **Table row:** 44px minimum height, tabular figures right-aligned, hover tint, focus ring inside the row.
- **Drawer:** right side, 480px, paper ground, 1px rule, the only element allowed a shadow.
- **Status badge:** pill with a 6px dot plus a word. Never a bare colored dot.

## Do's and Don'ts

Do let one number own a card. Do write the unit every time. Do keep the chart palette in fixed order. Do use real ministry and agency names with clearly labelled illustrative figures.

Don't use pure white or pure black. Don't add a second accent color to make a chart pop. Don't use gradients, glass, glow, or emoji. Don't animate anything longer than 240ms. Don't encode meaning in color alone. Don't invent a contractor name that resembles a real firm.
