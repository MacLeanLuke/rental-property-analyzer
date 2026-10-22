import { useState } from 'react'
import { ArrowLeft, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NumberField } from '@/components/NumberField'
import { MetricsSidebar } from '@/components/MetricsSidebar'
import type { Property, PropertyInputs } from '@/domain/types'
import { monthlyPi } from '@/domain/metrics'
import { formatMoney } from '@/lib/utils'
import { track } from '@/lib/analytics'

interface PropertyFormProps {
  property: Property
  onChange: (next: Property) => void
  onBack: () => void
}

export function PropertyForm({ property, onChange, onBack }: PropertyFormProps) {
  const [downloading, setDownloading] = useState(false)

  const updateInput = <K extends keyof PropertyInputs>(key: K, value: PropertyInputs[K]) => {
    onChange({
      ...property,
      updatedAt: Date.now(),
      inputs: { ...property.inputs, [key]: value },
    })
  }

  const updateNickname = (nickname: string) => {
    onChange({ ...property, updatedAt: Date.now(), nickname })
  }

  const download = async () => {
    setDownloading(true)
    try {
      track('property_excel_downloaded')
      const { buildPropertyWorkbook, downloadWorkbook } = await import('@/domain/xlsx')
      const wb = await buildPropertyWorkbook(property)
      const safeName = property.nickname.replace(/[^a-z0-9-_]/gi, '_') || 'property'
      await downloadWorkbook(wb, `${safeName}_analysis.xlsx`)
    } finally {
      setDownloading(false)
    }
  }

  const i = property.inputs

  return (
    <div className="mx-auto max-w-7xl p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft /> Back
          </Button>
          <div className="flex flex-col gap-1">
            <Label className="text-xs text-muted-foreground">Property nickname</Label>
            <Input
              value={property.nickname}
              onChange={(e) => updateNickname(e.target.value)}
              className="w-80 text-base font-semibold"
              placeholder="e.g. Elm Street Duplex"
            />
          </div>
        </div>
        <Button onClick={download} disabled={downloading}>
          <Download /> {downloading ? 'Generating…' : 'Download Excel analysis'}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-6">
          <Section title="Property">
            <NumberField label="Original purchase price" value={i.purchasePrice} onChange={(v) => updateInput('purchasePrice', v)} format="money" />
            <NumberField label="Current market value" value={i.currentValue} onChange={(v) => updateInput('currentValue', v)} format="money" />
            <NumberField label="Land % of value (not depreciable)" value={i.landPct} onChange={(v) => updateInput('landPct', v)} format="percent" hint="Typically 15–25% for single-family homes" />
            <NumberField label="Annual appreciation rate" value={i.appreciationRate} onChange={(v) => updateInput('appreciationRate', v)} format="percent" />
          </Section>

          <Section title="Mortgage">
            <NumberField label="Current mortgage balance" value={i.mortgageBalance} onChange={(v) => updateInput('mortgageBalance', v)} format="money" hint="Today's principal balance from your latest statement, not the original loan amount" />
            <NumberField label="Annual interest rate" value={i.mortgageRate} onChange={(v) => updateInput('mortgageRate', v)} format="percent" />
            <NumberField label="Years remaining on loan" value={i.loanTermYears} onChange={(v) => updateInput('loanTermYears', v)} format="number" hint="Years until payoff, not the original term. E.g. a 30-year loan taken out 5 years ago has 25 left" />
            <ComputedPi inputs={i} />
          </Section>

          <Section title="Rental income">
            <NumberField label="Monthly gross rent" value={i.monthlyRent} onChange={(v) => updateInput('monthlyRent', v)} format="money" />
            <NumberField label="Annual rent growth rate" value={i.rentGrowth} onChange={(v) => updateInput('rentGrowth', v)} format="percent" />
            <NumberField label="Vacancy rate" value={i.vacancyRate} onChange={(v) => updateInput('vacancyRate', v)} format="percent" hint="5% = ~18 days/year vacant" />
          </Section>

          <Section title="Monthly operating expenses">
            <NumberField label="Property taxes" value={i.propertyTaxMo} onChange={(v) => updateInput('propertyTaxMo', v)} format="money" />
            <NumberField label="Insurance" value={i.insuranceMo} onChange={(v) => updateInput('insuranceMo', v)} format="money" />
            <NumberField label="Property management" value={i.managementMo} onChange={(v) => updateInput('managementMo', v)} format="money" hint="~8% of rent is typical" />
            <NumberField label="Maintenance / repairs" value={i.maintenanceMo} onChange={(v) => updateInput('maintenanceMo', v)} format="money" hint="Rule of thumb: 1% of home value annually" />
            <NumberField label="HOA / capex reserve / other" value={i.hoaMo} onChange={(v) => updateInput('hoaMo', v)} format="money" />
          </Section>

          <Section title="Tax">
            <NumberField label="Federal marginal tax rate" value={i.marginalTaxRate} onChange={(v) => updateInput('marginalTaxRate', v)} format="percent" />
            <NumberField label="State income tax rate" value={i.stateTaxRate} onChange={(v) => updateInput('stateTaxRate', v)} format="percent" />
            <NumberField label="Depreciation period (years)" value={i.depreciationYears} onChange={(v) => updateInput('depreciationYears', v)} format="number" hint="27.5 for residential rental, 39 for commercial" />
            <NumberField label="Years already owned" value={i.yearsOwned} onChange={(v) => updateInput('yearsOwned', v)} format="number" />
            <NumberField label="Capital gains tax rate" value={i.capGainsRate} onChange={(v) => updateInput('capGainsRate', v)} format="percent" />
            <NumberField label="Depreciation recapture rate" value={i.deprecRecaptureRate} onChange={(v) => updateInput('deprecRecaptureRate', v)} format="percent" hint="IRS standard: 25%" />
          </Section>

          <Section title="Alternative investment & risk">
            <NumberField label="Stock market return" value={i.stockReturn} onChange={(v) => updateInput('stockReturn', v)} format="percent" hint="S&P 500 long-term avg is ~8.5%" />
            <NumberField label="Inflation rate" value={i.inflation} onChange={(v) => updateInput('inflation', v)} format="percent" />
            <NumberField label="Risk-free rate (10yr Treasury)" value={i.riskFreeRate} onChange={(v) => updateInput('riskFreeRate', v)} format="percent" />
            <NumberField label="Rental return volatility" value={i.rentalVolatility} onChange={(v) => updateInput('rentalVolatility', v)} format="percent" />
            <NumberField label="Stock market volatility" value={i.stockVolatility} onChange={(v) => updateInput('stockVolatility', v)} format="percent" />
            <NumberField label="Selling costs at exit" value={i.sellingCosts} onChange={(v) => updateInput('sellingCosts', v)} format="percent" hint="Agent fees + closing costs, typically 6%" />
            <NumberField label="Risk aversion (1=aggressive, 3=moderate, 5=conservative)" value={i.riskAversion} onChange={(v) => updateInput('riskAversion', v)} format="number" />
          </Section>
        </div>

        <aside className="lg:sticky lg:top-6 lg:self-start">
          <MetricsSidebar inputs={property.inputs} />
        </aside>
      </div>
    </div>
  )
}

function ComputedPi({ inputs }: { inputs: PropertyInputs }) {
  const pi = monthlyPi(inputs.mortgageBalance, inputs.mortgageRate, inputs.loanTermYears)
  return (
    <div className="flex flex-col gap-1">
      <Label className="text-xs text-muted-foreground">Monthly P&amp;I (calculated)</Label>
      <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm font-medium tabular-nums">
        {formatMoney(pi, true)}
      </div>
      <p className="text-xs text-muted-foreground">Principal + interest only. Auto-derived from balance, rate, and term.</p>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">{children}</CardContent>
    </Card>
  )
}
