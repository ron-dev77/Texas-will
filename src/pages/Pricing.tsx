import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowRight, Loader2 } from 'lucide-react'
import { CheckoutFlowShell } from '@/components/site/CheckoutFlowShell'
import { CheckoutFlowSteps } from '@/components/site/CheckoutFlowSteps'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  StripeCheckoutModal,
  type PaymentSuccessInfo,
} from '@/components/checkout/StripeCheckoutModal'
import { cn } from '@/lib/utils'
import { finalizeCheckoutPayment, savePaidOrderDraft } from '@/lib/checkout'
import { computeTotalDollars, planPriceDollars, spousalTrustAddonDollars, trustAddonDollars } from '@/lib/pricing'
import {
  loadQualifierDraft,
  qualifierComplete,
  type QualifierDraft,
} from '@/lib/qualifier'
import {
  listedOutsideCounselFirms,
  RLT_FIT_REASONS,
  WILL_BASED_EDUCATION,
  needsOutsideCounsel,
  type RltFitId,
} from '@/lib/outside-counsel'
import {
  type OrderDraft,
  type PackageDocId,
  type Plan,
  PACKAGE_DOC_IDS,
  PACKAGE_DOC_LABEL,
  OPTIONAL_PACKAGE_DOC_IDS,
  normalizeOrderDocuments,
} from '@/lib/order'
import { LSR_FAQ } from '@/lib/faqs'

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

function questionnairePath(token?: string | null, paymentIntentId?: string | null) {
  const params = new URLSearchParams()
  if (token) params.set('token', token)
  if (paymentIntentId) params.set('payment_intent', paymentIntentId)
  const qs = params.toString()
  return qs ? `/questionnaire?${qs}` : '/questionnaire'
}

const EMPTY_FIT: Record<RltFitId, 'yes' | 'no' | ''> = {
  out_of_state_property: '',
  private_business: '',
  privacy: '',
}

