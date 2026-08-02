import { z } from 'zod'

const money = z.number().finite().min(0)
const rate = z.number().finite().min(-1).max(2)
const pct = z.number().finite().min(0).max(1)

export const propertyInputsSchema = z.object({
  purchasePrice: money,
  currentValue: money,
  landPct: pct,
  appreciationRate: rate,

  mortgageBalance: money,
  mortgageRate: rate,
  loanTermYears: z.number().finite().min(1).max(50).default(30),

  monthlyRent: money,
  rentGrowth: rate,
  vacancyRate: pct,

  propertyTaxMo: money,
  insuranceMo: money,
  managementMo: money,
  maintenanceMo: money,
  hoaMo: money,

  marginalTaxRate: pct,
  stateTaxRate: pct,
  depreciationYears: z.number().finite().min(1).max(50),
  yearsOwned: z.number().finite().min(0).max(100),
  capGainsRate: pct,
  deprecRecaptureRate: pct,

  stockReturn: rate,
  inflation: rate,

  riskFreeRate: rate,
  rentalVolatility: pct,
  stockVolatility: pct,
  sellingCosts: pct,
  riskAversion: z.number().finite().min(1).max(10),
})

export const propertySchema = z.object({
  id: z.string(),
  nickname: z.string().min(1).max(120),
  createdAt: z.number(),
  updatedAt: z.number(),
  inputs: propertyInputsSchema,
})

export const propertyArraySchema = z.array(propertySchema)
