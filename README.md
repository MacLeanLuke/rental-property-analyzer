# Rental Property Analyzer

Should you keep the rental or sell it? This answers that with a real model, then
hands you the spreadsheet so you can argue with it.

[![npm](https://img.shields.io/badge/data-never%20leaves%20your%20browser-brightgreen)](#privacy)

## Why this exists

Most rent-vs-sell calculators give you a number and no way to check their work. You
can't see the assumptions, you can't change the discount rate, and you certainly
can't hand the output to an accountant.

This does the opposite. Every projection is visible, every assumption is an input,
and the Excel export is **fully formulated** — not a dump of computed values. Change
a cell in the workbook and the whole thing recalculates, because the formulas are
real formulas.

## What it computes

Enter purchase price, mortgage terms, rent, operating expenses, tax and risk
assumptions, and you get:

- **Cap rate** and **cash-on-cash return**
- **Current equity** and **monthly cash flow**
- **Hurdle rate**, derived from CAPM rather than guessed
- **NPV** and **IRR** at a 10-year exit
- A **hold-vs-sell verdict** with the reasoning shown

Multiple properties can be compared side by side, with a best-in-row table and an
NPV-by-exit-year chart that shows how the decision shifts with your holding period.

## The Excel export

Downloads a five-sheet workbook — `Inputs`, `Hold Scenario`, `Hold vs Sell`,
`Sell Scenario`, `References` — built in-browser with
[exceljs](https://github.com/exceljs/exceljs).

The point of the export is that it stays alive. Projections are written as Excel
formulas referencing the `Inputs` sheet, so the workbook is a working model you can
keep tweaking offline, share with a partner, or send to a CPA — not a dead snapshot.

## Privacy

This is a **pure static SPA**. No backend, no database, no accounts, no telemetry on
your numbers.

Property data stays in `localStorage` under `rental-analyzer:properties:v1`, and
workbooks are generated client-side and downloaded directly. Your financial details
never touch a server, because there is no server.

### Don't take my word for it

The panel in the bottom-right corner is a live dissection of every request this
page makes — DNS, TCP, TLS, waiting, download, per request. Open it and watch:
after the initial page load, **nothing happens.** No API calls, no telemetry, no
analytics beacons. A privacy claim you can verify beats one you have to trust.

It reads the browser's own `PerformanceResourceTiming` entries, so it cannot miss
a request the page makes — including one it made itself.

Built from [page-load-anatomy](https://github.com/MacLeanLuke/page-load-anatomy).
The bundle is vendored at `public/vendor/` (6.6KB) rather than installed, because
those packages aren't published yet; `npm run vendor:pipe` refreshes it from a
local checkout.

## Stack

React · TypeScript · Vite · Tailwind · Recharts for visualization · exceljs for
workbook generation · Zod for input schemas.

## Running locally

```bash
npm install
npm run dev      # dev server
npm run build    # production build
npm run lint
```

## Layout

The financial model is deliberately isolated from the UI so it can be tested and
reasoned about on its own:

```
src/domain/
  metrics.ts     cap rate, CoC, NPV, IRR, CAPM hurdle rate, verdict
  schema.ts      Zod schemas for every input
  xlsx.ts        workbook generation with live formulas
  storage.ts     localStorage persistence
  types.ts       shared domain types
src/components/  form, property list, comparison view, metrics sidebar
```

`scripts/smoke-test-xlsx.ts` verifies the generated workbook opens and its formulas
resolve.
