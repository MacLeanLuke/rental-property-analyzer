import { useRef } from 'react'
import { Copy, Download, GitCompare, Pencil, Plus, Trash2, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { Property } from '@/domain/types'
import { liveMetrics } from '@/domain/metrics'
import { formatMoney, formatPercent } from '@/lib/utils'
import { exportPropertiesJson, importPropertiesJson, newProperty } from '@/domain/storage'
import { track } from '@/lib/analytics'

interface PropertyListProps {
  properties: Property[]
  onAdd: (p: Property) => void
  onEdit: (id: string) => void
  onDelete: (id: string) => void
  onDuplicate: (id: string) => void
  onCompare: () => void
  onImport: (properties: Property[]) => void
}

export function PropertyList({
  properties,
  onAdd,
  onEdit,
  onDelete,
  onDuplicate,
  onCompare,
  onImport,
}: PropertyListProps) {
  const fileRef = useRef<HTMLInputElement>(null)

  const handleImport = async (file: File) => {
    try {
      const imported = await importPropertiesJson(file)
      onImport(imported)
    } catch (err) {
      alert(`Could not import: ${(err as Error).message}`)
    }
  }

  return (
    <div className="mx-auto max-w-6xl p-6">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Rental Property Analyzer</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Compare hold-vs-sell scenarios for your rental properties. Your property data stays on
            your device.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) handleImport(f)
              e.target.value = ''
            }}
          />
          <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
            <Upload /> Import
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              track('backup_exported')
              exportPropertiesJson(properties)
            }}
            disabled={properties.length === 0}
          >
            <Download /> Backup
          </Button>
          <Button
            variant="secondary"
            onClick={onCompare}
            disabled={properties.length < 2}
          >
            <GitCompare /> Compare
          </Button>
          <Button onClick={() => onAdd(newProperty('New property'))}>
            <Plus /> Add property
          </Button>
        </div>
      </header>

      {properties.length === 0 ? (
        <EmptyState onAdd={() => onAdd(newProperty('My first property'))} />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {properties.map((p) => (
            <PropertyCard
              key={p.id}
              property={p}
              onEdit={() => onEdit(p.id)}
              onDelete={() => onDelete(p.id)}
              onDuplicate={() => onDuplicate(p.id)}
            />
          ))}
        </div>
      )}

      <SiteFooter />
    </div>
  )
}

function SiteFooter() {
  return (
    <footer className="mt-12 flex flex-col gap-2 border-t pt-6 text-xs text-muted-foreground">
      <p>
        Your property figures stay in this browser and are never sent anywhere. The app records
        anonymous usage — which screens get opened and which features get used — with no cookies
        and nothing that identifies you.
      </p>
      <p>
        Planning a renovation?{' '}
        <a
          href="https://simplehomebuilds.com"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-foreground underline underline-offset-2 hover:no-underline"
          onClick={() => track('outbound_simple_home_builds')}
        >
          See The Simple Home Build
        </a>
      </p>
    </footer>
  )
}

function PropertyCard({
  property,
  onEdit,
  onDelete,
  onDuplicate,
}: {
  property: Property
  onEdit: () => void
  onDelete: () => void
  onDuplicate: () => void
}) {
  const m = liveMetrics(property.inputs)
  const cashColor = m.monthlyCashFlow >= 0 ? 'text-[color:var(--success)]' : 'text-destructive'
  const verdictVariant =
    m.verdict === 'STRONG_KEEP' || m.verdict === 'KEEP'
      ? 'success'
      : m.verdict === 'HOLD'
        ? 'warning'
        : 'destructive'

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="truncate">{property.nickname}</CardTitle>
          <Badge variant={verdictVariant} className="shrink-0 text-[10px]">
            {m.verdict.replace('_', ' ')}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <Metric label="Monthly cash flow" value={formatMoney(m.monthlyCashFlow, true)} className={cashColor} />
          <Metric label="Cap rate" value={formatPercent(m.capRate)} />
          <Metric label="Current equity" value={formatMoney(m.currentEquity)} />
          <Metric label="NPV @ year 10" value={formatMoney(m.npvAt10)} />
        </div>
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="sm" onClick={onDuplicate} title="Duplicate">
            <Copy />
          </Button>
          <Button variant="ghost" size="sm" onClick={onDelete} title="Delete">
            <Trash2 />
          </Button>
          <Button size="sm" onClick={onEdit}>
            <Pencil /> Edit
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function Metric({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`font-semibold tabular-nums ${className ?? ''}`}>{value}</div>
    </div>
  )
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
        <div className="text-4xl">🏡</div>
        <div>
          <h2 className="text-lg font-semibold">No properties yet</h2>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            Add a rental to see a live hold-vs-sell analysis. Your property data never leaves this
            browser — you can download a full Excel report whenever you want.
          </p>
        </div>
        <Button onClick={onAdd}>
          <Plus /> Add your first property
        </Button>
      </CardContent>
    </Card>
  )
}
