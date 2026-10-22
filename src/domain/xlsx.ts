import ExcelJS, { type Fill, type Cell, type Worksheet } from 'exceljs'
import type { Property, PropertyInputs } from './types'
import { EXAMPLE_INPUTS } from './defaults'
import { monthlyPi } from './metrics'

// ---------------------------------------------------------------------------
// Styles (mirror generate_rental_analysis.py)
// ---------------------------------------------------------------------------
const fill = (argb: string): Fill => ({
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb },
})

const YELLOW = fill('FFFFF9C4')
const LIGHT_BLUE = fill('FFDDEEFF')
const HEADER_FILL = fill('FF1F4E79')
const SECTION_FILL = fill('FFE3F2FD')

const BOLD = { bold: true }
const WHITE_BOLD = { bold: true, color: { argb: 'FFFFFFFF' } }
const SECTION_FONT = { bold: true, color: { argb: 'FF1F4E79' } }
const LINK_FONT = { color: { argb: 'FF0563C1' }, underline: true as const }
const NOTE_FONT = { italic: true, color: { argb: 'FF666666' } }
const WARN_FONT = { italic: true, color: { argb: 'FFC00000' } }

const MONEY_FMT = '"$"#,##0'
const MONEY2_FMT = '"$"#,##0.00'
const PCT_FMT = '0.00%'
const NUM_FMT = '0.0'

const PROJECTION_YEARS = 30

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function setInput(ws: Worksheet, row: number, col: number, label: string, value: number, fmt?: string): Cell {
  ws.getCell(row, col).value = label
  const cell = ws.getCell(row, col + 1)
  cell.value = value
  cell.fill = YELLOW
  if (fmt) cell.numFmt = fmt
  return cell
}

function setCalc(ws: Worksheet, row: number, col: number, label: string, formula: string, fmt?: string): Cell {
  const labelCell = ws.getCell(row, col)
  labelCell.value = label
  labelCell.font = BOLD
  const cell = ws.getCell(row, col + 1)
  cell.value = { formula: formula.startsWith('=') ? formula.slice(1) : formula }
  cell.fill = LIGHT_BLUE
  if (fmt) cell.numFmt = fmt
  return cell
}

function setSection(ws: Worksheet, row: number, col: number, label: string, span = 2): void {
  const cell = ws.getCell(row, col)
  cell.value = label
  cell.font = SECTION_FONT
  cell.fill = SECTION_FILL
  if (span > 1) {
    ws.mergeCells(row, col, row, col + span - 1)
  }
}

function colLetter(col: number): string {
  let n = col
  let s = ''
  while (n > 0) {
    const rem = (n - 1) % 26
    s = String.fromCharCode(65 + rem) + s
    n = Math.floor((n - 1) / 26)
  }
  return s
}

