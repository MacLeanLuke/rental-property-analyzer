import type { PropertyInputs } from './types'

export const PROJECTION_YEARS = 30

// Hurdle rate assumes a CAPM-style model with a small illiquidity premium.
// Both knobs are configurable in the Hold vs Sell sheet of the Python original;
// here we expose the same values at the same defaults so results match.
export const DEFAULT_RE_BETA = 0.5
export const DEFAULT_ILLIQUIDITY_PREMIUM = 0.015

export interface YearRow {
  year: number
  grossRent: number
  effectiveRent: number
  propTax: number
  insurance: number
  mgmt: number
  maint: number
  hoa: number
  totalOperExp: number
  noi: number
  mortgagePi: number
  principalPaydown: number
  mortgageInterest: number
  cashFlow: number
  depreciation: number
  totalDeductions: number
  netRentalIncome: number
  taxImpact: number
  propertyValue: number
  mortgageBalance: number
  equity: number
  afterTaxCashFlow: number
  totalReturn: number
  cumulativeDeprec: number
  netSalePrice: number
  recaptureTax: number
  capGainsTax: number
  netProceeds: number
}

// Standard amortization payment: P·r / (1 − (1+r)^-n). Returns 0 for trivial inputs.
export function monthlyPi(balance: number, annualRate: number, termYears: number): number {
  if (balance <= 0 || termYears <= 0) return 0
  const n = termYears * 12
  if (annualRate <= 0) return balance / n
  const r = annualRate / 12
  return (balance * r) / (1 - Math.pow(1 + r, -n))
}

// Amortize a mortgage balance forward one full year (12 monthly payments).
function amortizeYear(balance: number, annualRate: number, monthlyPi: number): number {
  if (balance <= 0) return 0
  if (annualRate <= 0) return Math.max(0, balance - monthlyPi * 12)
  const r = annualRate / 12
  const next = balance * (1 + r) ** 12 - monthlyPi * ((1 + r) ** 12 - 1) / r
  return Math.max(0, next)
}

