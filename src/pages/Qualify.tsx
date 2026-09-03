import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Check } from 'lucide-react'
import { Wordmark } from '@/components/site/Wordmark'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'
import { spousalTrustAddonDollars } from '@/lib/pricing'
import {
  ESTATE_BRACKET_OPTIONS,
  type EstateBracket,
  type PriorKidsScope,
  type QualifierDraft,
  type QualifierMaritalStatus,
  type QualifierPlan,
  type SpousalTrustChoice,
  isOverEightMillion,
  loadQualifierDraft,
  saveQualifierDraft,
  showsBlendedFamilyScreen,
} from '@/lib/qualifier'

type StepId =
  | 'plan'
  | 'marital'
  | 'prior_kids'
  | 'prior_scope'
  | 'blended'
  | 'estate'

function initialDraft(): Partial<QualifierDraft> {
  const saved = loadQualifierDraft()
  return saved ?? { plan: 'individual', hasPriorRelationshipChildren: false }
}

export default function Qualify() {
  const navigate = useNavigate()
  const [draft, setDraft] = useState<Partial<QualifierDraft>>(initialDraft)
  const [simpleAck, setSimpleAck] = useState(Boolean(draft.simpleWillAcknowledged))

  const steps = useMemo((): StepId[] => {
    const list: StepId[] = ['plan', 'marital', 'prior_kids']
    if (draft.plan === 'couples' && draft.hasPriorRelationshipChildren) {
      list.push('prior_scope')
    }
    if (showsBlendedFamilyScreen(draft)) {
      list.push('blended')
    }
    list.push('estate')
    return list
  }, [draft])

  const [stepIdx, setStepIdx] = useState(0)
  const step = steps[Math.min(stepIdx, steps.length - 1)] ?? 'plan'
  const progressPct = Math.round(((stepIdx + 1) / steps.length) * 100)

  function patch(p: Partial<QualifierDraft>) {
    setDraft((prev) => ({ ...prev, ...p }))
  }

  function canContinue(): boolean {
    if (step === 'plan') return draft.plan === 'individual' || draft.plan === 'couples'
    if (step === 'marital') return Boolean(draft.maritalStatus)
    if (step === 'prior_kids') return draft.hasPriorRelationshipChildren !== undefined
    if (step === 'prior_scope') return Boolean(draft.priorKidsScope)
    if (step === 'blended') {
      if (!draft.spousalTrustChoice) return false
      if (draft.spousalTrustChoice === 'simple') return simpleAck
      return true
    }
    if (step === 'estate') return Boolean(draft.estateBracket)
    return false
  }

  function finish() {
    if (!draft.plan || !draft.maritalStatus || !draft.estateBracket) return
    const complete: QualifierDraft = {
      plan: draft.plan,
      maritalStatus: draft.maritalStatus,
      hasPriorRelationshipChildren: Boolean(draft.hasPriorRelationshipChildren),
      priorKidsScope: draft.priorKidsScope,
      spousalTrustChoice: draft.spousalTrustChoice,
      simpleWillAcknowledged: draft.spousalTrustChoice === 'simple' ? simpleAck : undefined,
      estateBracket: draft.estateBracket,
      updatedAt: new Date().toISOString(),
    }
    saveQualifierDraft(complete)
    if (isOverEightMillion(complete.estateBracket)) {
      navigate('/qualify/off-ramp')
      return
    }
    navigate('/summary')
  }

  function onContinue() {
    if (!canContinue()) return
    if (stepIdx >= steps.length - 1) {
      finish()
      return
    }
    setStepIdx((i) => i + 1)
  }

  function onBack() {
    if (stepIdx === 0) return
    setStepIdx((i) => i - 1)
  }

  return (
    <div className="flex min-h-dvh flex-col bg-[radial-gradient(ellipse_at_top,_oklch(0.98_0.01_85)_0%,_var(--background)_55%)]">
      <header className="border-b border-border/60 bg-card/85 px-5 py-4 backdrop-blur-md">
        <div className="mx-auto flex max-w-[720px] items-center justify-between">
          <Link to="/" className="text-foreground">
            <Wordmark />
          </Link>
          <span className="text-xs text-muted-foreground">
            Step {stepIdx + 1} of {steps.length}
          </span>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[720px] flex-1 flex-col px-5 py-10">
        <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full rounded-full bg-accent transition-[width]"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        <div className="mt-8 rounded-3xl border border-border/50 bg-card/90 p-6 shadow-sm sm:p-8">
          {step === 'plan' ? (
            <>
              <h1 className="font-serif text-2xl tracking-tight">Who is this plan for?</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                This choice is locked after checkout — pick carefully.
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {(
                  [
                    ['individual', 'Individual', 'One person, one will'],
                    ['couples', 'Couples', 'Two wills — one for each spouse'],
                  ] as const
                ).map(([value, title, sub]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => patch({ plan: value as QualifierPlan })}
                    className={cn(
                      'rounded-2xl border px-4 py-5 text-left transition',
                      draft.plan === value
                        ? 'border-accent bg-accent/5 ring-1 ring-accent/30'
                        : 'border-border/70 hover:border-accent/40',
                    )}
                  >
                    <p className="font-medium">{title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{sub}</p>
                  </button>
                ))}
              </div>
            </>
          ) : null}

          {step === 'marital' ? (
            <>
              <h1 className="font-serif text-2xl tracking-tight">Marital status</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Texas community property rules depend on this.
              </p>
              <div className="mt-6 space-y-2">
                {(
                  [
                    ['married', 'Married'],
                    ['domestic_partnership', 'Domestic partnership'],
                    ['single', 'Single'],
                    ['divorced', 'Divorced'],
                    ['widowed', 'Widowed'],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() =>
                      patch({
                        maritalStatus: value as QualifierMaritalStatus,
                        spousalTrustChoice: undefined,
                      })
                    }
                    className={cn(
                      'flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left text-sm',
                      draft.maritalStatus === value
                        ? 'border-accent bg-accent/5'
                        : 'border-border/70',
                    )}
                  >
                    {label}
                    {draft.maritalStatus === value ? (
                      <Check className="h-4 w-4 text-accent" />
                    ) : null}
                  </button>
                ))}
              </div>
            </>
          ) : null}

          {step === 'prior_kids' ? (
            <>
              <h1 className="font-serif text-2xl tracking-tight">
                Children from a prior relationship?
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {draft.plan === 'couples'
                  ? 'Combined household — we will ask whose children on the next screen if yes.'
                  : 'Biological or adopted children from before your current marriage or partnership.'}
              </p>
              <div className="mt-6 flex gap-3">
                {(['yes', 'no'] as const).map((v) => (
                  <Button
                    key={v}
                    type="button"
                    variant={draft.hasPriorRelationshipChildren === (v === 'yes') ? 'default' : 'outline'}
                    className="flex-1 rounded-full capitalize"
                    onClick={() =>
                      patch({
                        hasPriorRelationshipChildren: v === 'yes',
                        priorKidsScope: undefined,
                        spousalTrustChoice: undefined,
                      })
                    }
                  >
                    {v}
                  </Button>
                ))}
              </div>
            </>
          ) : null}

          {step === 'prior_scope' ? (
            <>
              <h1 className="font-serif text-2xl tracking-tight">Whose prior-relationship children?</h1>
              <div className="mt-6 space-y-2">
                {(
                  [
                    ['me', 'Mine only'],
                    ['partner', "My partner's only"],
                    ['both', 'Both of us'],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => patch({ priorKidsScope: value as PriorKidsScope })}
                    className={cn(
                      'flex w-full rounded-xl border px-4 py-3 text-left text-sm',
                      draft.priorKidsScope === value ? 'border-accent bg-accent/5' : 'border-border/70',
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </>
          ) : null}

          {step === 'blended' ? (
            <>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">
                Blended family
              </p>
              <h1 className="mt-2 font-serif text-2xl tracking-tight">
                How should we balance your spouse and your prior-relationship children?
              </h1>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => patch({ spousalTrustChoice: 'simple' as SpousalTrustChoice })}
                  className={cn(
                    'rounded-2xl border p-4 text-left',
                    draft.spousalTrustChoice === 'simple'
                      ? 'border-accent bg-accent/5 ring-1 ring-accent/30'
                      : 'border-border/70',
                  )}
                >
                  <p className="font-medium">Keep it simple</p>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    Standard will language — included in base price. Your spouse and children are
                    both named; Texas law applies as-is.
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => patch({ spousalTrustChoice: 'spousal_trust' as SpousalTrustChoice })}
                  className={cn(
                    'rounded-2xl border p-4 text-left',
                    draft.spousalTrustChoice === 'spousal_trust'
                      ? 'border-accent bg-accent/5 ring-1 ring-accent/30'
                      : 'border-border/70',
                  )}
                >
                  <p className="font-medium">Add the spousal trust</p>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    Testamentary trust for spouse lifetime support, remainder to your prior-relationship
                    children. Provisional +${spousalTrustAddonDollars()} (not final price).
                  </p>
                </button>
              </div>
              {draft.spousalTrustChoice === 'simple' ? (
                <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-amber-300/60 bg-amber-50/80 p-4 text-sm">
                  <Checkbox checked={simpleAck} onCheckedChange={(v) => setSimpleAck(v === true)} />
                  <span>
                    I understand a simple will may not fully protect my prior-relationship children's
                    share if my spouse inherits everything outright.
                  </span>
                </label>
              ) : null}
            </>
          ) : null}

          {step === 'estate' ? (
            <>
              <h1 className="font-serif text-2xl tracking-tight">
                {draft.plan === 'couples'
                  ? 'Combined household estate size (rough estimate)'
                  : 'About how large is your estate?'}
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Pick the closest range. This helps us route you correctly — not a tax appraisal.
              </p>
              <div className="mt-6 space-y-2">
                {ESTATE_BRACKET_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => patch({ estateBracket: opt.value as EstateBracket })}
                    className={cn(
                      'flex w-full rounded-xl border px-4 py-3 text-left text-sm',
                      draft.estateBracket === opt.value
                        ? 'border-accent bg-accent/5'
                        : 'border-border/70',
                      opt.value === 'over_8m' && 'border-dashed',
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </>
          ) : null}
        </div>

        <div className="mt-6 flex items-center justify-between">
          <Button
            type="button"
            variant="ghost"
            className="rounded-full"
            disabled={stepIdx === 0}
            onClick={onBack}
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back
          </Button>
          <Button
            type="button"
            className="rounded-full px-6"
            disabled={!canContinue()}
            onClick={onContinue}
          >
            {step === 'estate' ? 'See summary' : 'Continue'}
            <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </main>
    </div>
  )
}