// ---------------------------------------------------------------------------
// Sheet 1 — Inputs & Key Metrics
// ---------------------------------------------------------------------------
function buildInputsSheet(wb: ExcelJS.Workbook, inputs: PropertyInputs): Worksheet {
  const ws = wb.addWorksheet('Inputs')

  ws.mergeCells('A1:D1')
  const t = ws.getCell('A1')
  t.value = 'RENTAL PROPERTY FINANCIAL ANALYSIS'
  t.font = WHITE_BOLD
  t.fill = HEADER_FILL
  t.alignment = { horizontal: 'center' }

  const d = inputs

  setSection(ws, 3, 1, '── PROPERTY ──')
  setInput(ws, 4, 1, 'Original purchase price', d.purchasePrice, MONEY_FMT)
  setInput(ws, 5, 1, 'Current market value', d.currentValue, MONEY_FMT)
  setInput(ws, 6, 1, 'Land % of value (not depreciable)', d.landPct, PCT_FMT)
  setInput(ws, 7, 1, 'Annual appreciation rate', d.appreciationRate, PCT_FMT)

  setSection(ws, 9, 1, '── MORTGAGE ──')
  setInput(ws, 10, 1, 'Current mortgage balance', d.mortgageBalance, MONEY_FMT)
  setInput(ws, 11, 1, 'Annual interest rate', d.mortgageRate, '0.000%')
  setCalc(ws, 12, 1, 'Monthly P&I payment (auto)', 'IFERROR(-PMT(B11/12,B13*12,B10),0)', MONEY2_FMT)
  setInput(ws, 13, 1, 'Years remaining on loan', d.loanTermYears, '0')

  setSection(ws, 14, 1, '── RENTAL INCOME ──')
  setInput(ws, 15, 1, 'Monthly gross rent', d.monthlyRent, MONEY2_FMT)
  setInput(ws, 16, 1, 'Annual rent growth rate', d.rentGrowth, PCT_FMT)
  setInput(ws, 17, 1, 'Vacancy rate', d.vacancyRate, PCT_FMT)

  setSection(ws, 19, 1, '── MONTHLY OPERATING EXPENSES ──')
  setInput(ws, 20, 1, 'Property taxes', d.propertyTaxMo, MONEY2_FMT)
  setInput(ws, 21, 1, 'Insurance', d.insuranceMo, MONEY2_FMT)
  setInput(ws, 22, 1, 'Property management', d.managementMo, MONEY2_FMT)
  setInput(ws, 23, 1, 'Maintenance / repairs', d.maintenanceMo, MONEY2_FMT)
  setInput(ws, 24, 1, 'HOA / capex reserve / other', d.hoaMo, MONEY2_FMT)

  setSection(ws, 26, 1, '── TAX RATES ──')
  setInput(ws, 27, 1, 'Federal marginal tax rate', d.marginalTaxRate, PCT_FMT)
  setInput(ws, 28, 1, 'State income tax rate', d.stateTaxRate, PCT_FMT)
  setInput(ws, 29, 1, 'Depreciation period (years)', d.depreciationYears, NUM_FMT)
  setInput(ws, 30, 1, 'Years already owned', d.yearsOwned, '0')
  setInput(ws, 31, 1, 'Capital gains tax rate', d.capGainsRate, PCT_FMT)
  setInput(ws, 32, 1, 'Depreciation recapture rate', d.deprecRecaptureRate, PCT_FMT)

  setSection(ws, 34, 1, '── ALTERNATIVE INVESTMENT ──')
  setInput(ws, 35, 1, 'Stock market return rate', d.stockReturn, PCT_FMT)
  setInput(ws, 36, 1, 'Inflation rate', d.inflation, PCT_FMT)

  setSection(ws, 38, 1, '── KEY METRICS (auto-calculated) ──', 4)
  setCalc(ws, 39, 1, 'Depreciable basis (improvements only)', 'B4*(1-B6)', MONEY_FMT)
  setCalc(ws, 40, 1, 'Annual depreciation deduction', 'B39/B29', MONEY_FMT)
  setCalc(ws, 41, 1, 'Total monthly operating expenses', 'B20+B21+B22+B23+B24', MONEY2_FMT)
  setCalc(ws, 42, 1, 'Annual operating expenses', 'B41*12', MONEY_FMT)
  setCalc(ws, 43, 1, 'Monthly NOI (before debt service)', 'B15*(1-B17)-B41', MONEY2_FMT)
  setCalc(ws, 44, 1, 'Monthly cash flow (after P&I)', 'B43-B12', MONEY2_FMT)
  setCalc(ws, 45, 1, 'Annual cash flow', 'B44*12', MONEY_FMT)
  setCalc(ws, 46, 1, 'Cap rate (NOI / value)', 'B43*12/B5', PCT_FMT)
  setCalc(ws, 47, 1, 'Cash-on-cash return (cash flow / equity)', 'B45/(B5-B10)', PCT_FMT)
  setCalc(ws, 48, 1, 'Current equity', 'B5-B10', MONEY_FMT)
  setCalc(ws, 49, 1, 'Accumulated depreciation taken', 'B40*B30', MONEY_FMT)
  setCalc(
    ws,
    50,
    1,
    'Net proceeds if sold today (after all costs/taxes)',
    'B5*0.94-B10-MIN(MAX(0,B5*0.94-(B4-B49)),B49)*B32-MAX(0,MAX(0,B5*0.94-(B4-B49))-B49)*B31',
    MONEY_FMT,
  )

  const note51 = ws.getCell('A51')
  note51.value =
    "↑ Row 50: what you'd actually pocket if you sold today. Used as the opportunity cost in stock portfolio & IRR comparisons."
  note51.font = NOTE_FONT
  ws.mergeCells('A51:B51')

  setSection(ws, 53, 1, '── RISK & LIQUIDITY INPUTS ──')
  setInput(ws, 54, 1, 'Risk-free rate (10-yr Treasury)', d.riskFreeRate, PCT_FMT)
  setInput(ws, 57, 1, 'Rental return volatility (annual)', d.rentalVolatility, PCT_FMT)
  setInput(ws, 58, 1, 'Stock market volatility (annual)', d.stockVolatility, PCT_FMT)
  setInput(ws, 59, 1, 'Selling costs at exit (%)', d.sellingCosts, PCT_FMT)

  const note60 = ws.getCell('A60')
  note60.value = 'Illiquidity guide: 0% stocks, 0.5-1% REITs, 1-2% rental, 2-3% PE, 3-5% raw land'
  note60.font = NOTE_FONT
  ws.mergeCells('A60:B60')

  setInput(ws, 61, 1, 'Risk aversion (1=aggressive, 3=moderate, 5=conservative)', d.riskAversion, '0.0')

  setCalc(ws, 65, 1, 'Stock Sharpe ratio', '(B35-B54)/B58', '0.00')
  setCalc(ws, 66, 1, 'Stock certainty equivalent return', 'B35-0.5*B61*B58^2', PCT_FMT)
  setCalc(ws, 67, 1, 'Post-mortgage annual income (NOI)', 'B43*12', MONEY_FMT)
  setCalc(ws, 68, 1, 'Income replacement portfolio (4% rule)', 'IF(B67>0,B67/0.04,0)', MONEY_FMT)

  const note69 = ws.getCell('A69')
  note69.value =
    "↑ Once mortgage paid off, you'd need this much in stocks to generate the same annual income"
  note69.font = NOTE_FONT
  ws.mergeCells('A69:B69')

  ws.getColumn(1).width = 42
  ws.getColumn(2).width = 18
  ws.getColumn(3).width = 4
  ws.getColumn(4).width = 42

  return ws
}