export function simulate(inputs: PropertyInputs, years = PROJECTION_YEARS): YearRow[] {
  const annualDeprec = (inputs.purchasePrice * (1 - inputs.landPct)) / inputs.depreciationYears
  const rows: YearRow[] = []

  let prevGrossRent = inputs.monthlyRent * 12
  let prevPropTax = inputs.propertyTaxMo * 12
  let prevInsurance = inputs.insuranceMo * 12
  let prevMgmt = inputs.managementMo * 12
  let prevMaint = inputs.maintenanceMo * 12
  let prevHoa = inputs.hoaMo * 12
  let prevBalance = inputs.mortgageBalance
  let prevPropValue = inputs.currentValue

  for (let y = 1; y <= years; y++) {
    const grossRent = y === 1 ? prevGrossRent : prevGrossRent * (1 + inputs.rentGrowth)
    const effectiveRent = grossRent * (1 - inputs.vacancyRate)

    const propTax = y === 1 ? prevPropTax : prevPropTax * (1 + inputs.inflation)
    const insurance = y === 1 ? prevInsurance : prevInsurance * (1 + inputs.inflation)
    const mgmt = y === 1 ? prevMgmt : prevMgmt * (1 + inputs.inflation)
    const maint = y === 1 ? prevMaint : prevMaint * (1 + inputs.inflation)
    const hoa = y === 1 ? prevHoa : prevHoa * (1 + inputs.inflation)
    const totalOperExp = propTax + insurance + mgmt + maint + hoa

    const noi = effectiveRent - totalOperExp
    const monthlyPiAmt = monthlyPi(inputs.mortgageBalance, inputs.mortgageRate, inputs.loanTermYears)
    const mortgagePi = prevBalance > 0 ? monthlyPiAmt * 12 : 0
    const newBalance = amortizeYear(prevBalance, inputs.mortgageRate, monthlyPiAmt)
    const principalPaydown = Math.max(0, prevBalance - newBalance)
    const mortgageInterest = Math.max(0, mortgagePi - principalPaydown)
    const cashFlow = noi - mortgagePi

    const depreciation = inputs.yearsOwned + y <= inputs.depreciationYears ? annualDeprec : 0
    const totalDeductions = totalOperExp + mortgageInterest + depreciation
    const netRentalIncome = effectiveRent - totalDeductions
    const taxImpact = -netRentalIncome * (inputs.marginalTaxRate + inputs.stateTaxRate)

    const propertyValue = prevPropValue * (1 + inputs.appreciationRate)
    const equity = propertyValue - newBalance

    const afterTaxCashFlow = cashFlow + taxImpact
    const appreciation = propertyValue - prevPropValue
    const totalReturn = cashFlow + principalPaydown + appreciation + taxImpact

    const cumulativeDeprec = Math.min(inputs.yearsOwned + y, inputs.depreciationYears) * annualDeprec
    const netSalePrice = propertyValue * (1 - inputs.sellingCosts)
    const adjustedBasis = inputs.purchasePrice - cumulativeDeprec
    const totalGain = Math.max(0, netSalePrice - adjustedBasis)
    const recapturedDeprec = Math.min(totalGain, cumulativeDeprec)
    const capGain = Math.max(0, totalGain - recapturedDeprec)
    const recaptureTax = recapturedDeprec * inputs.deprecRecaptureRate
    const capGainsTax = capGain * inputs.capGainsRate
    const netProceeds = netSalePrice - newBalance - recaptureTax - capGainsTax

    rows.push({
      year: y,
      grossRent,
      effectiveRent,
      propTax,
      insurance,
      mgmt,
      maint,
      hoa,
      totalOperExp,
      noi,
      mortgagePi,
      principalPaydown,
      mortgageInterest,
      cashFlow,
      depreciation,
      totalDeductions,
      netRentalIncome,
      taxImpact,
      propertyValue,
      mortgageBalance: newBalance,
      equity,
      afterTaxCashFlow,
      totalReturn,
      cumulativeDeprec,
      netSalePrice,
      recaptureTax,
      capGainsTax,
      netProceeds,
    })

    prevGrossRent = grossRent
    prevPropTax = propTax
    prevInsurance = insurance
    prevMgmt = mgmt
    prevMaint = maint
    prevHoa = hoa
    prevBalance = newBalance
    prevPropValue = propertyValue
  }

  return rows
}

export function hurdleRate(
  inputs: PropertyInputs,
  beta = DEFAULT_RE_BETA,
  illiquidityPremium = DEFAULT_ILLIQUIDITY_PREMIUM,
): number {
  return inputs.riskFreeRate + beta * (inputs.stockReturn - inputs.riskFreeRate) + illiquidityPremium
}

export function npv(rate: number, flows: number[]): number {
  let total = 0
  for (let t = 0; t < flows.length; t++) {
    total += flows[t] / (1 + rate) ** t
  }
  return total
}

// IRR via bisection on [−0.99, 10]. Returns NaN if no sign change.
export function irr(flows: number[]): number {
  if (flows.length < 2) return Number.NaN
  const f = (r: number) => flows.reduce((acc, c, t) => acc + c / (1 + r) ** t, 0)
  let lo = -0.99
  let hi = 10
  let flo = f(lo)
  let fhi = f(hi)
  if (!Number.isFinite(flo) || !Number.isFinite(fhi) || flo * fhi > 0) return Number.NaN
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2
    const fmid = f(mid)
    if (Math.abs(fmid) < 1e-6) return mid
    if (flo * fmid < 0) {
      hi = mid
      fhi = fmid
    } else {
      lo = mid
      flo = fmid
    }
  }
  return (lo + hi) / 2
}

