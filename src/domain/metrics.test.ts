import { describe, expect, it } from 'vitest'
import { EXAMPLE_INPUTS } from './defaults'
import {
  exitFlows,
  hurdleRate,
  irr,
  liveMetrics,
  monthlyPi,
  netProceedsToday,
  npv,
  simulate,
} from './metrics'
import type { PropertyInputs } from './types'

/**
 * Expected values here are derived by hand from the formulas, not captured from
 * the implementation. A test that asserts whatever the code currently returns
 * proves only that the code has not changed — it cannot tell you the formula was
 * wrong to begin with, which is the failure that matters for financial math.
 */

const inputs = (over: Partial<PropertyInputs> = {}): PropertyInputs => ({ ...EXAMPLE_INPUTS, ...over })

describe('monthlyPi — standard amortization', () => {
  it('matches the closed-form payment for $300k at 6% over 30 years', () => {
    // P·r / (1 − (1+r)^−n) with r = 0.06/12 = 0.005, n = 360
    //   1.005^360  = 6.022575
    //   1.005^−360 = 0.166042
    //   1500 / (1 − 0.166042) = 1798.65
    expect(monthlyPi(300_000, 0.06, 30)).toBeCloseTo(1798.65, 2)
  })

  it('matches a second independent case: $180k at 4.5% over 30 years', () => {
    // r = 0.00375, n = 360, 1.00375^-360 = 0.2600795
    //   675 / (1 − 0.2600795) = 912.03
    expect(monthlyPi(180_000, 0.045, 30)).toBeCloseTo(912.03, 2)
  })

  it('degrades to straight-line division at a zero interest rate', () => {
    expect(monthlyPi(300_000, 0, 30)).toBeCloseTo(300_000 / 360, 10)
  })

  it('returns 0 for a paid-off loan', () => {
    expect(monthlyPi(0, 0.06, 30)).toBe(0)
    expect(monthlyPi(-5_000, 0.06, 30)).toBe(0)
  })

  it('returns 0 for a zero-length term rather than dividing by zero', () => {
    expect(monthlyPi(300_000, 0.06, 0)).toBe(0)
  })

  it('costs more per month on a shorter term', () => {
    expect(monthlyPi(300_000, 0.06, 15)).toBeGreaterThan(monthlyPi(300_000, 0.06, 30))
  })
})

describe('hurdleRate — CAPM plus an illiquidity premium', () => {
  it('computes riskFree + beta·(equity premium) + illiquidity', () => {
    // 0.04 + 0.5·(0.10 − 0.04) + 0.015 = 0.085
    const rate = hurdleRate(inputs({ riskFreeRate: 0.04, stockReturn: 0.1 }), 0.5, 0.015)
    expect(rate).toBeCloseTo(0.085, 10)
  })

  it('collapses to the risk-free rate plus premium at zero beta', () => {
    const rate = hurdleRate(inputs({ riskFreeRate: 0.04, stockReturn: 0.1 }), 0, 0.015)
    expect(rate).toBeCloseTo(0.055, 10)
  })

  it('rises with beta when equities out-yield the risk-free rate', () => {
    const low = hurdleRate(inputs({ riskFreeRate: 0.04, stockReturn: 0.1 }), 0.3, 0.015)
    const high = hurdleRate(inputs({ riskFreeRate: 0.04, stockReturn: 0.1 }), 0.9, 0.015)
    expect(high).toBeGreaterThan(low)
  })
})

describe('npv', () => {
  it('discounts each flow by (1+r)^t', () => {
    // −100 + 60/1.1 + 60/1.21 = −100 + 54.545455 + 49.586777 = 4.132231
    expect(npv(0.1, [-100, 60, 60])).toBeCloseTo(4.132231, 6)
  })

  it('leaves t=0 undiscounted', () => {
    expect(npv(0.25, [500])).toBeCloseTo(500, 10)
  })

  it('sums flows directly at a zero discount rate', () => {
    expect(npv(0, [-100, 60, 60])).toBeCloseTo(20, 10)
  })

  it('falls as the discount rate rises', () => {
    const flows = [-100, 60, 60]
    expect(npv(0.2, flows)).toBeLessThan(npv(0.05, flows))
  })
})

