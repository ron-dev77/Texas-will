import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

const MOST_POPULAR = (
  <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
    Most Popular
  </span>
)

type PlanPairCardsProps = {
  /** Light page surface vs cards sitting on a dark navy band */
  surface?: 'light' | 'onDark'
  className?: string
  /** Tighter padding for sidebar / compact layouts */
  compact?: boolean
  /** Force a single column (e.g. narrow sidebar) */
  stack?: boolean
}

/**
 * Equal-weight Individual + Couples plan cards.
 * Couples is nudged only with a thin outlined "Most Popular" tag — no fill hierarchy.
 */
export function PlanPairCards({
  surface = 'light',
  className,
  compact = false,
  stack = false,
}: PlanPairCardsProps) {
  const onDark = surface === 'onDark'
  const pad = compact ? 'px-5 py-5' : 'px-6 py-6'
  const priceSize = compact
    ? 'font-serif text-4xl font-semibold leading-none'
    : 'font-serif text-4xl font-semibold leading-none sm:text-5xl'

  const cardClass = cn(
    'group rounded-2xl border text-left transition duration-300 hover:-translate-y-1',
    pad,
    onDark
      ? 'border-white/10 bg-white text-foreground shadow-lg hover:shadow-xl'
      : 'border-border/80 bg-card text-foreground shadow-[0_8px_30px_-18px_rgba(15,23,42,0.35)] hover:border-accent/40 hover:shadow-[0_18px_40px_-20px_rgba(15,23,42,0.35)]',
  )

  return (
    <div className={cn('grid gap-3', stack ? 'grid-cols-1' : 'sm:grid-cols-2', className)}>
      <Link to="/pricing?plan=individual#checkout" className={cardClass}>
        <div className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Individual
        </div>
        <div className="mt-1 flex items-end gap-1.5">
          <span className={priceSize}>$249</span>
          <span className="mb-1 text-sm font-medium text-accent">flat</span>
        </div>
        <div className="mt-2 flex items-center gap-1 text-sm text-muted-foreground transition group-hover:text-foreground sm:mt-3">
          Start my will
          <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1 sm:h-4 sm:w-4" />
        </div>
      </Link>

      <Link to="/pricing?plan=couples#checkout" className={cardClass}>
        <div className="flex items-center justify-between gap-2">
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Couples
          </div>
          {MOST_POPULAR}
        </div>
        <div className="mt-1 flex items-end gap-1.5">
          <span className={priceSize}>$399</span>
          <span className="mb-1 text-sm font-medium text-accent">flat</span>
        </div>
        <div className="mt-2 flex items-center gap-1 text-sm text-muted-foreground transition group-hover:text-foreground sm:mt-3">
          Start our wills
          <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1 sm:h-4 sm:w-4" />
        </div>
      </Link>
    </div>
  )
}
