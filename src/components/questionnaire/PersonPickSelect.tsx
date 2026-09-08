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
  if (people.length === 0) return null

  return (
    <select
      defaultValue=""
      onChange={(e) => {
        const name = e.target.value
        if (name) onPick(name)
        e.target.value = ''
      }}
      className={cn(
        'h-9 w-full rounded-xl border border-border/60 bg-background px-3 text-xs text-foreground shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40',
        className,
      )}
      aria-label="Choose someone already named in your will"
    >
      <option value="" disabled>
        Choose someone already named…
      </option>
      {people.map((person) => (
        <option key={`${person.role}-${person.name}`} value={person.name}>
          {person.name} ({person.role})
        </option>
      ))}
    </select>
  )
}
