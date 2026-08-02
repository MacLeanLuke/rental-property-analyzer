export interface PropertyInputs {
  // Property
  purchasePrice: number
  currentValue: number
  landPct: number
  appreciationRate: number

  // Mortgage
  mortgageBalance: number
  mortgageRate: number
  loanTermYears: number

  // Income
  monthlyRent: number
  rentGrowth: number
  vacancyRate: number

  // Monthly operating expenses
  propertyTaxMo: number
  insuranceMo: number
  managementMo: number
  maintenanceMo: number
  hoaMo: number

  // Tax
  marginalTaxRate: number
  stateTaxRate: number
  depreciationYears: number
  yearsOwned: number
  capGainsRate: number
  deprecRecaptureRate: number

  // Alternative investment
  stockReturn: number
  inflation: number

  // Risk
  riskFreeRate: number
  rentalVolatility: number
  stockVolatility: number
  sellingCosts: number
  riskAversion: number
}

export interface Property {
  id: string
  nickname: string
  createdAt: number
  updatedAt: number
  inputs: PropertyInputs
}
