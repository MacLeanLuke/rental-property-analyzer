import { useEffect, useState } from 'react'
import { PropertyList } from '@/components/PropertyList'
import { PropertyForm } from '@/components/PropertyForm'
import { ComparisonView } from '@/components/ComparisonView'
import type { Property } from '@/domain/types'
import { loadProperties, newProperty, saveProperties } from '@/domain/storage'
import { track } from '@/lib/analytics'

type View = { kind: 'list' } | { kind: 'edit'; id: string } | { kind: 'compare' }

function App() {
  const [properties, setProperties] = useState<Property[]>(() => loadProperties())
  const [view, setView] = useState<View>({ kind: 'list' })

  useEffect(() => {
    saveProperties(properties)
  }, [properties])

  const editing = view.kind === 'edit' ? properties.find((p) => p.id === view.id) : undefined

  // If the edited property has been deleted, fall back to list.
  useEffect(() => {
    if (view.kind === 'edit' && !editing) setView({ kind: 'list' })
  }, [view, editing])

  const handleAdd = (p: Property) => {
    track('property_added')
    setProperties((prev) => [...prev, p])
    setView({ kind: 'edit', id: p.id })
  }

  const handleChange = (next: Property) => {
    setProperties((prev) => prev.map((p) => (p.id === next.id ? next : p)))
  }

  const handleDelete = (id: string) => {
    const victim = properties.find((p) => p.id === id)
    if (!victim) return
    if (!confirm(`Delete "${victim.nickname}"? This can't be undone.`)) return
    setProperties((prev) => prev.filter((p) => p.id !== id))
  }

  const handleDuplicate = (id: string) => {
    const source = properties.find((p) => p.id === id)
    if (!source) return
    const copy = newProperty(`${source.nickname} (copy)`, { ...source.inputs })
    setProperties((prev) => [...prev, copy])
  }

  const handleImport = (imported: Property[]) => {
    track('backup_imported')
    const ids = new Set(properties.map((p) => p.id))
    const merged = [...properties]
    for (const p of imported) {
      if (ids.has(p.id)) {
        // Replace existing entry to keep the latest import authoritative.
        const idx = merged.findIndex((x) => x.id === p.id)
        merged[idx] = p
      } else {
        merged.push(p)
      }
    }
    setProperties(merged)
  }

  if (view.kind === 'compare') {
    return <ComparisonView properties={properties} onBack={() => setView({ kind: 'list' })} />
  }

  if (view.kind === 'edit' && editing) {
    return (
      <PropertyForm
        property={editing}
        onChange={handleChange}
        onBack={() => setView({ kind: 'list' })}
      />
    )
  }

  return (
    <PropertyList
      properties={properties}
      onAdd={handleAdd}
      onEdit={(id) => setView({ kind: 'edit', id })}
      onDelete={handleDelete}
      onDuplicate={handleDuplicate}
      onCompare={() => {
        track('comparison_opened')
        setView({ kind: 'compare' })
      }}
      onImport={handleImport}
    />
  )
}

export default App
