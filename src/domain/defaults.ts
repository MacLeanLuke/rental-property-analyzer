import type { PropertyInputs } from './types'

// Illustrative starting values for a hypothetical Texas single-family rental.
// These are deliberately round, market-average figures — not a real property.
//
// Texas is a useful default because its carrying costs are distinctive:
// effective property tax runs ~1.6-1.8% (vs ~1.1% nationally) and homeowners
// insurance averages ~$3,300/yr, so this home costs ~$800/mo before mortgage.
// Texas also levies no state income tax, so stateTaxRate is genuinely 0 here.
//
// Tuned so the verdict lands just past the hurdle rate rather than in a
// landslide: at these values the model says KEEP, but nudging almost any input
// flips it. That makes the trade-off visible the moment someone edits a field.
export const EXAMPLE_INPUTS: PropertyInputs = {
  // Property
  purchasePrice: 300_000,
  currentValue: 350_000,
  landPct: 0.20,
  appreciationRate: 0.03,

  // Mortgage — a pre-2022 rate, still common among current owners
  mortgageBalance: 180_000,
  mortgageRate: 0.045,
  loanTermYears: 30,

  // Income — $2,400 on a $350k home is ~0.69% rent-to-value, mid-range for TX
  monthlyRent: 2_400,
  rentGrowth: 0.03,
  vacancyRate: 0.05,

  // Monthly operating expenses
  propertyTaxMo: 525, // ~1.8% of current value annually
  insuranceMo: 275, // ~$3,300/yr, the current TX average
  managementMo: 175, // ~8% of gross rent
  maintenanceMo: 250, // ~1% of purchase price annually
  hoaMo: 0,

  // Tax
  marginalTaxRate: 0.24,
  stateTaxRate: 0.00, // Texas has no state income tax
  depreciationYears: 27.5,
  yearsOwned: 8,
  capGainsRate: 0.15,
  deprecRecaptureRate: 0.25,

  // Alternative investment
  stockReturn: 0.085,
  inflation: 0.03,

  // Risk
  riskFreeRate: 0.045,
  rentalVolatility: 0.18,
  stockVolatility: 0.15,
  sellingCosts: 0.06,
  riskAversion: 3.0,
}

export function blankInputs(): PropertyInputs {
  return { ...EXAMPLE_INPUTS }
}