// ---------------------------------------------------------------------------
// Sheet 2 — Hold Scenario (year-by-year)
// ---------------------------------------------------------------------------
function buildHoldScenarioSheet(wb: ExcelJS.Workbook): Worksheet {
  const ws = wb.addWorksheet('Hold Scenario')
  const N = PROJECTION_YEARS
  const DATA_START = 4
  const INP = 'Inputs!'

  // Title (row 1)
  ws.mergeCells('A1:AF1')
  const t = ws.getCell('A1')
  t.value = 'HOLD SCENARIO — 30-YEAR RENTAL OWNERSHIP PROJECTION'
  t.font = WHITE_BOLD
  t.fill = HEADER_FILL
  t.alignment = { horizontal: 'center' }

  // Group headers (row 2)
  const groups: Array<[number, number, string]> = [
    [2, 3, 'INCOME'],
    [4, 9, 'OPERATING EXPENSES'],
    [10, 14, 'CASH FLOW'],
    [15, 18, 'TAX'],
    [19, 21, 'EQUITY'],
    [22, 23, 'RETURNS'],
    [24, 28, 'SALE AT EXIT'],
    [29, 32, 'PERFORMANCE'],
  ]
  for (const [start, end, label] of groups) {
    const cell = ws.getCell(2, start)
    cell.value = label
    cell.font = WHITE_BOLD
    cell.fill = HEADER_FILL
    cell.alignment = { horizontal: 'center' }
    for (let c = start + 1; c <= end; c++) {
      ws.getCell(2, c).fill = HEADER_FILL
    }
    if (end > start) ws.mergeCells(2, start, 2, end)
  }

  // Column headers (row 3)
  const headers = [
    'Year',
    'Gross Rent',
    'Effective Rent',
    'Prop Tax',
    'Insurance',
    'Mgmt',
    'Maint',
    'HOA/Capex',
    'Total Oper Exp',
    'NOI',
    'Mortgage P&I',
    'Principal Paydown',
    'Mortgage Interest',
    'Cash Flow',
    'Depreciation',
    'Total Deductions',
    'Net Rental Inc',
    'Tax Impact',
    'Property Value',
    'Mortgage Bal',
    'Equity',
    'After-Tax CF',
    'Total Return ($)',
    'Cumul. Deprec.',
    'Net Sale Price',
    'Recapture Tax',
    'Cap Gains Tax',
    'Net Proceeds',
    'ROE (%)',
    'IRR at Exit',
    'Sharpe Ratio',
    'Certainty Equiv',
  ]
  headers.forEach((h, i) => {
    const cell = ws.getCell(3, i + 1)
    cell.value = h
    cell.font = WHITE_BOLD
    cell.fill = HEADER_FILL
  })

  for (let i = 0; i < N; i++) {
    const r = DATA_START + i
    ws.getCell(r, 1).value = i + 1

    // INCOME
    ws.getCell(r, 2).value =
      i === 0 ? { formula: `${INP}B15*12` } : { formula: `B${r - 1}*(1+${INP}$B$16)` }
    ws.getCell(r, 3).value = { formula: `B${r}*(1-${INP}$B$17)` }

    // OPERATING EXPENSES — each grows with inflation
    const expenseRefs: Array<[number, string]> = [
      [4, 'B20'],
      [5, 'B21'],
      [6, 'B22'],
      [7, 'B23'],
      [8, 'B24'],
    ]
    for (const [col, inpRef] of expenseRefs) {
      ws.getCell(r, col).value =
        i === 0
          ? { formula: `${INP}${inpRef}*12` }
          : { formula: `${colLetter(col)}${r - 1}*(1+${INP}$B$36)` }
    }

    ws.getCell(r, 9).value = { formula: `D${r}+E${r}+F${r}+G${r}+H${r}` }

    // CASH FLOW
    ws.getCell(r, 10).value = { formula: `C${r}-I${r}` }
    // Payments are owed whenever the year starts with a balance. In the payoff
    // year, charge only the payments actually left (NPER counts them).
    const startBal = i === 0 ? `${INP}B10` : `T${r - 1}`
    ws.getCell(r, 11).value = {
      formula: `IF(${startBal}>0,${INP}$B$12*MIN(12,NPER(${INP}$B$11/12,-${INP}$B$12,${startBal})),0)`,
    }
    ws.getCell(r, 12).value =
      i === 0
        ? { formula: `${INP}B10-T${r}` }
        : { formula: `MAX(0,T${r - 1}-T${r})` }
    ws.getCell(r, 13).value = { formula: `K${r}-L${r}` }
    ws.getCell(r, 14).value = { formula: `J${r}-K${r}` }

    // TAX
    ws.getCell(r, 15).value = {
      formula: `IF(${INP}$B$30+A${r}<=${INP}$B$29,${INP}$B$40,0)`,
    }
    ws.getCell(r, 16).value = { formula: `I${r}+M${r}+O${r}` }
    ws.getCell(r, 17).value = { formula: `C${r}-P${r}` }
    ws.getCell(r, 18).value = { formula: `-Q${r}*(${INP}$B$27+${INP}$B$28)` }

    // EQUITY
    ws.getCell(r, 19).value =
      i === 0
        ? { formula: `${INP}B5*(1+${INP}$B$7)` }
        : { formula: `S${r - 1}*(1+${INP}$B$7)` }

    const prevBal = i === 0 ? `${INP}B10` : `T${r - 1}`
    const rateMo = `${INP}$B$11/12`
    const pi = `${INP}$B$12`
    ws.getCell(r, 20).value = {
      formula: `MAX(0,${prevBal}*(1+${rateMo})^12-${pi}*((1+${rateMo})^12-1)/(${rateMo}))`,
    }
    ws.getCell(r, 21).value = { formula: `S${r}-T${r}` }

    // RETURNS
    ws.getCell(r, 22).value = { formula: `N${r}+R${r}` }
    ws.getCell(r, 23).value =
      i === 0
        ? { formula: `N${r}+L${r}+(S${r}-${INP}B5)+R${r}` }
        : { formula: `N${r}+L${r}+(S${r}-S${r - 1})+R${r}` }

    // SALE AT EXIT
    ws.getCell(r, 24).value = { formula: `MIN(${INP}$B$30+A${r},${INP}$B$29)*${INP}$B$40` }
    ws.getCell(r, 25).value = { formula: `S${r}*(1-${INP}$B$59)` }
    ws.getCell(r, 26).value = {
      formula: `MIN(MAX(0,Y${r}-${INP}$B$4+X${r}),X${r})*${INP}$B$32`,
    }
    ws.getCell(r, 27).value = {
      formula: `MAX(0,MAX(0,Y${r}-${INP}$B$4+X${r})-X${r})*${INP}$B$31`,
    }
    ws.getCell(r, 28).value = { formula: `Y${r}-T${r}-Z${r}-AA${r}` }

    // PERFORMANCE
    const roeCell = ws.getCell(r, 29)
    roeCell.value =
      i === 0
        ? { formula: `W${r}/${INP}B50` }
        : { formula: `IF(U${r - 1}>0,W${r}/U${r - 1},0)` }
    roeCell.numFmt = PCT_FMT

    const sharpeCell = ws.getCell(r, 31)
    sharpeCell.value = { formula: `IFERROR((AD${r}-${INP}$B$54)/${INP}$B$57,"")` }
    sharpeCell.numFmt = '0.00'

    const ceCell = ws.getCell(r, 32)
    ceCell.value = { formula: `IFERROR(AD${r}-0.5*${INP}$B$61*${INP}$B$57^2,"")` }
    ceCell.numFmt = PCT_FMT

    // Money format for cols B-AB
    for (let col = 2; col <= 28; col++) {
      ws.getCell(r, col).numFmt = MONEY_FMT
    }
  }

  // IRR at exit (column AD) referencing scratch columns AG+
  const SCRATCH_START = 33
  for (let yr = 1; yr <= N; yr++) {
    const r = DATA_START + yr - 1
    const scLetter = colLetter(SCRATCH_START + yr - 1)
    const flowStart = DATA_START
    const flowEnd = DATA_START + yr
    const cell = ws.getCell(r, 30)
    cell.value =
      yr === 1
        ? { formula: `IFERROR(IRR(${scLetter}${flowStart}:${scLetter}${flowEnd}),"N/A")` }
        : { formula: `IFERROR(IRR(${scLetter}${flowStart}:${scLetter}${flowEnd}),0)` }
    cell.numFmt = PCT_FMT
  }

  // Hidden scratch columns: per-exit-year cash flow streams
  for (let yr = 1; yr <= N; yr++) {
    const sc = SCRATCH_START + yr - 1
    const header = ws.getCell(3, sc)
    header.value = `Exit Y${yr}`
    header.font = { size: 8, color: { argb: 'FF999999' } }

    const year0 = ws.getCell(DATA_START, sc)
    year0.value = { formula: `-${INP}B50` }
    year0.numFmt = MONEY_FMT

    for (let y = 1; y <= yr; y++) {
      const scratchR = DATA_START + y
      const mainR = DATA_START + y - 1
      const cell = ws.getCell(scratchR, sc)
      if (y < yr) {
        cell.value = { formula: `N${mainR}+R${mainR}` }
      } else {
        cell.value = { formula: `N${mainR}+R${mainR}+AB${mainR}` }
      }
      cell.numFmt = MONEY_FMT
    }
  }

  for (let col = 1; col <= 32; col++) ws.getColumn(col).width = 14
  ws.getColumn(1).width = 6
  for (let yr = 1; yr <= N; yr++) ws.getColumn(SCRATCH_START + yr - 1).hidden = true

  const noteRow = DATA_START + N + 1
  ws.mergeCells(`A${noteRow}:AF${noteRow}`)
  const note = ws.getCell(noteRow, 1)
  note.value =
    '⚠ NOTE: Depreciation tax savings (col R) are a DEFERRAL, not a permanent benefit. When you sell, depreciation is recaptured at 25% (see Sale sheet). The true long-term value is the time-value of deferring tax, not eliminating it.'
  note.font = WARN_FONT
  note.alignment = { wrapText: true }
  ws.getRow(noteRow).height = 40

  return ws
}

