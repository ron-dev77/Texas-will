import { type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { FileText, Scale, Shield } from 'lucide-react'
import { cn } from '@/lib/utils'

const LEGAL_NAV = [
  { to: '/terms', label: 'Terms', Icon: FileText },
  { to: '/privacy', label: 'Privacy', Icon: Shield },
  { to: '/disclaimer', label: 'Disclaimer', Icon: Scale },
] as const

type Section = {
  id: string
  title: string
  body: ReactNode
}

type Props = {
  eyebrow: string
  title: string
  updated: string
  summary: string
  sections: Section[]
  activePath: '/terms' | '/privacy' | '/disclaimer'
}

export function LegalPage({
  eyebrow,
  title,
  updated,
  summary,
  sections,
  activePath,
}: Props) {
  return (
    <div className="relative overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(ellipse_at_top,_oklch(0.94_0.02_85)_0%,_transparent_65%),radial-gradient(circle_at_85%_0%,_oklch(0.9_0.05_45_/_0.18)_0%,_transparent_40%)]"
      />

      <div className="relative mx-auto max-w-6xl px-5 pb-20 pt-14 sm:px-8 sm:pb-28 sm:pt-20">
        <div className="max-w-3xl">
          <div className="text-xs font-medium uppercase tracking-[0.18em] text-accent">
            {eyebrow}
          </div>
          <h1 className="mt-4 font-serif text-4xl leading-[1.08] tracking-tight text-foreground sm:text-5xl">
            {title}
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-muted-foreground">{summary}</p>
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <span className="inline-flex rounded-full border border-border/80 bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
              Last updated: {updated}
            </span>
            <span className="inline-flex rounded-full border border-border/80 bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
              My AI Will · Texas
            </span>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap gap-2">
          {LEGAL_NAV.map(({ to, label, Icon }) => {
            const active = to === activePath
            return (
              <Link
                key={to}
                to={to}
                className={cn(
                  'inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm transition',
                  active
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'border border-border/80 bg-card text-muted-foreground hover:border-accent/40 hover:text-foreground',
                )}
              >
                <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
                {label}
              </Link>
            )
          })}
        </div>

        <div className="mt-12 grid gap-10 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-14">
          <aside className="hidden lg:block">
            <div className="sticky top-28 rounded-2xl border border-border/70 bg-card/80 p-5 shadow-[0_12px_40px_-28px_rgba(15,23,42,0.28)] backdrop-blur-sm">
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                On this page
              </div>
              <nav aria-label="Sections" className="mt-4 space-y-1">
                {sections.map((section, i) => (
                  <a
                    key={section.id}
                    href={`#${section.id}`}
                    className="flex items-start gap-2.5 rounded-xl px-2.5 py-2 text-sm text-muted-foreground transition hover:bg-secondary hover:text-foreground"
                  >
                    <span className="mt-0.5 font-serif text-xs text-accent">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className="leading-snug">{section.title}</span>
                  </a>
                ))}
              </nav>
            </div>
          </aside>

          <div className="space-y-4">
            {sections.map((section, i) => (
              <section
                key={section.id}
                id={section.id}
                className="scroll-mt-28 rounded-3xl border border-border/70 bg-card p-6 shadow-[0_12px_40px_-28px_rgba(15,23,42,0.22)] sm:p-8"
              >
                <div className="flex items-start gap-4">
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary font-serif text-sm font-semibold text-accent">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2 className="font-serif text-xl leading-snug text-foreground sm:text-2xl">
                      {section.title}
                    </h2>
                    <div className="mt-3 space-y-3 text-sm leading-relaxed text-muted-foreground sm:text-base [&_strong]:font-semibold [&_strong]:text-foreground">
                      {section.body}
                    </div>
                  </div>
                </div>
              </section>
            ))}

            <div className="rounded-3xl border border-border/70 bg-secondary/50 p-6 sm:p-8">
              <h2 className="font-serif text-xl text-foreground">Questions about this page?</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:text-base">
                Email{' '}
                <a
                  href="mailto:scott@myaiwill.com"
                  className="font-medium text-foreground underline underline-offset-4"
                >
                  scott@myaiwill.com
                </a>
                . We reply personally during Texas business hours.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
