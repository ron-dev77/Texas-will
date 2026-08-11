import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import PhoneInput, {
  type Country,
  type Labels,
  getCountries,
  getCountryCallingCode,
} from 'react-phone-number-input'
import flags from 'react-phone-number-input/flags'
import en from 'react-phone-number-input/locale/en.json'
import { ChevronsUpDown, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import 'react-phone-number-input/style.css'

type PhoneFieldProps = {
  id?: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export function PhoneField({
  id,
  value,
  onChange,
  placeholder = '(512) 555-0100',
  className,
}: PhoneFieldProps) {
  return (
    <div className={cn('phone-field', className)}>
      <PhoneInput
        id={id}
        international
        defaultCountry="US"
        countryCallingCodeEditable={false}
        countries={getCountries()}
        flags={flags}
        labels={en as Labels}
        countrySelectComponent={CountrySelect}
        value={value || undefined}
        onChange={(v) => onChange(v ?? '')}
        placeholder={placeholder}
        numberInputProps={{
          className: 'PhoneInputInput',
        }}
      />
    </div>
  )
}

type CountryOption = {
  value?: Country
  label: string
  divider?: boolean
}

function FlagIcon({ country, label }: { country: Country; label: string }) {
  const Flag = flags[country]
  if (!Flag) {
    return (
      <span className="grid h-full w-full place-items-center bg-secondary text-[9px] font-semibold">
        {country}
      </span>
    )
  }
  return <Flag title={label} />
}

function CountrySelect({
  value,
  onChange,
  options,
  disabled,
}: {
  value?: Country
  onChange: (value: Country | undefined) => void
  options: CountryOption[]
  iconComponent?: React.ComponentType<{ country: Country; label: string; aspectRatio?: number }>
  disabled?: boolean
}) {
  const country = value ?? 'US'
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const rootRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = options.filter((o) => o.value && !o.divider)
    if (!q) return list
    return list.filter((o) => {
      const code = o.value ? getCountryCallingCode(o.value) : ''
      return (
        o.label.toLowerCase().includes(q) ||
        o.value?.toLowerCase().includes(q) ||
        code.includes(q.replace(/^\+/, ''))
      )
    })
  }, [options, query])

  useLayoutEffect(() => {
    if (!open || !rootRef.current) return
    function update() {
      if (!rootRef.current) return
      const r = rootRef.current.getBoundingClientRect()
      const width = 280
      let left = r.left
      let top = r.bottom + 8
      if (left + width > window.innerWidth - 12) {
        left = Math.max(12, window.innerWidth - width - 12)
      }
      if (top + 320 > window.innerHeight - 12) {
        top = Math.max(12, r.top - 320 - 8)
      }
      setPos({ top, left })
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
    const t = window.setTimeout(() => searchRef.current?.focus(), 10)
    function onDoc(e: MouseEvent) {
      const target = e.target as Node
      if (rootRef.current?.contains(target)) return
      if (panelRef.current?.contains(target)) return
      setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      window.clearTimeout(t)
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  // Keep page from scrolling while the country list is scrolled
  useEffect(() => {
    if (!open) return
    const el = listRef.current
    if (!el) return
    function onWheel(e: WheelEvent) {
      e.preventDefault()
      e.stopPropagation()
      if (el) el.scrollTop += e.deltaY
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [open])

  const selectedLabel =
    options.find((o) => o.value === country)?.label ?? country
  const calling = `+${getCountryCallingCode(country)}`

  return (
    <div ref={rootRef} className="PhoneInputCountry relative">
      <button
        type="button"
        disabled={disabled}
        aria-label="Select country"
        aria-expanded={open}
        onClick={() => {
          setOpen((o) => !o)
          setQuery('')
        }}
        className="PhoneInputCountrySelect flex h-full items-center gap-1.5 rounded-full px-1.5 text-foreground transition hover:bg-background/80"
      >
        <span className="phone-flag inline-flex h-4 w-6 shrink-0 overflow-hidden rounded-[3px] bg-secondary shadow-sm ring-1 ring-border/50">
          <FlagIcon country={country} label={selectedLabel} />
        </span>
        <span className="text-[12px] font-medium tabular-nums text-muted-foreground">{calling}</span>
        <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground/70" strokeWidth={2} />
      </button>

      {open
        ? createPortal(
            <div
              ref={panelRef}
              style={{ top: pos.top, left: pos.left }}
              className="fixed z-[9999] w-[280px] overflow-hidden rounded-2xl border border-border/50 bg-card shadow-[0_24px_60px_-28px_rgba(15,23,42,0.45)] animate-in fade-in zoom-in-95 duration-200"
            >
              <div className="border-b border-border/40 p-2.5">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <input
                    ref={searchRef}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search country"
                    className="h-9 w-full rounded-full border border-border/50 bg-secondary/40 py-1.5 pl-8 pr-3 text-[13px] text-foreground outline-none placeholder:text-muted-foreground focus:bg-background focus:ring-2 focus:ring-ring/30"
                  />
                </div>
              </div>
              <ul
                ref={listRef}
                className="max-h-56 overflow-y-auto overscroll-contain py-1.5"
              >
                {filtered.length === 0 ? (
                  <li className="px-3 py-3 text-center text-[12px] text-muted-foreground">
                    No countries found
                  </li>
                ) : (
                  filtered.map((opt) => {
                    if (!opt.value) return null
                    const active = opt.value === country
                    const code = `+${getCountryCallingCode(opt.value)}`
                    return (
                      <li key={opt.value}>
                        <button
                          type="button"
                          onClick={() => {
                            onChange(opt.value)
                            setOpen(false)
                            setQuery('')
                          }}
                          className={cn(
                            'flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] transition',
                            active
                              ? 'bg-primary text-primary-foreground'
                              : 'text-foreground hover:bg-secondary/70',
                          )}
                        >
                          <span className="phone-flag inline-flex h-4 w-6 shrink-0 overflow-hidden rounded-[3px] bg-secondary shadow-sm ring-1 ring-border/40">
                            <FlagIcon country={opt.value} label={opt.label} />
                          </span>
                          <span className="min-w-0 flex-1 truncate">{opt.label}</span>
                          <span
                            className={cn(
                              'tabular-nums text-[12px]',
                              active ? 'text-primary-foreground/80' : 'text-muted-foreground',
                            )}
                          >
                            {code}
                          </span>
                        </button>
                      </li>
                    )
                  })
                )}
              </ul>
            </div>,
            document.body,
          )
        : null}
    </div>
  )
}
