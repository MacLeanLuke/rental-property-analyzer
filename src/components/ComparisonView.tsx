import { useMemo, useState } from 'react'
import { ArrowLeft, Download } from 'lucide-react'
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { Property } from '@/domain/types'
import { exitFlows, hurdleRate, liveMetrics, npv, PROJECTION_YEARS, simulate } from '@/domain/metrics'
import { formatMoney, formatPercent } from '@/lib/utils'
import { track } from '@/lib/analytics'

interface ComparisonViewProps {
  properties: Property[]
  onBack: () => void
}

const COLORS = ['#1F4E79', '#C65911', '#548235', '#7030A0', '#BF9000', '#2E75B6', '#C00000']

export function ComparisonView({ properties, onBack }: ComparisonViewProps) {
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(properties.slice(0, Math.min(4, properties.length)).map((p) => p.id)),
  )
  const [downloading, setDownloading] = useState(false)

  const chosen = properties.filter((p) => selected.has(p.id))

  const npvSeries = useMemo(() => {
    const perProperty = chosen.map((p) => {
      const rows = simulate(p.inputs, PROJECTION_YEARS)
      const rate = hurdleRate(p.inputs)
      return {
        id: p.id,
        nickname: p.nickname,
        values: Array.from({ length: PROJECTION_YEARS }, (_, idx) => {
          const flows = exitFlows(rows, p.inputs, idx + 1)
          return npv(rate, flows)
        }),
      }
    })
    return Array.from({ length: PROJECTION_YEARS }, (_, i) => {
      const entry: Record<string, number | string> = { year: i + 1 }
      perProperty.forEach((s) => {
        entry[s.nickname] = s.values[i]
      })
      return entry
    })
  }, [chosen])

  const download = async () => {
    if (chosen.length === 0) return
    setDownloading(true)
    try {
      track('comparison_excel_downloaded')
      const { buildComparisonWorkbook, downloadWorkbook } = await import('@/domain/xlsx')
      const wb = await buildComparisonWorkbook(chosen)
      await downloadWorkbook(wb, `comparison_${chosen.length}_properties.xlsx`)
    } finally {
      setDownloading(false)
    }
  }

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="mx-auto max-w-7xl p-6">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft /> Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Compare properties</h1>
            <p className="text-sm text-muted-foreground">
              Side-by-side metrics and NPV projections for every selected property.
            </p>
          </div>
        </div>
        <Button onClick={download} disabled={downloading || chosen.length < 1}>
          <Download /> {downloading ? 'Generating…' : 'Download comparison Excel'}
        </Button>
      </header>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-sm text-muted-foreground">Select properties to compare</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {properties.map((p) => (
            <button
              key={p.id}
              onClick={() => toggle(p.id)}
              className={`rounded-full border px-3 py-1 text-xs transition-colors cursor-pointer ${
                selected.has(p.id)
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-background hover:bg-accent'
              }`}
            >
              {p.nickname}
            </button>
          ))}
        </CardContent>
      </Card>

      {chosen.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Select one or more properties above to compare.
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-6">
          <ComparisonTable properties={chosen} />
          <Card>
            <CardHeader>
              <CardTitle className="text-base">NPV by exit year</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-96 w-full">
                <ResponsiveContainer>
                  <LineChart data={npvSeries} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis
                      dataKey="year"
                      stroke="var(--muted-foreground)"
                      label={{ value: 'Exit year', position: 'insideBottom', offset: -4 }}
                    />
                    <YAxis
                      stroke="var(--muted-foreground)"
                      tickFormatter={(v) => formatMoney(v).replace('$', '$')}
                      width={80}
                    />
                    <Tooltip
                      formatter={(v) => formatMoney(Number(v))}
                      contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)' }}
                    />
                    <Legend />
                    {chosen.map((p, i) => (
                      <Line
                        key={p.id}
                        type="monotone"
                        dataKey={p.nickname}
                        stroke={COLORS[i % COLORS.length]}
                        strokeWidth={2}
                        dot={false}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                NPV = today&apos;s dollar value of keeping the property vs selling and investing in stocks,
                using each property&apos;s own hurdle rate. The year a line crosses zero is the break-even
                holding period for that property.
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

function ComparisonTable({ properties }: { properties: Property[] }) {
  const rows: Array<[string, (p: Property) => string, (p: Property) => number | null]> = [
    ['Current value', (p) => formatMoney(p.inputs.currentValue), (p) => p.inputs.currentValue],
    ['Mortgage balance', (p) => formatMoney(p.inputs.mortgageBalance), (p) => p.inputs.mortgageBalance],
    ['Current equity', (p) => formatMoney(liveMetrics(p.inputs).currentEquity), (p) => liveMetrics(p.inputs).currentEquity],
    ['Monthly cash flow', (p) => formatMoney(liveMetrics(p.inputs).monthlyCashFlow, true), (p) => liveMetrics(p.inputs).monthlyCashFlow],
    ['Cap rate', (p) => formatPercent(liveMetrics(p.inputs).capRate), (p) => liveMetrics(p.inputs).capRate],
    ['Cash-on-cash', (p) => formatPercent(liveMetrics(p.inputs).cashOnCash), (p) => liveMetrics(p.inputs).cashOnCash],
    ['Hurdle rate', (p) => formatPercent(liveMetrics(p.inputs).hurdleRate), () => null],
    ['NPV at year 10', (p) => formatMoney(liveMetrics(p.inputs).npvAt10), (p) => liveMetrics(p.inputs).npvAt10],
    ['IRR at year 10', (p) => formatPercent(liveMetrics(p.inputs).irrAt10), (p) => liveMetrics(p.inputs).irrAt10],
    ['Verdict', (p) => liveMetrics(p.inputs).verdict.replace('_', ' '), () => null],
  ]

  const bestOf = (fn: (p: Property) => number | null): string | null => {
    const values = properties
      .map((p) => ({ id: p.id, v: fn(p) }))
      .filter((x): x is { id: string; v: number } => x.v !== null && Number.isFinite(x.v))
    if (values.length === 0) return null
    const best = values.reduce((a, b) => (b.v > a.v ? b : a))
    return best.id
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Metrics side-by-side</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="p-2 text-left font-medium text-muted-foreground">Metric</th>
                {properties.map((p) => (
                  <th key={p.id} className="p-2 text-left font-medium">
                    {p.nickname}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(([label, fmt, num]) => {
                const bestId = bestOf(num)
                return (
                  <tr key={label} className="border-b">
                    <td className="p-2 text-xs text-muted-foreground">{label}</td>
                    {properties.map((p) => {
                      const isBest = bestId === p.id
                      return (
                        <td key={p.id} className="p-2 tabular-nums">
                          <span className={isBest ? 'font-semibold' : ''}>{fmt(p)}</span>
                          {isBest && (
                            <Badge variant="success" className="ml-2 text-[9px]">
                              best
                            </Badge>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