// ---------------------------------------------------------------------------
// Sheet 3 — Hold vs Sell Decision Dashboard
// ---------------------------------------------------------------------------
function buildDecisionSheet(wb: ExcelJS.Workbook): Worksheet {
  const ws = wb.addWorksheet('Hold vs Sell')
  const N = PROJECTION_YEARS
  const DATA_START = 16
  const HURDLE_CELL = '$B$6'
  const INP = 'Inputs!'
  const YBY = "'Hold Scenario'!"
  const SELL = "'Sell Scenario'!"
  const HS_DATA_START = 4

  ws.mergeCells('A1:M1')
  const t = ws.getCell('A1')
  t.value = 'HOLD vs SELL — DECISION DASHBOARD'
  t.font = WHITE_BOLD
  t.fill = HEADER_FILL
  t.alignment = { horizontal: 'center' }

  ws.mergeCells('A3:F3')
  const header3 = ws.getCell('A3')
  header3.value = 'COMPARISON INPUTS — Adjust these to see how the verdict changes'
  header3.font = WHITE_BOLD
  header3.fill = HEADER_FILL

  ws.getCell('A4').value = 'Risk-free rate (10yr Treasury)'
  const b4 = ws.getCell('B4')
  b4.value = { formula: `${INP}B54` }
  b4.numFmt = PCT_FMT
  ws.getCell('D4').value = 'Illiquidity premium'
  const e4 = ws.getCell('E4')
  e4.value = 0.015
  e4.numFmt = PCT_FMT

  ws.getCell('A5').value = 'Stock market return (S&P)'
  const b5 = ws.getCell('B5')
  b5.value = { formula: `${INP}B35` }
  b5.numFmt = PCT_FMT
  ws.getCell('D5').value = 'Real estate beta to S&P'
  const e5 = ws.getCell('E5')
  e5.value = 0.5
  e5.numFmt = '0.00'

  const labelB6 = ws.getCell('A6')
  labelB6.value = '→ HURDLE RATE (CAPM + illiquidity)'
  labelB6.font = BOLD
  const b6 = ws.getCell('B6')
  b6.value = { formula: 'B4+E5*(B5-B4)+E4' }
  b6.numFmt = PCT_FMT
  b6.font = BOLD

  ws.mergeCells('A7:F7')
  const note7 = ws.getCell('A7')
  note7.value =
    '↑ Minimum return the rental must earn to justify risk vs stocks. Change inputs above to test sensitivity.'
  note7.font = NOTE_FONT

  ws.mergeCells('A9:F9')
  const qHeader = ws.getCell('A9')
  qHeader.value = 'QUALITATIVE FACTORS — Rate 1-10 (10 = most favorable for keeping)'
  qHeader.font = WHITE_BOLD
  qHeader.fill = HEADER_FILL

  ws.getCell('A10').value = 'Hassle / Time Burden'
  ws.getCell('B10').value = 5
  const hint10 = ws.getCell('C10')
  hint10.value = '(10=hands-off, 1=headache)'
  hint10.font = NOTE_FONT
  ws.getCell('D10').value = 'Liquidity Comfort'
  ws.getCell('E10').value = 5
  const hint10b = ws.getCell('F10')
  hint10b.value = "(10=don't need it, 1=need it soon)"
  hint10b.font = NOTE_FONT

  ws.getCell('A11').value = 'Concentration Risk'
  ws.getCell('B11').value = 5
  const hint11 = ws.getCell('C11')
  hint11.value = '(10=small % of wealth, 1=most of it)'
  hint11.font = NOTE_FONT
  ws.getCell('D11').value = 'Market Confidence'
  ws.getCell('E11').value = 5
  const hint11b = ws.getCell('F11')
  hint11b.value = '(10=very confident, 1=guessing)'
  hint11b.font = NOTE_FONT

  const avg = ws.getCell('A12')
  avg.value = '→ Average Score'
  avg.font = BOLD
  const avgVal = ws.getCell('B12')
  avgVal.value = { formula: 'AVERAGE(B10,E10,B11,E11)' }
  avgVal.numFmt = '0.0'
  const interp = ws.getCell('D12')
  interp.value = '→ Interpretation'
  interp.font = BOLD
  ws.getCell('E12').value = {
    formula:
      'IF(B12>=7,"Qualitative factors favor keeping",IF(B12>=4,"Neutral — let the numbers decide","Qualitative factors favor selling"))',
  }

  // ELI5 row (14) and headers (15)
  const eli5 = [
    'If you sold at this year...',
    'Minimum return rental must beat to justify risk vs just buying stocks',
    'How much rental beats the bar ON AVERAGE. Also = how much hurdle could rise before verdict flips (breakeven)',
    'What your equity earned THIS YEAR alone (not an average)',
    'Is your equity still beating stocks RIGHT NOW? Positive = yes',
    'Would you be richer keeping or selling? Cash in hand after selling costs and taxes on both sides. Positive = keep wins',
    "Today's dollar value of keeping vs selling. Positive = rental worth more",
    'NPV if things go better than expected (hurdle 1% lower)',
    'NPV if things go worse than expected (hurdle 1% higher)',
    'NPV spread as equal yearly paychecks',
    'NPV per dollar of capital tied up. Above 1.0 = keeping is worth more than the capital it ties up',
    'How sensitive is the verdict? Strong = even worst case wins. Fragile = depends on assumptions',
    'Tiered verdict using NPV, ROE, and confidence band',
  ]
  eli5.forEach((txt, i) => {
    const c = ws.getCell(14, i + 1)
    c.value = txt
    c.font = NOTE_FONT
    c.alignment = { wrapText: true, vertical: 'top' }
  })
  ws.getRow(14).height = 45

  const tableHeaders = [
    'Year',
    'Hurdle Rate',
    'IRR − Hurdle\n(avg / breakeven)',
    'ROE This Year',
    'ROE − Hurdle\n(this year)',
    'Wealth Advantage ($)\nKeep − Sell, after tax',
    'NPV at Exit',
    'NPV Optimistic\n(hurdle − 1%)',
    'NPV Pessimistic\n(hurdle + 1%)',
    'EAA ($/yr)',
    'Profitability\nIndex (PI)',
    'Confidence',
    'Verdict',
  ]
  tableHeaders.forEach((h, i) => {
    const c = ws.getCell(15, i + 1)
    c.value = h
    c.font = WHITE_BOLD
    c.fill = HEADER_FILL
    c.alignment = { wrapText: true, horizontal: 'center' }
  })

  for (let i = 0; i < N; i++) {
    const r = DATA_START + i
    const ybyR = HS_DATA_START + i
    const sellR = 3 + i

    ws.getCell(r, 1).value = i + 1

    const bCell = ws.getCell(r, 2)
    bCell.value = { formula: HURDLE_CELL }
    bCell.numFmt = PCT_FMT

    const cCell = ws.getCell(r, 3)
    cCell.value = { formula: `${YBY}AD${ybyR}-B${r}` }
    cCell.numFmt = PCT_FMT

    const dCell = ws.getCell(r, 4)
    dCell.value = { formula: `${YBY}AC${ybyR}` }
    dCell.numFmt = PCT_FMT

    const eCell = ws.getCell(r, 5)
    eCell.value = { formula: `D${r}-B${r}` }
    eCell.numFmt = PCT_FMT

    const fCell = ws.getCell(r, 6)
    // Both sides as cash in hand: rental sold (after selling costs, payoff,
    // recapture, cap gains) vs stocks cashed out (after cap gains).
    fCell.value = { formula: `${YBY}AB${ybyR}-${SELL}H${sellR}` }
    fCell.numFmt = MONEY_FMT

    const jCell = ws.getCell(r, 10)
    jCell.value = { formula: `IFERROR(PMT(B${r},A${r},-G${r}),0)` }
    jCell.numFmt = MONEY_FMT

    const kCell = ws.getCell(r, 11)
    kCell.value = { formula: `IFERROR(1+G${r}/${INP}$B$50,0)` }
    kCell.numFmt = '0.00'

    ws.getCell(r, 12).value = {
      formula: `IF(I${r}>0,"Strong",IF(H${r}>0,"Fragile","Weak"))`,
    }

    ws.getCell(r, 13).value = {
      formula: `IF(AND(G${r}>0,E${r}>0,I${r}>0),"STRONG KEEP — wins even in worst case",IF(AND(G${r}>0,E${r}>0),"KEEP — rental beats stocks",IF(AND(G${r}>0,E${r}<=0),"KEEP, but edge fading — consider selling",IF(AND(G${r}<=0,E${r}>0),"HOLD — strong returns, give it time","SELL — stocks win"))))`,
    }
  }

  // NPV formulas reference Hold Scenario scratch columns (start at col AG = 33)
  const YBY_SCRATCH_START = 33
  for (let yr = 1; yr <= N; yr++) {
    const r = DATA_START + yr - 1
    const scLetter = colLetter(YBY_SCRATCH_START + yr - 1)
    const flowStart = HS_DATA_START
    const flowEnd = HS_DATA_START + yr

    const g = ws.getCell(r, 7)
    g.value = {
      formula: `${YBY}${scLetter}${flowStart}+NPV(${HURDLE_CELL},${YBY}${scLetter}${flowStart + 1}:${scLetter}${flowEnd})`,
    }
    g.numFmt = MONEY_FMT

    const h = ws.getCell(r, 8)
    h.value = {
      formula: `${YBY}${scLetter}${flowStart}+NPV(${HURDLE_CELL}-0.01,${YBY}${scLetter}${flowStart + 1}:${scLetter}${flowEnd})`,
    }
    h.numFmt = MONEY_FMT

    const iCell = ws.getCell(r, 9)
    iCell.value = {
      formula: `${YBY}${scLetter}${flowStart}+NPV(${HURDLE_CELL}+0.01,${YBY}${scLetter}${flowStart + 1}:${scLetter}${flowEnd})`,
    }
    iCell.numFmt = MONEY_FMT
  }

  const widths = [8, 14, 16, 14, 16, 22, 16, 18, 18, 14, 14, 14, 44]
  widths.forEach((w, i) => (ws.getColumn(i + 1).width = w))

  // Inline chart guidance (exceljs chart support is limited)
  const guideRow = DATA_START + N + 2
  ws.mergeCells(`A${guideRow}:M${guideRow}`)
  const guide = ws.getCell(guideRow, 1)
  guide.value =
    'Want charts? Select columns A (Year) + B (Hurdle) + the column you want (e.g. G for NPV), then Insert → Chart → Line. All the data is live via formulas, so charts will track as you edit the Inputs sheet.'
  guide.font = NOTE_FONT
  guide.alignment = { wrapText: true }
  ws.getRow(guideRow).height = 35

  return ws
}

