import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowRight, BadgeCheck, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollReveal } from '@/components/site/ScrollReveal'
import { cn } from '@/lib/utils'
import { type OrderDraft, type Plan, saveOrderDraft } from '@/lib/order'

const INCLUDED = [
  'Texas Last Will and Testament',
  'Attorney review on every order',
  'Texas-specific signing instructions',
  'Next business day PDF delivery',
  'Lifetime document access',
] as const

function scrollToCheckout() {
  const el = document.getElementById('checkout')
  if (!el) return
  el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

export default function Pricing() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const planFromUrl = searchParams.get('plan')
  const initialPlan: Plan = planFromUrl === 'couples' ? 'couples' : 'individual'

  const [plan, setPlan] = useState<Plan>(initialPlan)
  const [email, setEmail] = useState('')
  const [partnerEmail, setPartnerEmail] = useState('')
  const [includeTrust, setIncludeTrust] = useState(false)
  const [lsrConsent, setLsrConsent] = useState(false)

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

  const base = plan === 'individual' ? 249 : 399
  const total = base + (includeTrust ? 50 : 0)

  const valid = useMemo(
    () =>
      /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) &&
      (plan === 'individual' || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(partnerEmail)) &&
      lsrConsent,
    [email, partnerEmail, plan, lsrConsent],
  )

  function continueToForm() {
    if (!valid) return
    const order: OrderDraft = {
      plan,
      email,
      partnerEmail: plan === 'couples' ? partnerEmail : undefined,
      includeTrust,
      total,
      lsrConsent,
    }
    saveOrderDraft(order)
    navigate('/questionnaire')
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
                    ? 'border-primary bg-primary text-primary-foreground shadow-[0_18px_40px_-20px_rgba(15,23,42,0.45)] ring-2 ring-accent/40'
                    : 'border-primary/15 bg-primary text-primary-foreground hover:-translate-y-0.5 hover:bg-primary/95',
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-primary-foreground/70">
                    Couples
                  </span>
                  <span className="rounded-full bg-accent px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-accent-foreground">
                    {plan === 'couples' ? 'Selected' : 'Best value'}
                  </span>
                </div>
                <div className="mt-3 flex items-end gap-1.5">
                  <span className="font-serif text-5xl font-semibold leading-none">$399</span>
                  <span className="mb-1 text-sm font-medium text-accent">flat</span>
                </div>
                <p className="mt-3 text-sm text-primary-foreground/75">
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
              2 · Your details
            </p>

            <div className="space-y-4 rounded-[1.75rem] border border-border/70 bg-card p-6 shadow-[0_18px_50px_-32px_rgba(15,23,42,0.28)] sm:p-8">
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
                    Add a Revocable Living Trust{' '}
                    <span className="text-accent">+$50</span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Optional. Recommended if you own real property outside Texas.
                  </p>
                </div>
              </label>

              <div className={cn('grid gap-4', plan === 'couples' && 'sm:grid-cols-2')}>
                <div>
                  <Label htmlFor="email">Your email</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="mt-2"
                  />
                </div>
                {plan === 'couples' ? (
                  <div>
                    <Label htmlFor="partner">Partner's email</Label>
                    <Input
                      id="partner"
                      type="email"
                      value={partnerEmail}
                      onChange={(e) => setPartnerEmail(e.target.value)}
                      placeholder="partner@example.com"
                      className="mt-2"
                    />
                  </div>
                ) : null}
              </div>

              <div className="flex items-start gap-3 rounded-2xl bg-secondary/50 p-4">
                <Checkbox
                  id="lsr"
                  checked={lsrConsent}
                  onCheckedChange={(v) => setLsrConsent(v === true)}
                  className="mt-0.5"
                />
                <Label
                  htmlFor="lsr"
                  className="text-sm font-normal leading-relaxed text-muted-foreground"
                >
                  I agree to Limited Scope Representation (LSR) with Texas Ai Law Group, PLLC —
                  questionnaire review in a standard Texas will template only.{' '}
                  <Link to="/faq#lsr" className="underline underline-offset-4">
                    Learn more
                  </Link>
                  .
                </Label>
              </div>
            </div>
          </ScrollReveal>

          <ScrollReveal variant="up" delay={80} className="mt-6">
            <p className="mb-4 text-center text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              3 · Pay
            </p>
            <div className="overflow-hidden rounded-[1.75rem] bg-primary p-6 text-primary-foreground shadow-[0_24px_60px_-30px_rgba(15,23,42,0.5)] sm:p-7">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-xs uppercase tracking-wider text-primary-foreground/65">
                    {plan === 'individual' ? 'Individual' : 'Couples'}
                    {includeTrust ? ' + living trust' : ''}
                  </div>
                  <div className="mt-1 font-serif text-4xl font-semibold">${total}</div>
                  {includeTrust ? (
                    <p className="mt-1 text-xs text-primary-foreground/60">
                      ${base} + $50 trust
                    </p>
                  ) : null}
                </div>
                <Button
                  size="lg"
                  disabled={!valid}
                  onClick={continueToForm}
                  className="h-12 gap-2 rounded-full bg-accent px-8 text-accent-foreground hover:bg-accent/90 disabled:opacity-40"
                >
                  Continue to payment
                  <ArrowRight className="h-4 w-4" strokeWidth={2} />
                </Button>
              </div>
              <p className="mt-4 text-xs text-primary-foreground/55">
                By continuing you agree to our{' '}
                <Link to="/terms" className="underline underline-offset-4">
                  Terms
                </Link>{' '}
                and{' '}
                <Link to="/disclaimer" className="underline underline-offset-4">
                  Disclaimer
                </Link>
                . Next you’ll fill out your will questionnaire.
              </p>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </>
  )
}
