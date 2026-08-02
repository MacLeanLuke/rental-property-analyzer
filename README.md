# Rental Property Analyzer

A client-side web app for evaluating whether to keep or sell a rental property, and for comparing several properties side-by-side. Plug in numbers, see a live verdict, and download a fully-formulated Excel workbook you can keep tweaking on your own.

## What it does

- Enter inputs for one or more rental properties (purchase price, mortgage, rent, opex, tax, risk assumptions).
- See live metrics: cap rate, cash-on-cash, current equity, monthly cash flow, hurdle rate (CAPM-based), NPV and IRR at a 10-year exit, and a hold-vs-sell verdict.
- Compare multiple properties in one view with a "best in row" table and an NPV-by-exit-year chart.
- Download a multi-sheet Excel workbook (`Inputs`, `Hold Scenario`, `Hold vs Sell`, `Sell Scenario`, `References`) where every projection is a live formula — change an input, and the whole workbook recalculates.

## Privacy

This is a **pure static SPA**. There is no backend, no database, and no auth.

**Your property data never leaves your device.**

- All property data stays in your browser's `localStorage` under the key `rental-analyzer:properties:v1`.
- Excel files are built in-browser with [exceljs](https://github.com/exceljs/exceljs) and downloaded directly.
- Backup (JSON export) and restore (JSON import) happen entirely on your machine.

Clearing your browser storage deletes your properties. No copy exists anywhere else.

**Anonymous usage is recorded.** The app uses [Vercel Web Analytics](https://vercel.com/docs/analytics),
which is cookieless and stores nothing on your device. It reports page views plus a fixed set of
named events — which screens get opened, and whether the Excel export, comparison, or backup
features get used.

No property values, nicknames, or dollar amounts are ever transmitted, and this is enforced by the
code rather than by convention: [`src/lib/analytics.ts`](src/lib/analytics.ts) exports a `track()`
that accepts **only a name from a fixed union and no payload argument**. Sending a financial value
through analytics would be a compile error. That one short file is the complete list of everything
this app is capable of reporting.

## Local development

```bash
npm install
npm run dev       # start Vite dev server
npm run build     # production build to dist/
npm run preview   # serve the built bundle locally
```

## Deployment

This is a static site — any static host works. `dist/` is the build output.

- **Vercel / Netlify / Cloudflare Pages**: point at this directory, build command `npm run build`, output directory `dist`.
- **GitHub Pages**: build locally, push `dist/` to the `gh-pages` branch.

No environment variables are required.

## Tech stack

- Vite + React 19 + TypeScript
- Tailwind CSS v4 with shadcn-style components (no Radix dependency)
- [exceljs](https://github.com/exceljs/exceljs) for client-side `.xlsx` generation with formulas
- [recharts](https://recharts.org/) for the NPV comparison chart
- [zod](https://zod.dev/) for validating imported JSON backups

## Architecture notes

### Two parallel calculation layers

There are **two** independent implementations of the financial model, and they are intentionally not merged:

1. **`src/domain/metrics.ts`** — TypeScript functions used for the live UI (sidebar, comparison table, chart). Pure functions, instantly reactive.
2. **`src/domain/xlsx.ts`** — Excel cell formulas written into the downloaded workbook, so the user can modify any input in Excel and watch everything update.

If you change the model, update **both** layers and re-run the smoke test.

### Code-splitting

The xlsx module is large (~1MB). It's loaded on demand via dynamic `import()` when the user clicks Download, so the initial page load stays small.

## Testing

```bash
npx tsx scripts/smoke-test-xlsx.ts
```

Generates `smoke-single.xlsx` and `smoke-comparison.xlsx`, then re-opens them to verify the sheet structure and a few key formulas. Open the files in Excel/Numbers to sanity-check the output visually.

## License

MIT — use freely.