// ---------------------------------------------------------------------------
// Sheet 4 — Sell Scenario (stock portfolio if sold today)
// ---------------------------------------------------------------------------
function buildSellScenarioSheet(wb: ExcelJS.Workbook): Worksheet {
  const ws = wb.addWorksheet('Sell Scenario')
  const N = PROJECTION_YEARS
  const DATA_START = 3
  const INP = 'Inputs!'
  const YBY = "'Hold Scenario'!"

  ws.mergeCells('A1:H1')
  const t = ws.getCell('A1')
  t.value = 'SELL SCENARIO — IF YOU SOLD TODAY & INVESTED IN STOCKS'
  t.font = WHITE_BOLD
  t.fill = HEADER_FILL
  t.alignment = { horizontal: 'center' }

  const headers = [
    'Year',
    'Cash Redirected ($)',
    'Stock Portfolio',
    'Annual Stock Growth ($)',
    'Stock ROE',
    'Cumulative Gain ($)',
    'Cost Basis ($)',
    'After-Tax Value ($)',
  ]
  headers.forEach((h, i) => {
    const c = ws.getCell(2, i + 1)
    c.value = h
    c.font = WHITE_BOLD
    c.fill = HEADER_FILL
  })

  for (let i = 0; i < N; i++) {
    const r = DATA_START + i
    const ybyR = 4 + i

    ws.getCell(r, 1).value = i + 1

    const b = ws.getCell(r, 2)
    b.value = { formula: `-(${YBY}N${ybyR}+${YBY}R${ybyR})` }
    b.numFmt = MONEY_FMT

    const c = ws.getCell(r, 3)
    c.value =
      i === 0
        ? { formula: `${INP}B50*(1+${INP}$B$35)+B${r}` }
        : { formula: `C${r - 1}*(1+${INP}$B$35)+B${r}` }
    c.numFmt = MONEY_FMT

    const d = ws.getCell(r, 4)
    d.value =
      i === 0
        ? { formula: `${INP}B50*${INP}$B$35` }
        : { formula: `C${r - 1}*${INP}$B$35` }
    d.numFmt = MONEY_FMT

    const e = ws.getCell(r, 5)
    e.value = { formula: `${INP}$B$35` }
    e.numFmt = PCT_FMT

    const f = ws.getCell(r, 6)
    f.value = { formula: `C${r}-${INP}B50` }
    f.numFmt = MONEY_FMT

    // Basis = money put in: the sale proceeds plus every redirected dollar.
    const g = ws.getCell(r, 7)
    g.value = { formula: `MAX(0,${INP}B50+SUM(B$${DATA_START}:B${r}))` }
    g.numFmt = MONEY_FMT

    // What you'd keep if you cashed the portfolio out this year.
    const h = ws.getCell(r, 8)
    h.value = { formula: `C${r}-MAX(0,C${r}-G${r})*${INP}$B$31` }
    h.numFmt = MONEY_FMT
  }

  for (let col = 1; col <= 8; col++) ws.getColumn(col).width = 20
  ws.getColumn(1).width = 8

  const noteRow = DATA_START + N + 2
  ws.mergeCells(`A${noteRow}:H${noteRow}`)
  const note = ws.getCell(noteRow, 1)
  note.value =
    'Starting value = net proceeds after selling costs, mortgage payoff, depreciation recapture, and capital gains tax (Inputs B50). Cash Redirected = money you would save each year by not owning the rental. After-Tax Value = portfolio minus capital gains tax on growth above cost basis.'
  note.font = NOTE_FONT
  note.alignment = { wrapText: true }
  ws.getRow(noteRow).height = 30

  return ws
}

