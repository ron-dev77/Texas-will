import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export type VersionRow = {
  id: string
  version_no: number
  note: string | null
  created_at: string
  is_active: boolean
}

export function VersionList({
  versions,
  onLoad,
  onActivate,
  loadingId,
  emptyLabel = 'No saved drafts yet.',
  className,
}: {
  versions: VersionRow[]
  onLoad: (id: string) => void
  onActivate: (id: string) => void
  loadingId?: string | null
  emptyLabel?: string
  className?: string
}) {
  if (versions.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyLabel}</p>
  }
  return (
    <ul className={cn('grid gap-2 sm:grid-cols-2 xl:grid-cols-3', className)}>
      {versions.map((v) => (
        <li
          key={v.id}
          className={cn(
            'flex flex-col gap-3 rounded-2xl border bg-card p-3.5 shadow-[0_1px_0_rgba(15,23,42,0.03)]',
            v.is_active ? 'border-emerald-600/40 ring-1 ring-emerald-600/20' : 'border-border',
          )}
        >
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium">Draft v{v.version_no}</span>
              {v.is_active ? (
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-900">
                  Active
                </span>
              ) : null}
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {new Date(v.created_at).toLocaleString(undefined, {
                dateStyle: 'medium',
                timeStyle: 'short',
              })}
            </p>
            {v.note ? (
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{v.note}</p>
            ) : (
              <p className="mt-1 text-xs text-muted-foreground/70">No note</p>
            )}
          </div>
          <div className="mt-auto flex flex-wrap gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 rounded-full"
              onClick={() => onLoad(v.id)}
              disabled={loadingId === v.id}
            >
              {loadingId === v.id ? 'Loading…' : 'View / edit'}
            </Button>
            {v.is_active ? (
              <span className="inline-flex h-8 items-center px-2 text-xs font-medium text-emerald-800">
                In use
              </span>
            ) : (
              <Button
                type="button"
                size="sm"
                className="h-8 rounded-full"
                onClick={() => onActivate(v.id)}
              >
                Set active
              </Button>
            )}
          </div>
        </li>
      ))}
    </ul>
  )
}
