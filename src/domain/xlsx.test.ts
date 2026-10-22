import type ExcelJS from 'exceljs'
import FormulaParser, { type FunctionArg } from 'fast-formula-parser'
import { describe, expect, it } from 'vitest'
import { EXAMPLE_INPUTS } from './defaults'
import { monthlyPi } from './metrics'
import type { PropertyInputs } from './types'
import { buildPropertyWorkbook } from './xlsx'

/**
 * These tests evaluate the exported workbook's formulas the way Excel would,
 * so they check what a user sees in the cells, not just the formula text.
 * As in metrics.test.ts, expected values are worked out by hand.
 */

// fast-formula-parser leaves out a few functions the workbook uses.
const nums = (args: FunctionArg[]): number[] =>
  args.flatMap((a) => (Array.isArray(a.value) ? a.value.flat() : [a.value])).map(Number)
const extraFunctions = {
  MIN: (...args: FunctionArg[]) => Math.min(...nums(args)),
  MAX: (...args: FunctionArg[]) => Math.max(...nums(args)),
  PMT: (rate: FunctionArg, nper: FunctionArg, pv: FunctionArg) => {
    const [r, n, p] = nums([rate, nper, pv])
    return r === 0 ? -p / n : (-p * r) / (1 - (1 + r) ** -n)
  },
  NPER: (rate: FunctionArg, pmt: FunctionArg, pv: FunctionArg) => {
    const [r, m, p] = nums([rate, pmt, pv])
    return r === 0 ? -p / m : Math.log(m / (m + p * r)) / Math.log(1 + r)
  },
}

/** Lazily evaluates any cell in an exceljs workbook, following references. */
function evaluator(wb: ExcelJS.Workbook) {
  const cache = new Map<string, unknown>()
  const parsers: FormulaParser[] = []

  const cell = (sheet: string, row: number, col: number, depth = 0): unknown => {
    const key = `${sheet}!${row},${col}`
    if (cache.has(key)) return cache.get(key)
    const ws = wb.getWorksheet(sheet)
    if (!ws) throw new Error(`No sheet named ${sheet}`)
    const raw = ws.getCell(row, col).value
    let value: unknown = raw ?? 0
    if (raw && typeof raw === 'object' && 'formula' in raw && raw.formula) {
      // The parser isn't re-entrant, so each nesting level gets its own.
      parsers[depth] ??= new FormulaParser({
        functions: extraFunctions,
        onCell: (ref) => cell(ref.sheet, ref.row, ref.col, depth + 1),
        onRange: (ref) => {
          const out: unknown[][] = []
          for (let r = ref.from.row; r <= ref.to.row; r++) {
            const line: unknown[] = []
            for (let c = ref.from.col; c <= ref.to.col; c++) line.push(cell(ref.sheet, r, c, depth + 1))
            out.push(line)
          }
          return out
        },
      })
      value = parsers[depth].parse(raw.formula, { sheet, row, col })
    }
    cache.set(key, value)
    return value
  }
  return (sheet: string, address: string) => {
    const ref = wb.getWorksheet(sheet)!.getCell(address)
    return Number(cell(sheet, Number(ref.row), Number(ref.col)))
  }
}

async function workbookFor(over: Partial<PropertyInputs>) {
  const now = Date.now()
  const wb = await buildPropertyWorkbook({
    id: 'test',
    nickname: 'Test',
    createdAt: now,
    updatedAt: now,
    inputs: { ...EXAMPLE_INPUTS, ...over },
  })
  return evaluator(wb)
}

// Hold Scenario year Y is on row Y+3; Hold vs Sell year Y on row Y+15.
const HOLD = 'Hold Scenario'
const DECISION = 'Hold vs Sell'
const holdRow = (year: number) => year + 3
const decisionRow = (year: number) => year + 15

