import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'] as const
const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const

const PANEL_W = 280
const PANEL_H = 340

function pad(n: number) {
  return String(n).padStart(2, '0')
}

/** Store format: YYYY-MM-DD */
export function toIsoDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function fromIsoDate(iso: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null
  const [y, m, day] = iso.split('-').map(Number)
  const d = new Date(y, m - 1, day)
  if (d.getFullYear() !== y || d.getMonth() !== m - 1 || d.getDate() !== day) return null
  return d
}

export function formatDisplay(iso: string): string {
  const d = fromIsoDate(iso)
  if (!d) return ''
  return `${pad(d.getMonth() + 1)}/${pad(d.getDate())}/${d.getFullYear()}`
}

/** Digits only → mm/dd/yyyy with auto-inserted slashes */
export function maskDateInput(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8)
  if (digits.length <= 2) return digits
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`
}

/** Accept mm/dd/yyyy, m/d/yyyy, yyyy-mm-dd */
export function parseTypedDate(raw: string): string | null {
  const v = raw.trim()
  if (!v) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return fromIsoDate(v) ? v : null

  const m = v.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/)
  if (!m) return null
  const month = Number(m[1])
  const day = Number(m[2])
  const year = Number(m[3])
  const d = new Date(year, month - 1, day)
  if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) return null
  return toIsoDate(d)
}

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

type Pos = { top: number; left: number }

function placePanel(anchor: DOMRect): Pos {
  const gap = 8
  const vw = window.innerWidth
  const vh = window.innerHeight

  // Open under the field, anchored to its right side (calendar button)
  let left = anchor.right - PANEL_W
  let top = anchor.bottom + gap

  if (left < 12) left = 12
  if (left + PANEL_W > vw - 12) left = Math.max(12, vw - PANEL_W - 12)

  // Flip above if there isn’t enough room below
  if (top + PANEL_H > vh - 12) {
    top = Math.max(12, anchor.top - PANEL_H - gap)
  }

  return { top, left }
}

type DateFieldProps = {
  id?: string
  value: string
  onChange: (iso: string) => void
  placeholder?: string
  className?: string
  inputClassName?: string
}

export function DateField({
  id,
  value,
  onChange,
  placeholder = 'mm/dd/yyyy',
  className,
  inputClassName,
}: DateFieldProps) {
  const autoId = useId()
  const fieldId = id ?? autoId
  const rootRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<Pos>({ top: 0, left: 0 })
  const [text, setText] = useState(() => (value ? formatDisplay(value) : ''))
  const selected = value ? fromIsoDate(value) : null
  const [view, setView] = useState(() => selected ?? new Date(1990, 0, 1))

  useEffect(() => {
    setText(value ? formatDisplay(value) : '')
    const d = value ? fromIsoDate(value) : null
    if (d) setView(d)
  }, [value])

  useLayoutEffect(() => {
    if (!open || !rootRef.current) return
    function update() {
      if (!rootRef.current) return
      setPos(placePanel(rootRef.current.getBoundingClientRect()))
    }
    update()
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    function onDoc(e: MouseEvent) {
      const t = e.target as Node
      if (rootRef.current?.contains(t)) return
      if (panelRef.current?.contains(t)) return
      setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  function commitText(raw: string) {
    const parsed = parseTypedDate(raw)
    if (parsed) {
      onChange(parsed)
      setText(formatDisplay(parsed))
      return
    }
    if (!raw.trim()) {
      onChange('')
      setText('')
      return
    }
    setText(value ? formatDisplay(value) : raw)
  }

  function pick(day: Date) {
    const iso = toIsoDate(day)
    onChange(iso)
    setText(formatDisplay(iso))
    setOpen(false)
  }

  return (
    <div ref={rootRef} className={cn('relative z-10', open && 'z-[60]', className)}>
      <div className="relative">
        <input
          id={fieldId}
          type="text"
          inputMode="numeric"
          pattern="[0-9/]*"
          autoComplete="bday"
          placeholder={placeholder}
          value={text}
          maxLength={10}
          onChange={(e) => {
            const next = maskDateInput(e.target.value)
            setText(next)
            if (next.length === 10) {
              const parsed = parseTypedDate(next)
              if (parsed) onChange(parsed)
            } else if (!next) {
              onChange('')
            }
          }}
          onBlur={() => commitText(text)}
          onKeyDown={(e) => {
            // Allow control keys, digits, and navigation
            if (
              e.key.length === 1 &&
              !/[0-9]/.test(e.key) &&
              !e.ctrlKey &&
              !e.metaKey &&
              !e.altKey
            ) {
              e.preventDefault()
            }
            if (e.key === 'Enter') {
              e.preventDefault()
              commitText(text)
            }
          }}
          className={cn(
            'flex h-10 w-full rounded-2xl border border-border/60 bg-secondary/30 py-2 pl-3.5 pr-11 text-sm shadow-none transition-colors placeholder:text-muted-foreground focus-visible:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40',
            inputClassName,
          )}
        />
        <button
          type="button"
          aria-label="Open calendar"
          aria-expanded={open}
          onClick={() => {
            setOpen((o) => !o)
            if (selected) setView(selected)
          }}
          className={cn(
            'absolute right-1.5 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full text-muted-foreground transition hover:bg-background hover:text-foreground',
            open && 'bg-background text-accent',
          )}
        >
          <CalendarIcon className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
      </div>

      {open
        ? createPortal(
            <div
              ref={panelRef}
              style={{ top: pos.top, left: pos.left }}
              className="fixed z-[9999] w-[280px] rounded-3xl border border-border/50 bg-card p-4 shadow-[0_24px_60px_-28px_rgba(15,23,42,0.45)] animate-in fade-in zoom-in-95 duration-200"
            >
              <CalendarMonth
                view={view}
                selected={selected}
                onViewChange={setView}
                onSelect={pick}
              />
            </div>,
            document.body,
          )
        : null}
    </div>
  )
}

function CalendarMonth({
  view,
  selected,
  onViewChange,
  onSelect,
}: {
  view: Date
  selected: Date | null
  onViewChange: (d: Date) => void
  onSelect: (d: Date) => void
}) {
  const year = view.getFullYear()
  const month = view.getMonth()
  const today = useMemo(() => new Date(), [])

  const cells = useMemo(() => {
    const first = new Date(year, month, 1)
    const startPad = first.getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const prevDays = new Date(year, month, 0).getDate()
    const items: { date: Date; inMonth: boolean }[] = []

    for (let i = startPad - 1; i >= 0; i--) {
      items.push({ date: new Date(year, month - 1, prevDays - i), inMonth: false })
    }
    for (let d = 1; d <= daysInMonth; d++) {
      items.push({ date: new Date(year, month, d), inMonth: true })
    }
    while (items.length % 7 !== 0 || items.length < 42) {
      const next = items.length - (startPad + daysInMonth) + 1
      items.push({ date: new Date(year, month + 1, next), inMonth: false })
    }
    return items
  }, [year, month])

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-2">
        <button
          type="button"
          aria-label="Previous month"
          onClick={() => onViewChange(new Date(year, month - 1, 1))}
          className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground transition hover:bg-secondary hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" strokeWidth={2} />
        </button>
        <div className="text-center">
          <p className="font-serif text-[15px] leading-none text-foreground">
            {MONTHS[month]} {year}
          </p>
        </div>
        <button
          type="button"
          aria-label="Next month"
          onClick={() => onViewChange(new Date(year, month + 1, 1))}
          className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground transition hover:bg-secondary hover:text-foreground"
        >
          <ChevronRight className="h-4 w-4" strokeWidth={2} />
        </button>
      </div>

      <div className="mb-2 flex gap-1.5">
        <select
          aria-label="Month"
          value={month}
          onChange={(e) => onViewChange(new Date(year, Number(e.target.value), 1))}
          className="h-8 flex-1 rounded-full border border-border/50 bg-secondary/40 px-2.5 text-[12px] text-foreground outline-none focus:ring-2 focus:ring-ring/30"
        >
          {MONTHS.map((m, i) => (
            <option key={m} value={i}>
              {m}
            </option>
          ))}
        </select>
        <select
          aria-label="Year"
          value={year}
          onChange={(e) => onViewChange(new Date(Number(e.target.value), month, 1))}
          className="h-8 w-[88px] rounded-full border border-border/50 bg-secondary/40 px-2.5 text-[12px] text-foreground outline-none focus:ring-2 focus:ring-ring/30"
        >
          {Array.from({ length: 120 }, (_, i) => new Date().getFullYear() - i).map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-1 grid grid-cols-7 gap-0.5">
        {WEEKDAYS.map((d) => (
          <div
            key={d}
            className="grid h-7 place-items-center text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"
          >
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {cells.map(({ date, inMonth }) => {
          const isSelected = selected ? sameDay(date, selected) : false
          const isToday = sameDay(date, today)
          return (
            <button
              key={date.toISOString()}
              type="button"
              onClick={() => onSelect(date)}
              className={cn(
                'grid h-8 w-full place-items-center rounded-full text-[12.5px] transition',
                !inMonth && 'text-muted-foreground/35',
                inMonth && !isSelected && 'text-foreground hover:bg-secondary',
                isToday && !isSelected && 'ring-1 ring-accent/40',
                isSelected && 'bg-primary font-medium text-primary-foreground shadow-sm',
              )}
            >
              {date.getDate()}
            </button>
          )
        })}
      </div>
    </div>
  )
}