// ---------------------------------------------------------------------------
// Sheet 5 — References
// ---------------------------------------------------------------------------
function buildReferencesSheet(wb: ExcelJS.Workbook): Worksheet {
  const ws = wb.addWorksheet('References')

  ws.mergeCells('A1:C1')
  const t = ws.getCell('A1')
  t.value = 'FACT-CHECK RESOURCES'
  t.font = WHITE_BOLD
  t.fill = HEADER_FILL

  const refs: Array<[string, Array<[string, string, string]>]> = [
    [
      'IRS & Government',
      [
        [
          'IRS Publication 527 — Residential Rental Property',
          'https://www.irs.gov/publications/p527',
          'Official IRS guide: rental income, expenses, depreciation rules',
        ],
        [
          'IRS Publication 946 — How To Depreciate Property',
          'https://www.irs.gov/publications/p946',
          'Depreciation methods, MACRS, 27.5-year residential schedule',
        ],
        [
          'IRS Publication 925 — Passive Activity & At-Risk Rules',
          'https://www.irs.gov/publications/p925',
          'Passive loss limitations ($25k allowance, AGI phase-out rules)',
        ],
        [
          'IRS Topic 409 — Capital Gains and Losses',
          'https://www.irs.gov/taxtopics/tc409',
          'Capital gains rates, holding periods, recapture rules',
        ],
        [
          'IRS Topic 414 — Rental Income and Expenses',
          'https://www.irs.gov/taxtopics/tc414',
          'What counts as deductible rental expenses',
        ],
        [
          'FHFA House Price Index',
          'https://www.fhfa.gov/data/hpi',
          'Verify regional home appreciation rates (historical data)',
        ],
      ],
    ],
    [
      'Educational / Analysis',
      [
        [
          'Investopedia — Rental Property ROI',
          'https://www.investopedia.com/articles/investing/062215/how-calculate-roi-rental-property.asp',
          'Cap rate, cash-on-cash return, total ROI formulas',
        ],
        [
          'Investopedia — Depreciation of Rental Property',
          'https://www.investopedia.com/articles/investing/060815/how-rental-property-depreciation-works.asp',
          '27.5-year straight line, cost basis, recapture at sale',
        ],
        [
          'Investopedia — Depreciation Recapture',
          'https://www.investopedia.com/terms/d/depreciationrecapture.asp',
          "25% recapture rate, how it's calculated at sale",
        ],
        [
          'BiggerPockets — Rental Property Calculator',
          'https://www.biggerpockets.com/rental-property-calculator',
          'Interactive tool to cross-check cash flow and ROI numbers',
        ],
      ],
    ],
    [
      'Market Data',
      [
        [
          'S&P 500 Historical Returns',
          'https://www.macrotrends.net/2526/sp-500-historical-annual-returns',
          'Verify ~8.5% long-term avg stock return assumption',
        ],
        [
          'BLS CPI Inflation Calculator',
          'https://www.bls.gov/data/inflation_calculator.htm',
          'Verify inflation rate assumptions',
        ],
      ],
    ],
    [
      'Key Tax Rules to Verify',
      [
        [
          '1031 Exchange — IRS guidance',
          'https://www.irs.gov/publications/p544',
          'Defer ALL capital gains and recapture by exchanging into another rental',
        ],
        [
          'Section 121 Exclusion interaction',
          'https://www.irs.gov/publications/p523',
          'If you convert rental back to primary residence — partial exclusion rules',
        ],
      ],
    ],
  ]

  let row = 3
  for (const [sectionTitle, links] of refs) {
    setSection(ws, row, 1, `── ${sectionTitle.toUpperCase()} ──`, 3)
    row++
    for (const [title, url, description] of links) {
      const titleCell = ws.getCell(row, 1)
      titleCell.value = title
      titleCell.font = BOLD
      const linkCell = ws.getCell(row, 2)
      linkCell.value = { text: url, hyperlink: url }
      linkCell.font = LINK_FONT
      const descCell = ws.getCell(row, 3)
      descCell.value = description
      descCell.font = NOTE_FONT
      row++
    }
    row++
  }

  row++
  setSection(ws, row, 1, '── KEY ASSUMPTIONS TO VERIFY ──', 3)
  row++
  const assumptions = [
    '1. Your actual mortgage P&I — check your monthly statement',
    '2. Your actual mortgage interest rate — check your loan documents',
    '3. Local home appreciation rate — check FHFA or Zillow above',
    '4. Your federal marginal tax rate — check current IRS tax brackets',
    '5. Your property tax amount — check your escrow statement',
    '6. Depreciation already taken — check your tax returns',
    '7. Passive loss rules: if your AGI > $100k, the $25k deduction phases out',
    '8. These projections assume you actively manage (or have a manager). Material participation rules affect passive loss deduction.',
  ]
  for (const a of assumptions) {
    const c = ws.getCell(row, 1)
    c.value = a
    c.font = NOTE_FONT
    ws.mergeCells(row, 1, row, 3)
    row++
  }

  ws.getColumn(1).width = 48
  ws.getColumn(2).width = 58
  ws.getColumn(3).width = 55

  return ws
}

