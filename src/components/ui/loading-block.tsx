import { cn } from '@/lib/utils'

/** Soft shimmer bar for loading placeholders. */
export function LoadingBar({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-gradient-to-r from-secondary via-muted to-secondary bg-[length:200%_100%]',
        className,
      )}
    />
  )
}

/** Full-page / panel loading placeholder (order detail, etc.). */
export function PageLoadingEffect({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="space-y-5 py-2" aria-busy="true" aria-label={label}>
      <div className="space-y-3">
        <LoadingBar className="h-3 w-24" />
        <LoadingBar className="h-8 w-64 max-w-full" />
        <LoadingBar className="h-3 w-40" />
      </div>
      <div className="flex gap-2">
        <LoadingBar className="h-9 w-28" />
        <LoadingBar className="h-9 w-28" />
        <LoadingBar className="h-9 w-24" />
        <LoadingBar className="h-9 w-24" />
      </div>
      <div className="space-y-3 rounded-2xl border border-border/60 bg-card p-4">
        <LoadingBar className="h-4 w-32" />
        <LoadingBar className="h-24 w-full" />
        <LoadingBar className="h-24 w-full" />
        <LoadingBar className="h-16 w-[75%]" />
      </div>
    </div>
  )
}

/** PDF / document preview loading effect. */
export function PreviewLoadingEffect({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'relative flex h-[36rem] flex-col items-center justify-center gap-4 overflow-hidden bg-[#f7f3ea]',
        className,
      )}
      aria-busy="true"
      aria-label="Building preview"
    >
      <div className="w-[min(100%,28rem)] space-y-3 rounded-sm border border-black/5 bg-white/80 p-8 shadow-sm">
        <LoadingBar className="mx-auto h-3 w-40" />
        <LoadingBar className="h-2.5 w-full" />
        <LoadingBar className="h-2.5 w-full" />
        <LoadingBar className="h-2.5 w-5/6" />
        <LoadingBar className="mt-4 h-2.5 w-full" />
        <LoadingBar className="h-2.5 w-4/5" />
        <LoadingBar className="h-2.5 w-full" />
        <LoadingBar className="mt-6 h-8 w-48" />
      </div>
      <p className="text-xs text-muted-foreground">Preparing document preview…</p>
    </div>
  )
}
