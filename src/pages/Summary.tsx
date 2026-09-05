import { type ReactNode } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { ArrowRight, BadgeCheck, Pencil } from 'lucide-react'
import { CheckoutFlowShell } from '@/components/site/CheckoutFlowShell'
import { CheckoutFlowSteps } from '@/components/site/CheckoutFlowSteps'
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
  type PriorKidsScope,
  type QualifierMaritalStatus,
} from '@/lib/qualifier'
import { cn } from '@/lib/utils'

const INCLUDED = [
  'Texas Last Will and Testament',
  'Attorney review on every order',
  'Texas signing instructions',
  'Next business day PDF delivery',
] as const

const MARITAL_LABEL: Record<QualifierMaritalStatus, string> = {
  married: 'Married',
  domestic_partnership: 'Domestic partnership',
  single: 'Single',
  divorced: 'Divorced',
  widowed: 'Widowed',
}

const PRIOR_KIDS_SCOPE_LABEL: Record<PriorKidsScope, string> = {
  me: 'Mine only',
  partner: "Partner's only",
  both: 'Both of us',
}

function AnswerChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-background/80 px-3.5 py-3">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-medium leading-snug text-foreground">{value}</p>
    </div>
  )
}

function ReceiptLine({
  label,
  amount,
  note,
  action,
  accent,
}: {
  label: string
  amount: string
  note?: string
  action?: ReactNode
  accent?: boolean
}) {
  return (
    <div
      className={cn(
        'flex items-start justify-between gap-4 py-3',
        accent && 'rounded-xl bg-amber-50/80 px-3 -mx-3',
      )}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-foreground">{label}</span>
          {action}
        </div>
        {note ? <p className="mt-0.5 text-xs text-muted-foreground">{note}</p> : null}
      </div>
      <span className="shrink-0 text-sm font-medium tabular-nums text-foreground">{amount}</span>
    </div>
  )
}