describe('irr', () => {
  it('solves the single-period case exactly', () => {
    // −100 today, 110 next period → 10%
    expect(irr([-100, 110])).toBeCloseTo(0.1, 5)
  })

  it('solves a two-period case matching the quadratic root', () => {
    // 60x² + 60x − 100 = 0 where x = 1/(1+r)
    //   x = (−60 + √27600)/120 = 0.8844335
    //   r = 1/x − 1 = 0.1306624
    expect(irr([-100, 60, 60])).toBeCloseTo(0.130662, 5)
  })

  it('is the rate at which NPV is zero', () => {
    const flows = [-250_000, 40_000, 45_000, 50_000, 300_000]
    const rate = irr(flows)
    expect(npv(rate, flows)).toBeCloseTo(0, 4)
  })

  it('returns NaN when the flows never change sign', () => {
    expect(irr([100, 110, 120])).toBeNaN()
    expect(irr([-100, -50])).toBeNaN()
  })

  it('returns NaN for a stream too short to solve', () => {
    expect(irr([-100])).toBeNaN()
  })
})

describe('netProceedsToday — sale after tax', () => {
  const sale = inputs({
    purchasePrice: 300_000,
    currentValue: 400_000,
    landPct: 0.2,
    depreciationYears: 27.5,
    yearsOwned: 5,
    sellingCosts: 0.06,
    mortgageBalance: 200_000,
    deprecRecaptureRate: 0.25,
    capGainsRate: 0.15,
  })

  it('nets sale price against payoff, recapture and capital gains', () => {
    // annual depreciation = 300,000·0.8 / 27.5      =   8,727.27
    // accumulated over 5 years                      =  43,636.36
    // net sale = 400,000·0.94                       = 376,000
    // adjusted basis = 300,000 − 43,636.36          = 256,363.64
    // total gain                                    = 119,636.36
    // recapture = 43,636.36·0.25                    =  10,909.09
    // capital gains = (119,636.36 − 43,636.36)·0.15 =  11,400
    // 376,000 − 200,000 − 10,909.09 − 11,400        = 153,690.91
    expect(netProceedsToday(sale)).toBeCloseTo(153_690.91, 2)
  })

  it('charges no gains tax when the sale does not exceed the adjusted basis', () => {
    // Sell at 250k: net sale 235,000 vs adjusted basis 256,363.64 → no gain.
    const atLoss = { ...sale, currentValue: 250_000, mortgageBalance: 0 }
    expect(netProceedsToday(atLoss)).toBeCloseTo(250_000 * 0.94, 2)
  })

  it('taxes only recapture when the gain is smaller than accumulated depreciation', () => {
    // Net sale 263,200; basis 256,363.64; gain 6,836.36 — all inside recapture.
    const smallGain = { ...sale, currentValue: 280_000, mortgageBalance: 0 }
    const gain = 280_000 * 0.94 - (300_000 - (300_000 * 0.8 / 27.5) * 5)
    const expected = 280_000 * 0.94 - gain * 0.25
    expect(netProceedsToday(smallGain)).toBeCloseTo(expected, 2)
  })

  it('subtracts the outstanding mortgage dollar for dollar', () => {
    const owing = netProceedsToday({ ...sale, mortgageBalance: 250_000 })
    expect(netProceedsToday(sale) - owing).toBeCloseTo(50_000, 6)
  })

  it('leaves less in hand as selling costs rise', () => {
    expect(netProceedsToday({ ...sale, sellingCosts: 0.1 }))
      .toBeLessThan(netProceedsToday({ ...sale, sellingCosts: 0.03 }))
  })
})

