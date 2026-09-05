import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Check, Users, User } from 'lucide-react'
import { CheckoutFlowShell } from '@/components/site/CheckoutFlowShell'
import { CheckoutFlowSteps } from '@/components/site/CheckoutFlowSteps'
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
  qualifyStepsForDraft,
  saveQualifierDraft,
} from '@/lib/qualifier'

type StepId =
  | 'plan'
  | 'marital'
  | 'prior_kids'
  | 'prior_scope'
  | 'blended'
  | 'estate'

const STEP_SHORT: Record<StepId, string> = {
  plan: 'Plan',
  marital: 'Status',
  prior_kids: 'Prior kids',
  prior_scope: 'Whose kids',
  blended: 'Blended',
  estate: 'Estate',
}

function initialDraft(): Partial<QualifierDraft> {
  const saved = loadQualifierDraft()
  return saved ?? { plan: 'individual', hasPriorRelationshipChildren: false }
}

function OptionCard({
  selected,
  onClick,
  title,
  description,
  icon: Icon,
}: {
  selected: boolean
  onClick: () => void
  title: string
  description: string
  icon?: typeof User
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-2xl border p-4 text-left transition sm:p-5',
        selected
          ? 'border-accent bg-accent/5 ring-1 ring-accent/30'
          : 'border-border/70 hover:border-accent/40',
      )}
    >
      <div className="flex items-start gap-3">
        {Icon ? (
          <span
            className={cn(
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
              selected ? 'bg-accent/15 text-accent' : 'bg-secondary text-muted-foreground',
            )}
          >
            <Icon className="h-4 w-4" strokeWidth={1.75} />
          </span>
        ) : null}
        <div>
          <p className="font-medium">{title}</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p>
        </div>
      </div>
    </button>
  )
}

function ListOption({
  selected,
  onClick,
  label,
}: {
  selected: boolean
  onClick: () => void
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left text-sm transition',
        selected ? 'border-accent bg-accent/5' : 'border-border/70 hover:border-accent/40',
      )}
    >
      {label}
      {selected ? <Check className="h-4 w-4 shrink-0 text-accent" /> : null}
    </button>
  )
}

export default function Qualify() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [draft, setDraft] = useState<Partial<QualifierDraft>>(initialDraft)
  const [simpleAck, setSimpleAck] = useState(Boolean(draft.simpleWillAcknowledged))

  const steps = useMemo((): StepId[] => qualifyStepsForDraft(draft), [draft])

  const [stepIdx, setStepIdx] = useState(0)
  const step = steps[Math.min(stepIdx, steps.length - 1)] ?? 'plan'

  useEffect(() => {
    const target = searchParams.get('step')
    if (!target) return
    const idx = steps.indexOf(target as StepId)
    if (idx >= 0) setStepIdx(idx)
  }, [searchParams, steps])

  useEffect(() => {
    const planParam = searchParams.get('plan')
    if (planParam === 'individual' || planParam === 'couples') {
      patch({ plan: planParam })
    }
  }, [searchParams])

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

  const continueLabel = step === 'estate' ? 'See summary' : 'Continue'

  return (
    <CheckoutFlowShell
      headerRight={
        <span>
          Question {stepIdx + 1} of {steps.length}
        </span>
      }
    >
      <CheckoutFlowSteps current="qualify" linkCompleted={false} />

      {/* Sub-step pills */}
      <div className="mt-5 flex flex-wrap gap-1.5">
        {steps.map((id, idx) => (
          <span
            key={id}
            className={cn(
              'rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors',
              idx === stepIdx && 'bg-primary text-primary-foreground',
              idx < stepIdx && 'bg-accent/15 text-accent',
              idx > stepIdx && 'bg-secondary text-muted-foreground',
            )}
          >
            {STEP_SHORT[id]}
          </span>
        ))}
      </div>

      <div className="mt-6 rounded-3xl border border-border/50 bg-card/90 p-6 shadow-sm sm:mt-8 sm:p-8">
        {step === 'plan' ? (
          <>
            <h1 className="font-serif text-2xl tracking-tight sm:text-[1.625rem]">
              Who is this plan for?
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              This choice is locked after checkout — pick carefully.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <OptionCard
                selected={draft.plan === 'individual'}
                onClick={() => patch({ plan: 'individual' as QualifierPlan })}
                title="Individual"
                description="One person, one will"
                icon={User}
              />
              <OptionCard
                selected={draft.plan === 'couples'}
                onClick={() => patch({ plan: 'couples' as QualifierPlan })}
                title="Couples"
                description="Two wills — one for each spouse"
                icon={Users}
              />
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
                <ListOption
                  key={value}
                  selected={draft.maritalStatus === value}
                  onClick={() =>
                    patch({
                      maritalStatus: value as QualifierMaritalStatus,
                      spousalTrustChoice: undefined,
                    })
                  }
                  label={label}
                />
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
                  className="h-11 flex-1 rounded-full capitalize"
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
            <p className="mt-2 text-sm text-muted-foreground">Combined household — pick the closest fit.</p>
            <div className="mt-6 space-y-2">
              {(
                [
                  ['me', 'Mine only'],
                  ['partner', "My partner's only"],
                  ['both', 'Both of us'],
                ] as const
              ).map(([value, label]) => (
                <ListOption
                  key={value}
                  selected={draft.priorKidsScope === value}
                  onClick={() => patch({ priorKidsScope: value as PriorKidsScope })}
                  label={label}
                />
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
              <OptionCard
                selected={draft.spousalTrustChoice === 'simple'}
                onClick={() => patch({ spousalTrustChoice: 'simple' as SpousalTrustChoice })}
                title="Keep it simple"
                description="Standard will language — included in base price. Spouse and children both named; Texas law applies as-is."
              />
              <OptionCard
                selected={draft.spousalTrustChoice === 'spousal_trust'}
                onClick={() => patch({ spousalTrustChoice: 'spousal_trust' as SpousalTrustChoice })}
                title="Add the spousal trust"
                description={`Testamentary trust for spouse lifetime support, remainder to prior-relationship children. Provisional +$${spousalTrustAddonDollars()}.`}
              />
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
                <ListOption
                  key={opt.value}
                  selected={draft.estateBracket === opt.value}
                  onClick={() => patch({ estateBracket: opt.value as EstateBracket })}
                  label={opt.label}
                />
              ))}
            </div>
          </>
        ) : null}
      </div>

      {/* Desktop nav */}
      <div className="mt-6 hidden items-center justify-between sm:flex">
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
          className="h-11 rounded-full px-8"
          disabled={!canContinue()}
          onClick={onContinue}
        >
          {continueLabel}
          <ArrowRight className="ml-1 h-4 w-4" />
        </Button>
      </div>

      {/* Mobile sticky nav */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border/60 bg-card/95 px-5 py-3 backdrop-blur-md sm:hidden">
        <div className="mx-auto flex max-w-[720px] items-center justify-between gap-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="rounded-full"
            disabled={stepIdx === 0}
            onClick={onBack}
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back
          </Button>
          <Button
            type="button"
            className="h-11 flex-1 rounded-full"
            disabled={!canContinue()}
            onClick={onContinue}
          >
            {continueLabel}
            <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="h-20 sm:hidden" aria-hidden />
    </CheckoutFlowShell>
  )
}
