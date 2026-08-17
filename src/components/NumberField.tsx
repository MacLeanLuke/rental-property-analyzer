import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

export type FieldFormat = 'money' | 'percent' | 'number'

interface NumberFieldProps {
  label: string
  value: number
  onChange: (value: number) => void
  format?: FieldFormat
  step?: number
  hint?: string
  className?: string
  min?: number
  max?: number
}

/**
 * NumberField handles the conversion between display format (e.g. "5.25%")
 * and the stored decimal value (0.0525). Users type what they mean; we parse.
 */
export function NumberField({
  label,
  value,
  onChange,
  format = 'number',
  step,
  hint,
  className,
  min,
  max,
}: NumberFieldProps) {
  const toDisplay = (v: number): string => {
    if (!Number.isFinite(v)) return ''
    if (format === 'percent') return (v * 100).toString()
    return v.toString()
  }

  const [text, setText] = useState(() => toDisplay(value))
  const [lastValue, setLastValue] = useState(value)

  // Keep the text in sync when `value` changes from outside (a reset, or a
  // preset being applied). Adjusting during render rather than in an effect is
  // React's documented pattern for this: the component re-renders immediately
  // with the corrected text instead of painting the stale value first and
  // fixing it after commit.
  if (value !== lastValue) {
    setLastValue(value)
    setText(toDisplay(value))
  }

  const commit = (raw: string) => {
    const trimmed = raw.trim().replace(/[$,%]/g, '')
    if (trimmed === '') {
      onChange(0)
      return
    }
    const n = Number(trimmed)
    if (!Number.isFinite(n)) return
    const next = format === 'percent' ? n / 100 : n
    if (min !== undefined && next < min) return
    if (max !== undefined && next > max) return
    onChange(next)
  }

  const prefix = format === 'money' ? '$' : null
  const suffix = format === 'percent' ? '%' : null

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="relative">
        {prefix && (
          <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
            {prefix}
          </span>
        )}
        <Input
          type="text"
          inputMode="decimal"
          value={text}
          step={step}
          onChange={(e) => {
            setText(e.target.value)
            commit(e.target.value)
          }}
          onBlur={() => setText(toDisplay(value))}
          className={cn(prefix && 'pl-6', suffix && 'pr-7')}
        />
        {suffix && (
          <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
            {suffix}
          </span>
        )}
      </div>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}
