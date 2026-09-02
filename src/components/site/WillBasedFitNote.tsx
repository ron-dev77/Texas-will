import { Link } from 'react-router-dom'
import { ArrowRight, Scale } from 'lucide-react'
import {
  listedOutsideCounselFirms,
  WILL_BASED_EDUCATION,
} from '@/lib/outside-counsel'
import { cn } from '@/lib/utils'

type Props = {
  className?: string
  showFirms?: boolean
  tone?: 'light' | 'dark'
}

export function WillBasedFitNote({ className, showFirms = false, tone = 'light' }: Props) {
  const firms = listedOutsideCounselFirms()
  const dark = tone === 'dark'

  return (
    <div
      className={cn(
        'group relative overflow-hidden text-left transition duration-300',
        dark
          ? 'rounded-[2rem] border border-white/10 bg-white/5 text-primary-foreground'
          : 'rounded-3xl border border-border/70 bg-card shadow-[0_14px_40px_-28px_rgba(15,23,42,0.4)] hover:border-accent/40 hover:shadow-[0_16px_40px_-24px_rgba(15,23,42,0.35)]',
        className,
      )}
    >
      <div
        aria-hidden="true"
        className={cn(
          'absolute inset-x-0 top-0 h-1.5',
          dark ? 'bg-accent/80' : 'bg-accent',
        )}
      />
      {!dark ? (
        <div
          aria-hidden="true"
          className="hero-orb pointer-events-none absolute -right-16 top-0 h-40 w-40 rounded-full bg-accent/10 blur-3xl"
        />
      ) : null}

      <div className="relative px-5 py-6 sm:px-7 sm:py-7">
        <div className="flex items-start gap-4">
          <div
            className={cn(
              'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl transition duration-500',
              dark
                ? 'bg-white/10 text-accent ring-1 ring-white/15'
                : 'bg-secondary text-accent group-hover:bg-accent group-hover:text-accent-foreground',
            )}
          >
            <Scale className="h-5 w-5" strokeWidth={1.75} />
          </div>
          <div className="min-w-0 flex-1">
            <p
              className={cn(
                'text-xs font-medium uppercase tracking-[0.18em]',
                dark ? 'text-accent' : 'text-accent',
              )}
            >
              Honest fit
            </p>
            <h2
              className={cn(
                'mt-2 font-serif text-xl leading-snug tracking-tight sm:text-2xl',
                dark ? 'text-primary-foreground' : 'text-foreground',
              )}
            >
              {WILL_BASED_EDUCATION.title}
            </h2>
          </div>
        </div>

        <p
          className={cn(
            'mt-4 max-w-3xl text-sm leading-relaxed sm:text-base',
            dark ? 'text-primary-foreground/75' : 'text-muted-foreground',
          )}
        >
          {WILL_BASED_EDUCATION.body}
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2">
          <Link
            to="/faq#living-trust"
            className={cn(
              'inline-flex items-center gap-1.5 text-sm font-medium transition hover:gap-2.5',
              dark ? 'text-accent' : 'text-accent',
            )}
          >
            Read the FAQ
            <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
          </Link>
          <Link
            to="/pricing#checkout"
            className={cn(
              'inline-flex items-center gap-1.5 text-sm font-medium transition hover:gap-2.5',
              dark ? 'text-accent' : 'text-accent',
            )}
          >
            Check fit before you pay
            <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
          </Link>
        </div>

        {showFirms ? (
          <ul
            className={cn(
              'mt-6 space-y-3 border-t pt-5',
              dark ? 'border-white/10' : 'border-border/60',
            )}
          >
            {firms.map((firm) => (
              <li key={firm.name}>
                <span
                  className={cn(
                    'font-serif text-base',
                    dark ? 'text-primary-foreground' : 'text-foreground',
                  )}
                >
                  {firm.name}
                </span>
                <span
                  className={cn(
                    'mt-0.5 block text-sm leading-relaxed',
                    dark ? 'text-primary-foreground/70' : 'text-muted-foreground',
                  )}
                >
                  {firm.detail}
                </span>
              </li>
            ))}
            {firms.length < 3 ? (
              <li
                className={cn(
                  'text-sm leading-relaxed',
                  dark ? 'text-primary-foreground/70' : 'text-muted-foreground',
                )}
              >
                Ask Texas AI Law Group, PLLC for two additional Texas estate-planning law firms they
                recommend. We only list private firms a Texas lawyer has named.
              </li>
            ) : null}
          </ul>
        ) : null}
      </div>
    </div>
  )
}