describe('Hold Scenario — mortgage payments in the payoff year', () => {
  it('charges every payment on a loan that pays off exactly at a year end', async () => {
    // $100k at 6% with 5 years left: P&I = 1,933.28/mo (r = 0.005, n = 60:
    // 1.005^−60 = 0.741372, 500 / 0.258628 = 1,933.28).
    // Five full years = 60 × 1,933.28 = 115,996.81 paid, of which 15,996.81 is interest.
    const v = await workbookFor({ mortgageBalance: 100_000, mortgageRate: 0.06, loanTermYears: 5 })

    for (let y = 1; y <= 5; y++) expect(v(HOLD, `K${holdRow(y)}`)).toBeCloseTo(12 * 1933.28, 0)
    expect(v(HOLD, `K${holdRow(6)}`)).toBe(0)

    let paid = 0
    let interest = 0
    for (let y = 1; y <= 30; y++) {
      paid += v(HOLD, `K${holdRow(y)}`)
      interest += v(HOLD, `M${holdRow(y)}`)
      expect(v(HOLD, `M${holdRow(y)}`)).toBeGreaterThanOrEqual(0)
    }
    expect(paid).toBeCloseTo(115_996.81, 0)
    expect(interest).toBeCloseTo(15_996.81, 0)
  })

  it('charges only what is left when the loan pays off mid-year', async () => {
    // 4.5 years left: 54 payments. Year 5 holds only the last 6.
    const v = await workbookFor({ mortgageBalance: 100_000, mortgageRate: 0.06, loanTermYears: 4.5 })
    const pmt = monthlyPi(100_000, 0.06, 4.5)

    const year5 = v(HOLD, `K${holdRow(5)}`)
    expect(year5).toBeCloseTo(6 * pmt, 2)
    expect(v(HOLD, `M${holdRow(5)}`)).toBeGreaterThanOrEqual(0)
    expect(v(HOLD, `K${holdRow(6)}`)).toBe(0)
  })
})

describe('Hold vs Sell — wealth advantage compares cash in hand on both sides', () => {
  // A deliberately simple property: no loan, no depreciation, no taxes, and
  // a flat $100k value, so every number below is easy to check by hand.
  const simple: Partial<PropertyInputs> = {
    purchasePrice: 100_000,
    currentValue: 100_000,
    appreciationRate: 0,
    landPct: 1,
    mortgageBalance: 0,
    vacancyRate: 0,
    propertyTaxMo: 0,
    insuranceMo: 0,
    managementMo: 0,
    hoaMo: 0,
    marginalTaxRate: 0,
    stateTaxRate: 0,
    capGainsRate: 0,
    deprecRecaptureRate: 0,
    stockReturn: 0,
    sellingCosts: 0.06,
  }

  it('counts selling costs on the keep side, not just the sell side', async () => {
    // Keep: house sells for 100,000 − 6% = 94,000 at the end of year 1.
    // Sell: 94,000 today, minus the 9,600 the rental would have paid you
    // (12 × (1,000 rent − 200 maintenance)) = 84,400.
    // Keep − Sell = 94,000 − 84,400 = 9,600, exactly the year's rental profit.
    // (Comparing pre-sale equity instead would say 100,000 − 84,400 = 15,600.)
    const v = await workbookFor({ ...simple, monthlyRent: 1000, maintenanceMo: 200 })
    expect(v(DECISION, `F${decisionRow(1)}`)).toBeCloseTo(9_600, 2)
  })

  it('takes capital gains tax off the stock portfolio before comparing', async () => {
    // No rent or costs. Sell: 94,000 grows 10% to 103,400; the 9,400 gain is
    // taxed at 15% (1,410), leaving 101,990. Keep: 94,000.
    // Keep − Sell = 94,000 − 101,990 = −7,990.
    const v = await workbookFor({
      ...simple,
      monthlyRent: 0,
      maintenanceMo: 0,
      stockReturn: 0.1,
      capGainsRate: 0.15,
    })
    expect(v('Sell Scenario', 'H3')).toBeCloseTo(101_990, 2)
    expect(v(DECISION, `F${decisionRow(1)}`)).toBeCloseTo(-7_990, 2)
  })
})