// Net proceeds if sold today, mirroring Excel formula B50 in the Python workbook.
export function netProceedsToday(inputs: PropertyInputs): number {
  const annualDeprec = (inputs.purchasePrice * (1 - inputs.landPct)) / inputs.depreciationYears
  const accumDeprec = annualDeprec * inputs.yearsOwned
  const netSale = inputs.currentValue * (1 - inputs.sellingCosts)
  const adjustedBasis = inputs.purchasePrice - accumDeprec
  const totalGain = Math.max(0, netSale - adjustedBasis)
  const recapture = Math.min(totalGain, accumDeprec) * inputs.deprecRecaptureRate
  const capGains = Math.max(0, totalGain - accumDeprec) * inputs.capGainsRate
  return netSale - inputs.mortgageBalance - recapture - capGains
}

// Build the cash-flow stream assuming exit at year `exitYear`.
// flows[0] = opportunity cost (− net proceeds today), flows[1..exitYear] = after-tax CF,
// final year also includes net proceeds from sale.
export function exitFlows(rows: YearRow[], inputs: PropertyInputs, exitYear: number): number[] {
  const flows: number[] = [-netProceedsToday(inputs)]
  for (let y = 1; y <= exitYear; y++) {
    const row = rows[y - 1]
    const f = row.afterTaxCashFlow + (y === exitYear ? row.netProceeds : 0)
    flows.push(f)
  }
  return flows
}

export interface LiveMetrics {
  monthlyCashFlow: number
  annualCashFlow: number
  monthlyNoi: number
  capRate: number
  cashOnCash: number
  currentEquity: number
  netProceedsToday: number
  annualDeprec: number
  hurdleRate: number
  // Forward-looking at year 10 exit
  npvAt10: number
  irrAt10: number
  equityAt10: number
  // Verdict helpers
  verdict: 'STRONG_KEEP' | 'KEEP' | 'HOLD' | 'SELL'
  verdictLabel: string
}

export function liveMetrics(inputs: PropertyInputs): LiveMetrics {
  const rows = simulate(inputs, Math.max(10, PROJECTION_YEARS))
  const monthlyOpEx = inputs.propertyTaxMo + inputs.insuranceMo + inputs.managementMo + inputs.maintenanceMo + inputs.hoaMo
  const monthlyNoi = inputs.monthlyRent * (1 - inputs.vacancyRate) - monthlyOpEx
  const monthlyCashFlow = monthlyNoi - monthlyPi(inputs.mortgageBalance, inputs.mortgageRate, inputs.loanTermYears)
  const annualCashFlow = monthlyCashFlow * 12
  const currentEquity = inputs.currentValue - inputs.mortgageBalance
  const capRate = (monthlyNoi * 12) / inputs.currentValue
  const cashOnCash = currentEquity > 0 ? annualCashFlow / currentEquity : 0
  const annualDeprec = (inputs.purchasePrice * (1 - inputs.landPct)) / inputs.depreciationYears
  const proceeds = netProceedsToday(inputs)
  const hr = hurdleRate(inputs)

  const flows10 = exitFlows(rows, inputs, 10)
  const npv10 = npv(hr, flows10)
  const irr10 = irr(flows10)
  const equity10 = rows[9]?.equity ?? 0
  const roe10 = rows[9] ? rows[9].totalReturn / (rows[8]?.equity ?? currentEquity) : 0

  let verdict: LiveMetrics['verdict']
  let verdictLabel: string
  if (npv10 > 0 && roe10 > hr) {
    verdict = 'STRONG_KEEP'
    verdictLabel = 'Strong keep — beats hurdle and growing'
  } else if (npv10 > 0) {
    verdict = 'KEEP'
    verdictLabel = 'Keep — rental beats stocks over 10 years'
  } else if (roe10 > hr) {
    verdict = 'HOLD'
    verdictLabel = 'Hold — strong current returns, give it time'
  } else {
    verdict = 'SELL'
    verdictLabel = 'Sell — stocks likely win over 10 years'
  }

  return {
    monthlyCashFlow,
    annualCashFlow,
    monthlyNoi,
    capRate,
    cashOnCash,
    currentEquity,
    netProceedsToday: proceeds,
    annualDeprec,
    hurdleRate: hr,
    npvAt10: npv10,
    irrAt10: irr10,
    equityAt10: equity10,
    verdict,
    verdictLabel,
  }
}
