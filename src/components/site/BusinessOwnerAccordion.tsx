import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import {
  BUSINESS_OWNER_DETAIL,
  WILL_FIT_REASONS,
  type WillFitId,
} from '@/lib/outside-counsel'
import { cn } from '@/lib/utils'

export function BusinessOwnerAccordion({
  show,
  className,
}: {
  show: boolean
  className?: string
}) {
  const [open, setOpen] = useState(false)
  if (!show) return null

  return (
    <div className={cn('overflow-hidden rounded-xl border border-amber-300/60 bg-amber-50/80', className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-medium text-foreground"
        aria-expanded={open}
      >
        {BUSINESS_OWNER_DETAIL.title}
        <ChevronDown
          className={cn('h-4 w-4 shrink-0 text-muted-foreground transition', open && 'rotate-180')}
        />
      </button>
      {open ? (
        <div className="space-y-3 border-t border-amber-200/80 px-4 py-3.5 text-sm leading-relaxed text-muted-foreground">
          {BUSINESS_OWNER_DETAIL.body.map((paragraph) => (
            <p key={paragraph.slice(0, 40)}>{paragraph}</p>
          ))}
        </div>
      ) : null}
    </div>
  )
}

export function emptyWillFitAnswers(): Record<WillFitId, 'yes' | 'no' | ''> {
  return Object.fromEntries(WILL_FIT_REASONS.map((r) => [r.id, ''])) as Record<
    WillFitId,
    'yes' | 'no' | ''
  >
}
