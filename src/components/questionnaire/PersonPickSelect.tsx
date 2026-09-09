import { useEffect, useId, useRef, useState } from 'react'
import { ChevronDown, UserRound } from 'lucide-react'
import type { NamedPerson } from '@/lib/questionnaire-people'
import { cn } from '@/lib/utils'

export function PersonPickSelect({
  people,
  onPick,
  className,
}: {
  people: readonly NamedPerson[]
  onPick: (name: string) => void
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const listId = useId()

  useEffect(() => {
    if (!open) return
    function onDocClick(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  if (people.length === 0) return null

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={listId}
        aria-haspopup="listbox"
        onClick={() => setOpen((value) => !value)}
        className={cn(
          'flex h-10 w-full items-center gap-2.5 rounded-xl border px-3 text-left text-sm transition',
          'border-accent/30 bg-accent/[0.05] text-foreground',
          'hover:border-accent/45 hover:bg-accent/[0.09]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 focus-visible:ring-offset-1',
          open && 'border-accent/50 bg-accent/[0.09] ring-2 ring-accent/20 ring-offset-1',
        )}
      >
        <UserRound className="h-4 w-4 shrink-0 text-accent" strokeWidth={1.75} aria-hidden />
        <span className="min-w-0 flex-1 truncate font-medium">Use a name from earlier steps</span>
        <ChevronDown
          className={cn(
            'h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200',
            open && 'rotate-180',
          )}
          strokeWidth={2}
          aria-hidden
        />
      </button>

      {open ? (
        <ul
          id={listId}
          role="listbox"
          aria-label="People already named in your will"
          className="absolute left-0 right-0 top-[calc(100%+0.375rem)] z-30 max-h-60 overflow-y-auto rounded-xl border border-border/70 bg-card p-1.5 shadow-[0_16px_40px_-20px_rgba(15,23,42,0.45)]"
        >
          {people.map((person) => (
            <li key={`${person.role}-${person.name}`}>
              <button
                type="button"
                role="option"
                onClick={() => {
                  onPick(person.name)
                  setOpen(false)
                }}
                className="flex w-full flex-col rounded-lg px-3 py-2.5 text-left transition hover:bg-accent/10 active:bg-accent/15"
              >
                <span className="text-sm font-medium leading-snug text-foreground">{person.name}</span>
                <span className="mt-0.5 text-xs leading-snug text-muted-foreground">{person.role}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
