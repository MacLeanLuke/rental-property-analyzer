import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { liveMetrics, type LiveMetrics } from '@/domain/metrics'
import type { PropertyInputs } from '@/domain/types'
import { formatMoney, formatPercent } from '@/lib/utils'

function verdictVariant(v: LiveMetrics['verdict']) {
  switch (v) {
    case 'STRONG_KEEP':
      return 'success' as const
    case 'KEEP':
      return 'success' as const
    case 'HOLD':
      return 'warning' as const
    case 'SELL':
      return 'destructive' as const
  }
}

export function MetricsSidebar({ inputs }: { inputs: PropertyInputs }) {
  const m = liveMetrics(inputs)
  const items: Array<[string, string, string | null]> = [
    ['Monthly cash flow', formatMoney(m.monthlyCashFlow, true), m.monthlyCashFlow >= 0 ? 'Positive' : 'Negative'],
    ['Annual cash flow', formatMoney(m.annualCashFlow), null],
    ['Cap rate', formatPercent(m.capRate), null],
    ['Cash-on-cash', formatPercent(m.cashOnCash), null],
    ['Current equity', formatMoney(m.currentEquity), null],
    ['Net proceeds if sold today', formatMoney(m.netProceedsToday), null],
    ['Hurdle rate (CAPM)', formatPercent(m.hurdleRate), null],
    ['NPV at year 10', formatMoney(m.npvAt10), m.npvAt10 >= 0 ? 'Beats hurdle' : 'Below hurdle'],
    ['IRR at year 10', formatPercent(m.irrAt10), null],
    ['Equity at year 10', formatMoney(m.equityAt10), null],
  ]

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm text-muted-foreground">Verdict</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <Badge variant={verdictVariant(m.verdict)} className="self-start text-xs">
            {m.verdict.replace('_', ' ')}
          </Badge>
          <p className="text-sm">{m.verdictLabel}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm text-muted-foreground">Live metrics</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {items.map(([label, val, sub]) => (
            <div key={label} className="flex justify-between gap-3">
              <div>
                <div className="text-xs text-muted-foreground">{label}</div>
                {sub && <div className="text-[10px] text-muted-foreground">{sub}</div>}
              </div>
              <div className="text-sm font-semibold tabular-nums">{val}</div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
