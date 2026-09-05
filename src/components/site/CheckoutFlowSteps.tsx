import { Link } from 'react-router-dom'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

export type CheckoutFlowStep = 'qualify' | 'summary' | 'pricing'

const STEPS: { id: CheckoutFlowStep; label: string; path: string }[] = [
  { id: 'qualify', label: 'Qualify', path: '/qualify' },
  { id: 'summary', label: 'Summary', path: '/summary' },
  { id: 'pricing', label: 'Pricing', path: '/pricing' },
]

type Props = {
  current: CheckoutFlowStep
  /** Allow clicking completed steps (default true). */
  linkCompleted?: boolean
}

export function CheckoutFlowSteps({ current, linkCompleted = true }: Props) {
  const currentIdx = STEPS.findIndex((s) => s.id === current)
  const trackPct = STEPS.length > 1 ? (currentIdx / (STEPS.length - 1)) * 100 : 0

  return (
    <nav
      aria-label="Order progress"
      className="rounded-2xl border border-border/50 bg-card/70 px-4 py-4 shadow-sm backdrop-blur-sm sm:px-5"
    >
      {/* Mobile: compact label */}
      <p className="mb-3 text-center text-xs text-muted-foreground sm:hidden">
        Step {currentIdx + 1} of {STEPS.length} ·{' '}
        <span className="font-medium text-foreground">{STEPS[currentIdx]?.label}</span>
      </p>

      <div className="relative">
        {/* Track behind circles */}
        <div
          aria-hidden
          className="absolute left-[calc(100%/6)] right-[calc(100%/6)] top-[13px] h-[3px] rounded-full bg-secondary sm:left-[14%] sm:right-[14%]"
        >
          <div
            className="h-full rounded-full bg-accent transition-[width] duration-500 ease-out"
            style={{ width: `${trackPct}%` }}
          />
        </div>

        <ol className="relative flex items-start justify-between">
          {STEPS.map((step, idx) => {
            const done = idx < currentIdx
            const active = idx === currentIdx
            const canLink = linkCompleted && done

            const circle = (
              <span
                className={cn(
                  'relative z-10 flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-semibold transition-all duration-300',
                  done && 'bg-accent text-accent-foreground shadow-sm',
                  active && 'bg-primary text-primary-foreground shadow-md ring-[3px] ring-accent/25',
                  !done && !active && 'border-2 border-border/80 bg-background text-muted-foreground',
                )}
              >
                {done ? <Check className="h-3.5 w-3.5" strokeWidth={2.5} /> : idx + 1}
              </span>
            )

            const label = (
              <span
                className={cn(
                  'mt-2 block text-center text-[11px] leading-tight sm:text-xs',
                  active && 'font-semibold text-foreground',
                  done && 'font-medium text-accent',
                  !done && !active && 'text-muted-foreground',
                )}
              >
                {step.label}
              </span>
            )

            return (
              <li key={step.id} className="flex w-[33%] flex-col items-center">
                {canLink ? (
                  <Link
                    to={step.path}
                    className="flex flex-col items-center transition-opacity hover:opacity-85"
                    aria-current={active ? 'step' : undefined}
                  >
                    {circle}
                    <span className="hidden sm:block">{label}</span>
                  </Link>
                ) : (
                  <div className="flex flex-col items-center" aria-current={active ? 'step' : undefined}>
                    {circle}
                    <span className="hidden sm:block">{label}</span>
                  </div>
                )}
              </li>
            )
          })}
        </ol>
      </div>
    </nav>
  )
}