export default function Pricing() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const qualifier = useMemo(() => loadQualifierDraft(), [])

  const [email, setEmail] = useState('')
  const [partnerEmail, setPartnerEmail] = useState('')
  const [fit, setFit] = useState<Record<RltFitId, 'yes' | 'no' | ''>>(EMPTY_FIT)
  const [includeTrust, setIncludeTrust] = useState(false)
  const [documents, setDocuments] = useState<PackageDocId[]>(['will'])
  const [lsrConsent, setLsrConsent] = useState(false)
  const [showErrors, setShowErrors] = useState(false)
  const [payOpen, setPayOpen] = useState(false)
  const [checkoutDraft, setCheckoutDraft] = useState<OrderDraft | null>(null)
  const [startingWill, setStartingWill] = useState(false)
  const [startError, setStartError] = useState<string | null>(null)

  const paidFlag = searchParams.get('paid')
  const paymentIntentId = searchParams.get('payment_intent')
  const redirectStatus = searchParams.get('redirect_status')

  useEffect(() => {
    if (paidFlag !== '1' || !paymentIntentId) return
    if (redirectStatus && redirectStatus !== 'succeeded') {
      setStartError('Payment was not completed. You can try again below.')
      return
    }

    let cancelled = false
    setStartingWill(true)
    setStartError(null)
    ;(async () => {
      try {
        const result = await finalizeCheckoutPayment(paymentIntentId)
        if (cancelled) return
        setStartingWill(true)
        navigate(
          questionnairePath(result.questionnaireToken, paymentIntentId),
          { replace: true },
        )
      } catch (err) {
        if (cancelled) return
        setStartError(
          err instanceof Error ? err.message : 'Could not start your questionnaire after payment.',
        )
        setStartingWill(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [paidFlag, paymentIntentId, redirectStatus, navigate])

  if (!qualifierComplete(qualifier)) {
    return <Navigate to="/qualify" replace />
  }

  const lockedQualifier: QualifierDraft = qualifier
  const plan: Plan = lockedQualifier.plan
  const includeSpousalTrust = lockedQualifier.spousalTrustChoice === 'spousal_trust'
  const isCouples = plan === 'couples'
  const planTitle = isCouples ? 'Couples plan' : 'Individual plan'
  const qualifyTotal = computeTotalDollars(plan, false, includeSpousalTrust)

  const allOptionalSelected = OPTIONAL_PACKAGE_DOC_IDS.every((id) => documents.includes(id))
  const hasWill = documents.includes('will')
  const emailOk = EMAIL_RE.test(email.trim())
  const partnerOk = plan === 'individual' || EMAIL_RE.test(partnerEmail.trim())
  const partnerDifferent =
    plan === 'individual' ||
    partnerEmail.trim().toLowerCase() !== email.trim().toLowerCase()

  function toggleDocument(id: PackageDocId, on: boolean) {
    if (id === 'will') return // Will is required — never uncheck
    setDocuments((prev) => {
      const base = normalizeOrderDocuments(prev)
      if (on) return base.includes(id) ? base : [...base, id]
      return base.filter((d) => d !== id)
    })
  }

  function toggleAllOptionalDocuments(on: boolean) {
    setDocuments(on ? [...PACKAGE_DOC_IDS] : ['will'])
  }

  const base = planPriceDollars(plan)
  const total = computeTotalDollars(plan, includeTrust, includeSpousalTrust)
  const fitAnswered = RLT_FIT_REASONS.every((r) => fit[r.id] === 'yes' || fit[r.id] === 'no')
  const offRamp = needsOutsideCounsel(fit)
  const counselFirms = listedOutsideCounselFirms()

  const valid = useMemo(
    () =>
      emailOk &&
      partnerOk &&
      partnerDifferent &&
      lsrConsent &&
      hasWill &&
      fitAnswered &&
      !offRamp,
    [emailOk, partnerOk, partnerDifferent, lsrConsent, hasWill, fitAnswered, offRamp],
  )

  function openPayment() {
    setShowErrors(true)
    if (!valid) return
    const draft: OrderDraft = {
      plan,
      email: email.trim().toLowerCase(),
      partnerEmail: plan === 'couples' ? partnerEmail.trim().toLowerCase() : undefined,
      includeTrust,
      includeSpousalTrust,
      qualifier: lockedQualifier,
      documents: normalizeOrderDocuments(documents),
      total,
      lsrConsent,
    }
    setCheckoutDraft(draft)
    setPayOpen(true)
  }

  function handlePaid(info: PaymentSuccessInfo) {
    if (checkoutDraft) {
      savePaidOrderDraft(checkoutDraft)
    }
    setPayOpen(false)
    setStartingWill(true)
    navigate(questionnairePath(info.questionnaireToken, info.paymentIntentId), {
      replace: true,
    })
  }

  if (startingWill) {
    return (
      <CheckoutFlowShell>
        <div className="flex flex-col items-center py-16 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
          <p className="mt-5 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Payment received
          </p>
          <h1 className="mt-3 font-serif text-3xl tracking-tight text-foreground">
            Starting your will…
          </h1>
        </div>
      </CheckoutFlowShell>
    )
  }

  return (
    <CheckoutFlowShell
      wide
      headerRight={
        <Link
          to="/summary"
          className="font-medium text-accent underline-offset-2 hover:underline"
        >
          Back to summary
        </Link>
      }
    >
      <CheckoutFlowSteps current="pricing" />

      <div className="mt-6 sm:mt-8">
        <h1 className="font-serif text-2xl tracking-tight text-foreground sm:text-3xl">
          Complete your order
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Choose documents, confirm fit, and pay securely.
        </p>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border/60 bg-card px-4 py-3.5 sm:px-5">
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">{planTitle}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Locked from your answers
            {includeSpousalTrust ? ' · Spousal trust included' : ''}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-4">
          <p className="font-serif text-2xl tabular-nums tracking-tight">${qualifyTotal}</p>
          <Link
            to="/summary"
            className="text-xs font-medium text-accent underline-offset-2 hover:underline"
          >
            View summary
          </Link>
        </div>
      </div>

      {startError ? (
        <p className="mt-4 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {startError}
        </p>
      ) : null}

      <div className="mt-6 overflow-hidden rounded-[1.75rem] border border-border/70 bg-card shadow-[0_18px_50px_-32px_rgba(15,23,42,0.28)]">
              <div className="space-y-4 p-6 sm:p-8">
                <div className="space-y-3 rounded-2xl border border-border/70 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        Which documents do you want included?
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Your will is required. Other papers are optional and included in the same
                        plan price. This product does not include a living trust.
                      </p>
                    </div>
                    <label
                      htmlFor="all-docs"
                      className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-border/80 bg-background px-3 py-1.5 text-xs font-medium text-foreground"
                    >
                      <Checkbox
                        id="all-docs"
                        checked={allOptionalSelected}
                        onCheckedChange={(v) => toggleAllOptionalDocuments(v === true)}
                      />
                      Select all
                    </label>
                  </div>

                  <ul className="grid gap-2 sm:grid-cols-2">
                    {PACKAGE_DOC_IDS.map((id) => {
                      const checked = documents.includes(id)
                      const isWill = id === 'will'
                      return (
                        <li key={id}>
                          <label
                            htmlFor={`doc-${id}`}
                            className={cn(
                              'flex items-start gap-2.5 rounded-xl border px-3 py-2.5 transition',
                              isWill ? 'cursor-default' : 'cursor-pointer',
                              checked
                                ? 'border-primary/25 bg-primary/[0.06]'
                                : 'border-border/60 hover:border-primary/20',
                            )}
                          >
                            <Checkbox
                              id={`doc-${id}`}
                              checked={checked}
                              disabled={isWill}
                              onCheckedChange={(v) => toggleDocument(id, v === true)}
                              className="mt-0.5"
                            />
                            <span className="text-sm leading-snug text-foreground">
                              {PACKAGE_DOC_LABEL[id]}
                              {isWill ? (
                                <span className="mt-0.5 block text-[11px] text-muted-foreground">
                                  Required · included in your plan
                                </span>
                              ) : (
                                <span className="mt-0.5 block text-[11px] text-muted-foreground">
                                  Optional · same plan price
                                </span>
                              )}
                            </span>
                          </label>
                        </li>
                      )
                    })}
                  </ul>
                </div>

                <div className="relative overflow-hidden rounded-3xl border border-border/70 bg-card p-5 shadow-[0_14px_40px_-28px_rgba(15,23,42,0.4)] sm:p-6">
                  <div aria-hidden="true" className="absolute inset-x-0 top-0 h-1.5 bg-accent" />
                  <div>
                    <p className="text-xs font-medium uppercase tracking-[0.18em] text-accent">
                      Honest fit
                    </p>
                    <h3 className="mt-2 font-serif text-xl leading-snug text-foreground">
                      {WILL_BASED_EDUCATION.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {WILL_BASED_EDUCATION.body}{' '}
                      <Link
                        to="/faq#living-trust"
                        className="font-medium text-accent underline-offset-4 hover:underline"
                      >
                        Read more
                      </Link>
                      .
                    </p>
                  </div>
                  <div className="space-y-4">
                    {RLT_FIT_REASONS.map((reason) => (
                      <div key={reason.id}>
                        <p className="text-sm text-foreground">{reason.label}</p>
                        <div className="mt-2 flex gap-2">
                          {(['no', 'yes'] as const).map((choice) => (
                            <button
                              key={choice}
                              type="button"
                              onClick={() =>
                                setFit((prev) => ({ ...prev, [reason.id]: choice }))
                              }
                              className={cn(
                                'rounded-full border px-4 py-1.5 text-xs font-medium transition',
                                fit[reason.id] === choice
                                  ? 'border-accent bg-accent/10 text-foreground'
                                  : 'border-border text-muted-foreground hover:border-accent/40',
                              )}
                            >
                              {choice === 'yes' ? 'Yes' : 'No'}
                            </button>
                          ))}
                        </div>
                        {showErrors && !fit[reason.id] ? (
                          <p className="mt-1.5 text-xs text-destructive">Please answer this.</p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                  {offRamp ? (
                    <div className="rounded-xl border border-accent/30 bg-accent/5 p-4">
                      <p className="text-sm font-medium text-foreground">
                        This product is not the right fit
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Please get a full estate plan from a Texas law firm. These are the firms we
                        can name:
                      </p>
                      <ul className="mt-3 space-y-2 text-sm text-foreground">
                        {counselFirms.map((firm) => (
                          <li key={firm.name}>
                            {firm.href ? (
                              <a
                                href={firm.href}
                                target="_blank"
                                rel="noreferrer"
                                className="font-medium underline-offset-2 hover:underline"
                              >
                                {firm.name}
                              </a>
                            ) : (
                              <span className="font-medium">{firm.name}</span>
                            )}
                            <span className="block text-muted-foreground">{firm.detail}</span>
                          </li>
                        ))}
                      </ul>
                      {counselFirms.length < 3 ? (
                        <p className="mt-3 text-sm text-muted-foreground">
                          Ask Texas AI Law Group, PLLC for two additional Texas estate-planning law
                          firms they recommend. We only list private firms a Texas lawyer has named.
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </div>

                <div className={cn('grid gap-4', plan === 'couples' && 'sm:grid-cols-2')}>
                  <div>
                    <Label htmlFor="email">
                      Your email <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      required
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className={cn(
                        'mt-2',
                        showErrors && !emailOk && 'border-destructive focus-visible:ring-destructive/30',
                      )}
                    />
                    {showErrors && !emailOk ? (
                      <p className="mt-1.5 text-xs text-destructive">Enter a valid email.</p>
                    ) : (
                      <p className="mt-1.5 text-xs text-muted-foreground">
                        Receipt and a resume link go here. After payment you start the questionnaire
                        immediately.
                      </p>
                    )}
                  </div>
                  {plan === 'couples' ? (
                    <div>
                      <Label htmlFor="partner">
                        Partner&apos;s email <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="partner"
                        type="email"
                        required
                        value={partnerEmail}
                        onChange={(e) => setPartnerEmail(e.target.value)}
                        placeholder="partner@example.com"
                        className={cn(
                          'mt-2',
                          showErrors &&
                            (!partnerOk || !partnerDifferent) &&
                            'border-destructive focus-visible:ring-destructive/30',
                        )}
                      />
                      {showErrors && !partnerOk ? (
                        <p className="mt-1.5 text-xs text-destructive">Partner email is required.</p>
                      ) : showErrors && !partnerDifferent ? (
                        <p className="mt-1.5 text-xs text-destructive">
                          Use a different email for your partner.
                        </p>
                      ) : (
                        <p className="mt-1.5 text-xs text-muted-foreground">
                          Each of you gets a separate questionnaire. You start yours right after
                          payment; your partner gets an email link.
                        </p>
                      )}
                    </div>
                  ) : null}
                </div>

                <div className="space-y-3 rounded-2xl border border-border/70 p-4">
                  <p className="text-sm font-medium text-foreground">Optional add-ons</p>
                  {includeSpousalTrust ? (
                    <p className="text-xs text-muted-foreground">
                      Spousal testamentary trust (+${spousalTrustAddonDollars()} provisional) — selected
                      in{' '}
                      <Link to="/summary" className="text-accent underline-offset-2 hover:underline">
                        your summary
                      </Link>
                      .
                    </p>
                  ) : null}
                  <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border/60 p-3">
                    <Checkbox
                      checked={includeTrust}
                      onCheckedChange={(v) => setIncludeTrust(v === true)}
                      className="mt-0.5"
                    />
                    <span className="text-sm">
                      <span className="font-medium text-foreground">
                        Revocable living trust (+${trustAddonDollars()})
                      </span>
                      <span className="mt-1 block text-xs text-muted-foreground">
                        Separate from the spousal trust. Optional — not required for most Texans.
                      </span>
                    </span>
                  </label>
                </div>

                <div
                  className={cn(
                    'flex items-start gap-3 rounded-2xl p-4',
                    showErrors && !lsrConsent ? 'bg-destructive/5 ring-1 ring-destructive/30' : 'bg-secondary/50',
                  )}
                >
                  <Checkbox
                    id="lsr"
                    checked={lsrConsent}
                    onCheckedChange={(v) => setLsrConsent(v === true)}
                    className="mt-1"
                  />
                  <Label
                    htmlFor="lsr"
                    className="min-w-0 flex-1 cursor-pointer text-sm font-normal leading-relaxed text-muted-foreground"
                  >
                    <span className="font-medium text-foreground">
                      I agree to Limited Scope Representation (LSR) with Texas AI Law Group, PLLC.
                    </span>
                    <span className="mt-3 block font-medium text-foreground">{LSR_FAQ.q}</span>
                    <span className="mt-2 block">{LSR_FAQ.a}</span>
                  </Label>
                </div>
                {showErrors && !lsrConsent ? (
                  <p className="px-1 text-xs text-destructive">
                    You must agree to Limited Scope Representation to continue.
                  </p>
                ) : null}
              </div>

              <div className="border-t border-border/60 bg-primary px-6 py-6 text-primary-foreground sm:px-8 sm:py-7">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="text-xs uppercase tracking-wider text-primary-foreground/65">
                      {plan === 'individual' ? 'Individual' : 'Couples'}
                      {documents.length > 1 ? ` · ${documents.length} docs` : ''}
                    </div>
                    <div className="mt-2 space-y-1 text-sm text-primary-foreground/75">
                      <div className="flex justify-between gap-6 sm:max-w-xs">
                        <span>{plan === 'individual' ? 'Individual plan' : 'Couples plan'}</span>
                        <span className="font-medium text-primary-foreground">${base}</span>
                      </div>
                      {includeSpousalTrust ? (
                        <div className="flex justify-between gap-6 sm:max-w-xs">
                          <span>Spousal trust</span>
                          <span className="font-medium text-primary-foreground">
                            +${spousalTrustAddonDollars()}
                          </span>
                        </div>
                      ) : null}
                      {includeTrust ? (
                        <div className="flex justify-between gap-6 sm:max-w-xs">
                          <span>Living trust</span>
                          <span className="font-medium text-primary-foreground">
                            +${trustAddonDollars()}
                          </span>
                        </div>
                      ) : null}
                      <div className="flex justify-between gap-6 border-t border-primary-foreground/15 pt-2 sm:max-w-xs">
                        <span className="font-medium text-primary-foreground">Total</span>
                        <span className="font-serif text-3xl font-semibold text-primary-foreground">
                          ${total}
                        </span>
                      </div>
                    </div>
                    <p className="mt-2 text-[11px] text-primary-foreground/50">
                      Optional papers (POA, Directive, HIPAA) are included — they do not change the
                      total. This plan does not include a living trust.
                    </p>
                  </div>
                  <Button
                    size="lg"
                    onClick={openPayment}
                    disabled={offRamp}
                    className="h-14 w-full gap-2 rounded-full bg-accent px-10 text-base font-semibold text-accent-foreground shadow-[0_12px_28px_-12px_rgba(0,0,0,0.45)] hover:bg-accent/90 sm:w-auto sm:min-w-[220px]"
                  >
                    {offRamp ? 'Not available' : `Pay $${total}`}
                    {offRamp ? null : <ArrowRight className="h-4 w-4" strokeWidth={2} />}
                  </Button>
                </div>
                <p className="mt-4 text-xs text-primary-foreground/55">
                  By paying you agree to our{' '}
                  <Link to="/terms" className="underline underline-offset-4">
                    Terms
                  </Link>{' '}
                  and{' '}
                  <Link to="/disclaimer" className="underline underline-offset-4">
                    Disclaimer
                  </Link>
                  . After payment you start the questionnaire immediately. We also email a resume
                  link (valid 30 days).
                </p>
              </div>
      </div>

      <StripeCheckoutModal
        open={payOpen}
        draft={checkoutDraft}
        onClose={() => setPayOpen(false)}
        onPaid={handlePaid}
      />
    </CheckoutFlowShell>
  )
}