describe('simulate', () => {
  it('produces one row per projected year', () => {
    expect(simulate(inputs(), 10)).toHaveLength(10)
  })

  it('pays the mortgage down monotonically', () => {
    const rows = simulate(inputs(), 30)
    const balances = rows.map((r) => r.mortgageBalance ?? 0)
    for (let i = 1; i < balances.length; i++) {
      expect(balances[i]).toBeLessThanOrEqual(balances[i - 1]!)
    }
  })

  it('never amortizes below zero', () => {
    const rows = simulate(inputs({ loanTermYears: 5 }), 30)
    for (const row of rows) expect(row.mortgageBalance ?? 0).toBeGreaterThanOrEqual(0)
  })

  it('grows property value at the appreciation rate', () => {
    const flat = simulate(inputs({ appreciationRate: 0 }), 5)
    const rising = simulate(inputs({ appreciationRate: 0.05 }), 5)
    expect(rising[4]!.propertyValue).toBeGreaterThan(flat[4]!.propertyValue)
  })

  it('compounds appreciation rather than applying it linearly', () => {
    // 350,000 · 1.05^5 = 446,707.66
    const rows = simulate(inputs({ currentValue: 350_000, appreciationRate: 0.05 }), 5)
    expect(rows[4]!.propertyValue).toBeCloseTo(350_000 * 1.05 ** 5, 0)
  })

  it('keeps equity equal to value less the outstanding balance', () => {
    for (const row of simulate(inputs(), 10)) {
      expect(row.equity).toBeCloseTo(row.propertyValue - row.mortgageBalance, 2)
    }
  })
})

describe('exitFlows', () => {
  it('opens with the opportunity cost of not selling today', () => {
    const config = inputs()
    const flows = exitFlows(simulate(config, 10), config, 5)
    expect(flows[0]).toBeCloseTo(-netProceedsToday(config), 6)
  })

  it('runs from year 0 through the exit year inclusive', () => {
    const config = inputs()
    expect(exitFlows(simulate(config, 10), config, 5)).toHaveLength(6)
  })
})

describe('liveMetrics', () => {
  const metrics = liveMetrics(inputs())

  it('returns finite headline figures for the example property', () => {
    expect(Number.isFinite(metrics.capRate)).toBe(true)
    expect(Number.isFinite(metrics.cashOnCash)).toBe(true)
    expect(Number.isFinite(metrics.hurdleRate)).toBe(true)
    expect(Number.isFinite(metrics.npvAt10)).toBe(true)
  })

  it('reports equity as current value less the mortgage', () => {
    const config = inputs()
    expect(metrics.currentEquity).toBeCloseTo(config.currentValue - config.mortgageBalance, 2)
  })

  it('derives annual cash flow from the monthly figure', () => {
    expect(metrics.annualCashFlow).toBeCloseTo(metrics.monthlyCashFlow * 12, 2)
  })

  it('returns a verdict from the known set', () => {
    expect(['STRONG_KEEP', 'KEEP', 'HOLD', 'SELL']).toContain(metrics.verdict)
  })

  it('agrees with netProceedsToday computed directly', () => {
    expect(metrics.netProceedsToday).toBeCloseTo(netProceedsToday(inputs()), 6)
  })

  it('improves cash flow when rent rises and everything else holds', () => {
    const low = liveMetrics(inputs({ monthlyRent: 2_000 }))
    const high = liveMetrics(inputs({ monthlyRent: 3_000 }))
    expect(high.monthlyCashFlow).toBeGreaterThan(low.monthlyCashFlow)
  })

  it('lowers the cap rate when the property costs more to hold', () => {
    const cheap = liveMetrics(inputs({ propertyTaxMo: 200 }))
    const dear = liveMetrics(inputs({ propertyTaxMo: 900 }))
    expect(dear.capRate).toBeLessThan(cheap.capRate)
  })
})
