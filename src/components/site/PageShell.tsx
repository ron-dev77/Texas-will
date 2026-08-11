import { type ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function PageHero({
  eyebrow,
  title,
  description,
  align = 'left',
  children,
}: {
  eyebrow: string
  title: string
  description?: string
  align?: 'left' | 'center'
  children?: ReactNode
}) {
  return (
    <div
      className={cn(
        'relative overflow-hidden border-b border-border/60 bg-background',
        align === 'center' && 'text-center',
      )}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_oklch(0.94_0.02_85)_0%,_transparent_55%),radial-gradient(circle_at_90%_10%,_oklch(0.9_0.05_45_/_0.22)_0%,_transparent_35%)]"
      />
      <div
        className={cn(
          'relative mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20',
          align === 'center' && 'mx-auto',
        )}
      >
        <div className={cn(align === 'center' ? 'mx-auto max-w-3xl' : 'max-w-3xl')}>
          <div className="text-xs font-medium uppercase tracking-[0.18em] text-accent">
            {eyebrow}
          </div>
          <h1 className="mt-4 font-serif text-4xl leading-[1.08] tracking-tight text-foreground sm:text-5xl lg:text-[3.25rem]">
            {title}
          </h1>
          {description ? (
            <p
              className={cn(
                'mt-5 text-lg leading-relaxed text-muted-foreground',
                align === 'center' && 'mx-auto max-w-2xl',
              )}
            >
              {description}
            </p>
          ) : null}
          {children}
        </div>
      </div>
    </div>
  )
}

export function PageSection({
  children,
  className,
  tone = 'default',
  narrow = false,
}: {
  children: ReactNode
  className?: string
  tone?: 'default' | 'muted'
  narrow?: boolean
}) {
  return (
    <section
      className={cn(
        'w-full',
        tone === 'muted' ? 'bg-secondary/70' : 'bg-background',
        className,
      )}
    >
      <div
        className={cn(
          'mx-auto px-5 sm:px-8',
          narrow ? 'max-w-3xl' : 'max-w-6xl',
        )}
      >
        {children}
      </div>
    </section>
  )
}

export function PageCta({
  title,
  description,
  children,
  dark = false,
}: {
  title: string
  description: string
  children: ReactNode
  dark?: boolean
}) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-[2rem] px-6 py-12 text-center sm:px-10 sm:py-14',
        dark
          ? 'bg-primary text-primary-foreground shadow-[0_28px_70px_-36px_rgba(15,23,42,0.55)]'
          : 'border border-border/70 bg-card shadow-[0_18px_50px_-32px_rgba(15,23,42,0.3)]',
      )}
    >
      {dark ? <div className="absolute inset-x-0 top-0 h-1.5 bg-accent" /> : null}
      <h2
        className={cn(
          'font-serif text-3xl leading-tight sm:text-4xl',
          dark ? 'text-primary-foreground' : 'text-foreground',
        )}
      >
        {title}
      </h2>
      <p
        className={cn(
          'mx-auto mt-3 max-w-xl text-base sm:text-lg',
          dark ? 'text-primary-foreground/75' : 'text-muted-foreground',
        )}
      >
        {description}
      </p>
      <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
        {children}
      </div>
    </div>
  )
}
