import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import {
  BUSINESS_OWNER_DETAIL,
  HONESTY_FIRST_FIT_BULLETS,
  WILL_BASED_EDUCATION,
} from '@/lib/outside-counsel'
import { cn } from '@/lib/utils'

export function HonestyFirstSection() {
  const [businessOpen, setBusinessOpen] = useState(false)

  return (
    <div className="overflow-hidden rounded-[2rem] border border-border/70 bg-card shadow-[0_28px_70px_-40px_rgba(15,23,42,0.35)]">
      <div className="relative px-7 py-10 sm:px-10 sm:py-14 lg:px-12">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-16 top-8 h-48 w-48 rounded-full bg-accent/10 blur-3xl"
        />
        <div className="relative text-xs font-semibold uppercase tracking-[0.18em] text-accent">
          Honesty first
        </div>
        <h2 className="relative mt-4 max-w-3xl font-serif text-3xl leading-tight text-foreground sm:text-4xl lg:text-[2.75rem]">
          {WILL_BASED_EDUCATION.title}
        </h2>
        <p className="relative mt-5 max-w-3xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          {WILL_BASED_EDUCATION.body}
        </p>

        <ul className="relative mt-6 max-w-3xl list-disc space-y-2.5 pl-5 text-base leading-relaxed text-foreground sm:text-lg">
          {HONESTY_FIRST_FIT_BULLETS.map((bullet) => (
            <li key={bullet}>{bullet}</li>
          ))}
        </ul>

        <div className="relative mt-6 max-w-3xl overflow-hidden rounded-2xl border border-border/70">
          <button
            type="button"
            onClick={() => setBusinessOpen((v) => !v)}
            className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left text-sm font-medium text-foreground transition hover:bg-secondary/40"
            aria-expanded={businessOpen}
          >
            {BUSINESS_OWNER_DETAIL.title}
            <ChevronDown
              className={cn(
                'h-4 w-4 shrink-0 text-muted-foreground transition',
                businessOpen && 'rotate-180',
              )}
            />
          </button>
          {businessOpen ? (
            <div className="space-y-3 border-t border-border/60 px-4 py-4 text-sm leading-relaxed text-muted-foreground">
              {BUSINESS_OWNER_DETAIL.body.map((paragraph) => (
                <p key={paragraph.slice(0, 40)}>{paragraph}</p>
              ))}
            </div>
          ) : null}
        </div>

        <p className="relative mt-6 max-w-3xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          {WILL_BASED_EDUCATION.closing}
        </p>
      </div>
    </div>
  )
}