export default function Summary() {
  const draft = loadQualifierDraft()
  if (!qualifierComplete(draft)) {
    return <Navigate to="/qualify" replace />
  }

  const includeSpousalTrust = draft.spousalTrustChoice === 'spousal_trust'
  const base = planPriceDollars(draft.plan)
  const spousalAddon = includeSpousalTrust ? spousalTrustAddonDollars() : 0
  const total = computeTotalDollars(draft.plan, false, includeSpousalTrust)
  const isCouples = draft.plan === 'couples'
  const planLabel = isCouples ? 'Couples plan' : 'Individual plan'
  const showBlended = showsBlendedFamilyScreen(draft)

  const answers: { label: string; value: string }[] = [
    { label: 'Plan', value: isCouples ? 'Couples' : 'Individual' },
    { label: 'Marital status', value: MARITAL_LABEL[draft.maritalStatus] },
    { label: 'Estate size', value: estateBracketLabel(draft.estateBracket) },
    {
      label: 'Prior-relationship kids',
      value: draft.hasPriorRelationshipChildren ? 'Yes' : 'No',
    },
  ]
  if (isCouples && draft.hasPriorRelationshipChildren && draft.priorKidsScope) {
    answers.push({ label: 'Whose children', value: PRIOR_KIDS_SCOPE_LABEL[draft.priorKidsScope] })
  }
  if (showBlended) {
    answers.push({
      label: 'Blended-family',
      value: includeSpousalTrust ? 'Spousal trust' : 'Keep it simple',
    })
  }

  return (
    <CheckoutFlowShell
      headerRight={
        <Link to="/qualify" className="inline-flex items-center gap-1 font-medium text-accent underline-offset-2 hover:underline">
          <Pencil className="h-3 w-3" />
          Edit
        </Link>
      }
    >
      <CheckoutFlowSteps current="summary" />

      {/* Single receipt card */}
      <article className="mt-6 overflow-hidden rounded-[1.75rem] border border-border/50 bg-card shadow-[0_24px_60px_-40px_rgba(15,23,42,0.35)] sm:mt-8">
        {/* Hero total */}
        <header className="bg-primary px-5 py-6 text-primary-foreground sm:px-7 sm:py-7">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary-foreground/60">
            Plan summary
          </p>
          <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="font-serif text-4xl tabular-nums tracking-tight sm:text-[2.75rem]">${total}</p>
              <p className="mt-1 text-sm text-primary-foreground/70">
                {planLabel}
                {includeSpousalTrust ? ' · Spousal trust included' : ''}
              </p>
            </div>
            <Button
              asChild
              size="lg"
              className="hidden h-11 rounded-full bg-accent px-6 text-accent-foreground hover:bg-accent/90 sm:inline-flex"
            >
              <Link to="/pricing">
                Continue
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            </Button>
          </div>
          <p className="mt-3 text-xs text-primary-foreground/50">
            Plan locks when you pay · Living trust (+${trustAddonDollars()}) optional on the next step
          </p>
        </header>

        {/* Answers grid */}
        <section className="border-b border-border/50 px-5 py-5 sm:px-7">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-medium text-foreground">From your answers</h2>
            <Link
              to="/qualify"
              className="text-xs font-medium text-accent underline-offset-2 hover:underline"
            >
              Change
            </Link>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {answers.map((a) => (
              <AnswerChip key={a.label} label={a.label} value={a.value} />
            ))}
          </div>
          {showBlended && includeSpousalTrust ? (
            <Link
              to="/qualify?step=blended"
              className="mt-3 inline-block text-xs font-medium text-accent underline-offset-2 hover:underline"
            >
              Change blended-family choice
            </Link>
          ) : null}
        </section>

        {/* Receipt lines */}
        <section className="px-5 py-2 sm:px-7">
          <h2 className="sr-only">Price breakdown</h2>
          <ReceiptLine label={planLabel} amount={`$${base}`} />
          {includeSpousalTrust ? (
            <ReceiptLine
              label="Spousal testamentary trust"
              amount={`+$${spousalAddon}`}
              note="Provisional price — may change before launch"
              accent
              action={
                <Link
                  to="/qualify?step=blended"
                  className="text-xs font-medium text-accent underline-offset-2 hover:underline"
                >
                  Change
                </Link>
              }
            />
          ) : showBlended ? (
            <ReceiptLine label="Blended-family option" amount="Included" />
          ) : null}
          <div className="my-2 border-t border-dashed border-border/70" />
          <div className="flex items-baseline justify-between gap-4 py-2">
            <span className="font-medium text-foreground">Total today</span>
            <span className="font-serif text-2xl tabular-nums tracking-tight">${total}</span>
          </div>
        </section>

        {/* Included footer */}
        <footer className="border-t border-border/50 bg-secondary/25 px-5 py-4 sm:px-7">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Included
          </p>
          <ul className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1.5">
            {INCLUDED.map((line) => (
              <li key={line} className="flex items-center gap-1.5 text-xs text-foreground">
                <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-accent" strokeWidth={2} />
                {line}
              </li>
            ))}
          </ul>
        </footer>
      </article>

      <p className="mt-5 text-center text-xs text-muted-foreground">
        Next: choose documents, confirm fit, and pay securely.
      </p>

      {/* Mobile sticky CTA */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border/60 bg-card/95 px-5 py-3 backdrop-blur-md sm:hidden">
        <div className="mx-auto flex max-w-[720px] items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Total</p>
            <p className="font-serif text-2xl tabular-nums leading-none">${total}</p>
          </div>
          <Button asChild size="lg" className="h-11 shrink-0 rounded-full px-5">
            <Link to="/pricing">
              Continue
              <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
      <div className="h-20 sm:hidden" aria-hidden />

      <div className="mt-6 hidden text-center sm:block">
        <Button asChild size="lg" className="h-12 rounded-full px-10">
          <Link to="/pricing">
            Continue to pricing
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>
    </CheckoutFlowShell>
  )
}
