import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowRight, BadgeCheck, CheckCircle2, Mail, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollReveal } from '@/components/site/ScrollReveal'
import {
  StripeCheckoutModal,
  type PaymentSuccessInfo,
} from '@/components/checkout/StripeCheckoutModal'
import { cn } from '@/lib/utils'
import { savePaidOrderDraft } from '@/lib/checkout'
import {
  computeTotalDollars,
  planPriceDollars,
  trustAddonDollars,
} from '@/lib/pricing'
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

const INCLUDED = [
  'Texas Last Will and Testament',
  'Attorney review on every order',
  'Texas-specific signing instructions',
  'Next business day PDF delivery',
  'Lifetime document access',
] as const

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

function scrollToCheckout() {
  const el = document.getElementById('checkout')
  if (!el) return
  el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function formatExpiry(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'America/Chicago',
    })
  } catch {
    return '30 days from today'
  }
}

export default function Pricing() {
  const [searchParams] = useSearchParams()
  const planFromUrl = searchParams.get('plan')
  const initialPlan: Plan = planFromUrl === 'couples' ? 'couples' : 'individual'

  const [plan, setPlan] = useState<Plan>(initialPlan)
  const [email, setEmail] = useState('')
  const [partnerEmail, setPartnerEmail] = useState('')
  const [includeTrust, setIncludeTrust] = useState(false)
  const [documents, setDocuments] = useState<PackageDocId[]>(['will'])
  const [lsrConsent, setLsrConsent] = useState(false)
  const [showErrors, setShowErrors] = useState(false)
  const [payOpen, setPayOpen] = useState(false)
  const [checkoutDraft, setCheckoutDraft] = useState<OrderDraft | null>(null)
  const [paid, setPaid] = useState<PaymentSuccessInfo | null>(null)

  useEffect(() => {
    if (planFromUrl === 'individual' || planFromUrl === 'couples') {
      setPlan(planFromUrl)
    }
  }, [planFromUrl])

  useEffect(() => {
    if (window.location.hash !== '#checkout') return
    const t1 = window.setTimeout(scrollToCheckout, 50)
    const t2 = window.setTimeout(scrollToCheckout, 300)
    return () => {
      window.clearTimeout(t1)
      window.clearTimeout(t2)
    }
  }, [planFromUrl])

  function selectPlan(next: Plan) {
    setPlan(next)
    window.setTimeout(scrollToCheckout, 80)
  }

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
  const trustFee = trustAddonDollars()
  const total = computeTotalDollars(plan, includeTrust)

  const valid = useMemo(
    () => emailOk && partnerOk && partnerDifferent && lsrConsent && hasWill,
    [emailOk, partnerOk, partnerDifferent, lsrConsent, hasWill],
  )

  function openPayment() {
    setShowErrors(true)
    if (!valid) return
    const draft: OrderDraft = {
      plan,
      email: email.trim().toLowerCase(),
      partnerEmail: plan === 'couples' ? partnerEmail.trim().toLowerCase() : undefined,
      includeTrust,
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
    setPaid(info)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (paid) {
    const expiresLabel = formatExpiry(paid.expiresAt)
    return (
      <section className="relative overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_oklch(0.94_0.02_85)_0%,_transparent_55%),radial-gradient(circle_at_85%_15%,_oklch(0.9_0.05_45_/_0.22)_0%,_transparent_40%)]"
        />
        <div className="relative mx-auto max-w-2xl px-5 py-20 sm:px-8 sm:py-28">
          <div className="rounded-[1.75rem] border border-border/70 bg-card p-8 text-center shadow-[0_24px_60px_-36px_rgba(15,23,42,0.35)] sm:p-10">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-sage/40 text-primary">
              <CheckCircle2 className="h-7 w-7" strokeWidth={1.5} />
            </div>
            <p className="mt-5 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Payment received
            </p>
            <h1 className="mt-3 font-serif text-3xl tracking-tight text-foreground sm:text-4xl">
              Check your email to continue
            </h1>
            <p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-muted-foreground">
              We sent a secure questionnaire link to{' '}
              <span className="font-medium text-foreground">{paid.userEmail}</span>
              {paid.plan === 'couples' && paid.partnerEmail ? (
                <>
                  {' '}
                  and <span className="font-medium text-foreground">{paid.partnerEmail}</span>
                </>
              ) : null}
              . Each person has <strong className="font-medium text-foreground">30 days</strong> (until{' '}
              {expiresLabel}) to complete their form.
            </p>

            <div className="mx-auto mt-8 max-w-sm rounded-2xl border border-border/70 bg-secondary/40 px-5 py-4 text-left">
              <div className="flex items-start gap-3">
                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-accent" strokeWidth={1.75} />
                <div className="text-sm text-muted-foreground">
                  <p className="font-medium text-foreground">What to do next</p>
                  <ol className="mt-2 list-decimal space-y-1.5 pl-4">
                    <li>Open the email from My AI Will</li>
                    <li>Click your private questionnaire link</li>
                    <li>Finish before {expiresLabel}</li>
                  </ol>
                </div>
              </div>
            </div>

            {!paid.emailsSent ? (
              <p className="mt-4 text-sm text-accent">
                Payment succeeded. If you do not see the email within a few minutes, check spam or
                contact scott@myaiwill.com.
              </p>
            ) : null}

            <p className="mt-8 text-xs text-muted-foreground">
              Order {paid.orderId.slice(0, 8)}… · $
              {paid.total}
              {paid.plan === 'individual' || paid.plan === 'couples'
                ? ` paid (${paid.plan === 'couples' ? '$399' : '$249'}${
                    paid.total > (paid.plan === 'couples' ? 399 : 249)
                      ? ' + $50 Living Trust add-on'
                      : ''
                  })`
                : ' paid'}
            </p>
            <Button asChild variant="outline" className="mt-6 rounded-full">
              <Link to="/">Back to home</Link>
            </Button>
          </div>
        </div>
      </section>
    )
  }

  return (
    <>
      <section className="relative overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_oklch(0.94_0.02_85)_0%,_transparent_55%),radial-gradient(circle_at_85%_15%,_oklch(0.9_0.05_45_/_0.22)_0%,_transparent_40%)]"
        />

        <div className="relative mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-card/90 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-accent shadow-sm">
              <ShieldCheck className="h-3.5 w-3.5" strokeWidth={1.75} />
              Pricing
            </div>
            <h1 className="mt-5 font-serif text-4xl leading-[1.05] tracking-tight text-foreground sm:text-5xl">
              One flat price. Everything included.
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
              Attorney review in every order. No subscriptions.
            </p>
          </div>

          <ScrollReveal variant="up" className="mx-auto mt-12 max-w-3xl">
            <p className="mb-4 text-center text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              1 · Choose your plan
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => selectPlan('individual')}
                className={cn(
                  'rounded-2xl border p-6 text-left transition duration-300 sm:p-7',
                  plan === 'individual'
                    ? 'border-accent bg-card shadow-[0_18px_40px_-20px_rgba(15,23,42,0.3)] ring-2 ring-accent/30'
                    : 'border-border/80 bg-card hover:-translate-y-0.5 hover:border-accent/40',
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Individual
                  </span>
                  {plan === 'individual' ? (
                    <span className="rounded-full bg-accent px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-accent-foreground">
                      Selected
                    </span>
                  ) : null}
                </div>
                <div className="mt-3 flex items-end gap-1.5">
                  <span className="font-serif text-5xl font-semibold leading-none text-foreground">
                    $249
                  </span>
                  <span className="mb-1 text-sm font-medium text-accent">flat</span>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">A complete will for one person.</p>
              </button>

              <button
                type="button"
                onClick={() => selectPlan('couples')}
                className={cn(
                  'relative rounded-2xl border p-6 text-left transition duration-300 sm:p-7',
                  plan === 'couples'
                    ? 'border-accent bg-card shadow-[0_18px_40px_-20px_rgba(15,23,42,0.3)] ring-2 ring-accent/30'
                    : 'border-border/80 bg-card hover:-translate-y-0.5 hover:border-accent/40',
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Couples
                  </span>
                  <div className="flex flex-wrap items-center justify-end gap-1.5">
                    <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                      Most Popular
                    </span>
                    {plan === 'couples' ? (
                      <span className="rounded-full bg-accent px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-accent-foreground">
                        Selected
                      </span>
                    ) : null}
                  </div>
                </div>
                <div className="mt-3 flex items-end gap-1.5">
                  <span className="font-serif text-5xl font-semibold leading-none text-foreground">
                    $399
                  </span>
                  <span className="mb-1 text-sm font-medium text-accent">flat</span>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">
                  Two coordinated wills for partners.
                </p>
              </button>
            </div>
          </ScrollReveal>

          <ScrollReveal variant="up" delay={60} className="mx-auto mt-8 max-w-3xl">
            <div className="rounded-2xl border border-border/70 bg-card px-5 py-5 sm:px-6">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Included with either plan
              </p>
              <ul className="mt-3 grid gap-2.5 sm:grid-cols-2">
                {INCLUDED.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-foreground">
                    <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-accent" strokeWidth={1.75} />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          </ScrollReveal>
        </div>
      </section>

      <section
        id="checkout"
        className="scroll-mt-24 border-t border-border/60 bg-secondary/40 py-14 sm:py-18"
      >
        <div className="mx-auto max-w-3xl px-5 sm:px-8">
          <ScrollReveal variant="up">
            <p className="mb-4 text-center text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              2 · Details &amp; payment
            </p>

            <div className="overflow-hidden rounded-[1.75rem] border border-border/70 bg-card shadow-[0_18px_50px_-32px_rgba(15,23,42,0.28)]">
              <div className="space-y-4 p-6 sm:p-8">
                <div className="space-y-3 rounded-2xl border border-border/70 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        Which documents do you want included?
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Your will is required. Other papers are optional and included in the same
                        plan price — no +$50 per paper. The +$50 add-on is only for the Living Trust
                        below.
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

                <label
                  htmlFor="trust"
                  className={cn(
                    'flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition',
                    includeTrust
                      ? 'border-accent/40 bg-accent/5'
                      : 'border-border/70 hover:border-accent/30',
                  )}
                >
                  <Checkbox
                    id="trust"
                    checked={includeTrust}
                    onCheckedChange={(v) => setIncludeTrust(v === true)}
                    className="mt-0.5"
                  />
                  <div>
                    <div className="text-base font-medium text-foreground">
                      Do you want to add a Revocable Living Trust?{' '}
                      <span className="text-accent">+$50 add-on</span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Optional paid add-on only — not included in the document list above.{' '}
                      <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary-foreground">
                        Recommended
                      </span>{' '}
                      if you own real property outside Texas.
                    </p>
                  </div>
                </label>

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
                        We’ll send your private questionnaire link here.
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
                          Each of you gets a separate questionnaire link.
                        </p>
                      )}
                    </div>
                  ) : null}
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
                      {includeTrust ? (
                        <div className="flex justify-between gap-6 sm:max-w-xs">
                          <span>Living Trust add-on</span>
                          <span className="font-medium text-primary-foreground">+${trustFee}</span>
                        </div>
                      ) : (
                        <div className="text-xs text-primary-foreground/50">
                          No trust add-on selected
                        </div>
                      )}
                      <div className="flex justify-between gap-6 border-t border-primary-foreground/15 pt-2 sm:max-w-xs">
                        <span className="font-medium text-primary-foreground">Total</span>
                        <span className="font-serif text-3xl font-semibold text-primary-foreground">
                          ${total}
                        </span>
                      </div>
                    </div>
                    <p className="mt-2 text-[11px] text-primary-foreground/50">
                      Optional papers (POA, Directive, HIPAA) are included — they do not change the
                      total. Only the Living Trust adds ${trustFee}.
                    </p>
                  </div>
                  <Button
                    size="lg"
                    onClick={openPayment}
                    className="h-14 w-full gap-2 rounded-full bg-accent px-10 text-base font-semibold text-accent-foreground shadow-[0_12px_28px_-12px_rgba(0,0,0,0.45)] hover:bg-accent/90 sm:w-auto sm:min-w-[220px]"
                  >
                    Pay ${total}
                    <ArrowRight className="h-4 w-4" strokeWidth={2} />
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
                  . After payment, we email your questionnaire link (valid 30 days).
                </p>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      <StripeCheckoutModal
        open={payOpen}
        draft={checkoutDraft}
        onClose={() => setPayOpen(false)}
        onPaid={handlePaid}
      />
    </>
  )
}
