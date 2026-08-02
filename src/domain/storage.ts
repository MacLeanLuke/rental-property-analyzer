import type { Property, PropertyInputs } from './types'
import { propertyArraySchema } from './schema'
import { blankInputs } from './defaults'

const STORAGE_KEY = 'rental-analyzer:properties:v1'

export function loadProperties(): Property[] {
  if (typeof localStorage === 'undefined') return []
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    const result = propertyArraySchema.safeParse(parsed)
    if (!result.success) return []
    return result.data
  } catch {
    return []
  }
}

export function saveProperties(properties: Property[]): void {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(properties))
}

export function newProperty(nickname = 'New property', inputs?: PropertyInputs): Property {
  const now = Date.now()
  return {
    id: crypto.randomUUID(),
    nickname,
    createdAt: now,
    updatedAt: now,
    inputs: inputs ?? blankInputs(),
  }
}

export function exportPropertiesJson(properties: Property[]): void {
  const blob = new Blob([JSON.stringify(properties, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `rental-analyzer-backup-${new Date().toISOString().slice(0, 10)}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export async function importPropertiesJson(file: File): Promise<Property[]> {
  const text = await file.text()
  const parsed = JSON.parse(text)
  const result = propertyArraySchema.safeParse(parsed)
  if (!result.success) throw new Error('Invalid backup file')
  return result.data
}
