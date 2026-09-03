import { Link, Navigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { Wordmark } from '@/components/site/Wordmark'
import { Button } from '@/components/ui/button'
import {
  computeTotalDollars,
  planPriceDollars,
  spousalTrustAddonDollars,
  trustAddonDollars,
} from '@/lib/pricing'
import {
  estateBracketLabel,
  loadQualifierDraft,
  qualifierComplete,
  showsBlendedFamilyScreen,
} from '@/lib/qualifier'

const INCLUDED = [
  'Texas Last Will and Testament',
  'Attorney review on every order',
  'Texas-specific signing instructions',
  'Next business day PDF delivery',
] as const

export default function Summary() {
  const draft = loadQualifierDraft()
  if (!qualifierComplete(draft)) {
    return <Navigate to="/qualify" replace />
  }

  const includeSpousalTrust = draft.spousalTrustChoice === 'spousal_trust'
  const base = planPriceDollars(draft.plan)
  const total = computeTotalDollars(draft.plan, false, includeSpousalTrust)

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="border-b border-border/60 px-5 py-4">
        <div className="mx-auto flex max-w-[720px] items-center justify-between">
          <Wordmark />
          <Link to="/qualify" className="text-xs text-muted-foreground underline-offset-2 hover:underline">
            Edit answers
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[720px] flex-1 px-5 py-10">
        <h1 className="font-serif text-3xl tracking-tight">Your plan summary</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Review below, then continue to checkout. Plan type is locked.
        </p>

        <div className="mt-8 space-y-4">
          <div className="rounded-2xl border border-border/70 bg-card p-5">
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">Plan</dt>
                <dd className="mt-1 font-medium capitalize">{draft.plan}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">Base price</dt>
                <dd className="mt-1 font-medium">${base}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">Estate size</dt>
                <dd className="mt-1">{estateBracketLabel(draft.estateBracket)}</dd>
              </div>
              {showsBlendedFamilyScreen(draft) ? (
                <div className="sm:col-span-2">
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                    Blended-family choice
                  </dt>
                  <dd className="mt-1 flex flex-wrap items-center gap-2">
                    {includeSpousalTrust ? (
                      <span>Spousal testamentary trust (+${spousalTrustAddonDollars()} provisional)</span>
                    ) : (
                      <span>Keep it simple (included)</span>
                    )}
                    <Link
                      to="/qualify"
                      className="text-xs text-accent underline-offset-2 hover:underline"
                    >
                      Change
                    </Link>
                  </dd>
                </div>
              ) : null}
            </dl>
          </div>

          <div className="rounded-2xl border border-border/70 bg-card p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Included
            </p>
            <ul className="mt-3 space-y-2 text-sm">
              {INCLUDED.map((line) => (
                <li key={line} className="flex gap-2">
                  <span className="text-accent">·</span>
                  {line}
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs text-muted-foreground">
              Optional living trust add-on (+${trustAddonDollars()}) at checkout — separate from spousal
              trust.
            </p>
          </div>

          <div className="rounded-2xl border border-primary/20 bg-primary/5 px-5 py-4">
            <div className="flex items-center justify-between">
              <span className="font-serif text-xl">Total today</span>
              <span className="font-serif text-2xl tabular-nums">${total}</span>
            </div>
          </div>
        </div>

        <Button asChild size="lg" className="mt-8 w-full rounded-full sm:w-auto">
          <Link to="/pricing#checkout">
            Continue to checkout
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </main>
    </div>
  )
}