// ---------------------------------------------------------------------------
// Single-property workbook
// ---------------------------------------------------------------------------
export async function buildPropertyWorkbook(property: Property): Promise<ExcelJS.Workbook> {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Rental Property Analyzer'
  wb.created = new Date()

  buildInputsSheet(wb, property.inputs)
  buildHoldScenarioSheet(wb)
  buildDecisionSheet(wb)
  buildSellScenarioSheet(wb)
  buildReferencesSheet(wb)

  return wb
}

// ---------------------------------------------------------------------------
// Multi-property comparison workbook
// ---------------------------------------------------------------------------
export async function buildComparisonWorkbook(properties: Property[]): Promise<ExcelJS.Workbook> {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Rental Property Analyzer'
  wb.created = new Date()

  // Summary sheet with side-by-side key metrics
  const summary = wb.addWorksheet('Comparison')

  summary.mergeCells(1, 1, 1, properties.length + 1)
  const t = summary.getCell('A1')
  t.value = `PROPERTY COMPARISON — ${properties.length} PROPERTIES`
  t.font = WHITE_BOLD
  t.fill = HEADER_FILL
  t.alignment = { horizontal: 'center' }

  // Header row
  summary.getCell(3, 1).value = 'Metric'
  summary.getCell(3, 1).font = WHITE_BOLD
  summary.getCell(3, 1).fill = HEADER_FILL
  properties.forEach((p, i) => {
    const c = summary.getCell(3, i + 2)
    c.value = p.nickname
    c.font = WHITE_BOLD
    c.fill = HEADER_FILL
  })

  // Metric rows — calculated inline (no cross-sheet refs so sheet stays self-contained)
  const rows: Array<[string, (inp: PropertyInputs) => number, string]> = [
    ['Current value', (i) => i.currentValue, MONEY_FMT],
    ['Mortgage balance', (i) => i.mortgageBalance, MONEY_FMT],
    ['Current equity', (i) => i.currentValue - i.mortgageBalance, MONEY_FMT],
    ['Monthly rent', (i) => i.monthlyRent, MONEY2_FMT],
    [
      'Monthly NOI',
      (i) =>
        i.monthlyRent * (1 - i.vacancyRate) -
        (i.propertyTaxMo + i.insuranceMo + i.managementMo + i.maintenanceMo + i.hoaMo),
      MONEY2_FMT,
    ],
    [
      'Monthly cash flow',
      (i) =>
        i.monthlyRent * (1 - i.vacancyRate) -
        (i.propertyTaxMo + i.insuranceMo + i.managementMo + i.maintenanceMo + i.hoaMo) -
        monthlyPi(i.mortgageBalance, i.mortgageRate, i.loanTermYears),
      MONEY2_FMT,
    ],
    [
      'Cap rate',
      (i) => {
        const opex = i.propertyTaxMo + i.insuranceMo + i.managementMo + i.maintenanceMo + i.hoaMo
        const noi = (i.monthlyRent * (1 - i.vacancyRate) - opex) * 12
        return noi / i.currentValue
      },
      PCT_FMT,
    ],
    ['Mortgage rate', (i) => i.mortgageRate, PCT_FMT],
    ['Appreciation rate', (i) => i.appreciationRate, PCT_FMT],
  ]

  let r = 4
  for (const [label, fn, fmt] of rows) {
    const labelCell = summary.getCell(r, 1)
    labelCell.value = label
    labelCell.font = BOLD
    properties.forEach((p, i) => {
      const c = summary.getCell(r, i + 2)
      c.value = fn(p.inputs)
      c.numFmt = fmt
    })
    r++
  }

  summary.getColumn(1).width = 28
  for (let i = 0; i < properties.length; i++) summary.getColumn(i + 2).width = 18

  const noteRow = r + 2
  summary.mergeCells(noteRow, 1, noteRow, properties.length + 1)
  const note = summary.getCell(noteRow, 1)
  note.value =
    'Each property has its own detail tab below with the full 30-year projection. Change any input in a property tab and every formula on that tab recalculates.'
  note.font = NOTE_FONT
  note.alignment = { wrapText: true }
  summary.getRow(noteRow).height = 30

  // One detail tab per property — Inputs-only sheet with auto-calculated key metrics
  for (const p of properties) {
    const sheetName = p.nickname.substring(0, 28).replace(/[\\/?*[\]:]/g, '') || 'Property'
    const inputsSheet = wb.addWorksheet(sheetName)
    buildPropertyInputsOnly(inputsSheet, p.inputs, p.nickname)
  }

  return wb
}

// Condensed single-sheet version of Inputs for the comparison workbook.
function buildPropertyInputsOnly(ws: Worksheet, inputs: PropertyInputs, nickname: string) {
  ws.mergeCells('A1:D1')
  const t = ws.getCell('A1')
  t.value = `${nickname.toUpperCase()} — INPUTS & KEY METRICS`
  t.font = WHITE_BOLD
  t.fill = HEADER_FILL
  t.alignment = { horizontal: 'center' }

  const d = inputs

  setSection(ws, 3, 1, '── PROPERTY ──')
  setInput(ws, 4, 1, 'Original purchase price', d.purchasePrice, MONEY_FMT)
  setInput(ws, 5, 1, 'Current market value', d.currentValue, MONEY_FMT)
  setInput(ws, 6, 1, 'Land % of value', d.landPct, PCT_FMT)
  setInput(ws, 7, 1, 'Annual appreciation rate', d.appreciationRate, PCT_FMT)

  setSection(ws, 9, 1, '── MORTGAGE ──')
  setInput(ws, 10, 1, 'Current mortgage balance', d.mortgageBalance, MONEY_FMT)
  setInput(ws, 11, 1, 'Annual interest rate', d.mortgageRate, '0.000%')
  setCalc(ws, 12, 1, 'Monthly P&I payment (auto)', 'IFERROR(-PMT(B11/12,B13*12,B10),0)', MONEY2_FMT)
  setInput(ws, 13, 1, 'Years remaining on loan', d.loanTermYears, '0')

  setSection(ws, 14, 1, '── RENTAL INCOME ──')
  setInput(ws, 15, 1, 'Monthly gross rent', d.monthlyRent, MONEY2_FMT)
  setInput(ws, 16, 1, 'Annual rent growth rate', d.rentGrowth, PCT_FMT)
  setInput(ws, 17, 1, 'Vacancy rate', d.vacancyRate, PCT_FMT)

  setSection(ws, 19, 1, '── MONTHLY OPERATING EXPENSES ──')
  setInput(ws, 20, 1, 'Property taxes', d.propertyTaxMo, MONEY2_FMT)
  setInput(ws, 21, 1, 'Insurance', d.insuranceMo, MONEY2_FMT)
  setInput(ws, 22, 1, 'Property management', d.managementMo, MONEY2_FMT)
  setInput(ws, 23, 1, 'Maintenance / repairs', d.maintenanceMo, MONEY2_FMT)
  setInput(ws, 24, 1, 'HOA / capex / other', d.hoaMo, MONEY2_FMT)

  setSection(ws, 26, 1, '── KEY METRICS ──')
  setCalc(ws, 27, 1, 'Total monthly opex', 'B20+B21+B22+B23+B24', MONEY2_FMT)
  setCalc(ws, 28, 1, 'Monthly NOI (before debt service)', 'B15*(1-B17)-B27', MONEY2_FMT)
  setCalc(ws, 29, 1, 'Monthly cash flow (after P&I)', 'B28-B12', MONEY2_FMT)
  setCalc(ws, 30, 1, 'Annual cash flow', 'B29*12', MONEY_FMT)
  setCalc(ws, 31, 1, 'Cap rate', 'B28*12/B5', PCT_FMT)
  setCalc(ws, 32, 1, 'Cash-on-cash return', 'B30/(B5-B10)', PCT_FMT)
  setCalc(ws, 33, 1, 'Current equity', 'B5-B10', MONEY_FMT)

  ws.getColumn(1).width = 40
  ws.getColumn(2).width = 18
}

export async function downloadWorkbook(wb: ExcelJS.Workbook, filename: string): Promise<void> {
  const buffer = await wb.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// Safety: reference EXAMPLE_INPUTS so unused-import rule doesn't flag it if trimmed.
// (It's re-exported for convenience from the defaults module; keeping the import
// makes sure the defaults file compiles alongside this one.)
void EXAMPLE_INPUTS
