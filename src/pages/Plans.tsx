import { Link } from 'react-router-dom'
import { ArrowRight, BadgeCheck, ShieldCheck } from 'lucide-react'
import { PlanPairCards } from '@/components/site/PlanPairCards'
import { ScrollReveal } from '@/components/site/ScrollReveal'
import { WillBasedFitNote } from '@/components/site/WillBasedFitNote'
import { Button } from '@/components/ui/button'
import { startWillPath } from '@/lib/start-will-path'
import { trustAddonDollars } from '@/lib/pricing'

const INCLUDED = [
  'Texas Last Will and Testament',
  'Medical & Durable Power of Attorney (optional)',
  'Directive to Physicians & HIPAA (optional)',
  'Attorney review on every order',
  'Texas-specific signing instructions',
  'Next business day PDF delivery',
  'Lifetime document access',
] as const

export default function Plans() {
  const ctaPath = startWillPath()

  return (
    <>
      <section className="relative overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_oklch(0.98_0.01_85)_0%,_var(--background)_55%)]"
        />
        <div className="relative mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-card/90 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-accent shadow-sm">
              <ShieldCheck className="h-3.5 w-3.5" strokeWidth={1.75} />
              Simple pricing
            </div>
            <h1 className="mt-5 font-serif text-4xl leading-[1.05] tracking-tight sm:text-5xl">
              One flat price. Everything included.
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
              Attorney review in every order. No subscriptions, no hidden fees. Start with a short
              qualifier — then review your plan before you pay.
            </p>
          </div>

          <ScrollReveal variant="up" className="mx-auto mt-12 max-w-3xl">
            <PlanPairCards />
          </ScrollReveal>

          <ScrollReveal variant="up" delay={60} className="mx-auto mt-8 max-w-3xl">
            <div className="rounded-3xl border border-border/50 bg-card/90 px-5 py-5 shadow-sm sm:px-6">
              <p className="text-sm font-medium text-foreground">Included with either plan</p>
              <ul className="mt-4 grid gap-2.5 sm:grid-cols-2">
                {INCLUDED.map((line) => (
                  <li key={line} className="flex items-start gap-2 text-sm text-foreground">
                    <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-accent" strokeWidth={1.75} />
                    {line}
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-xs text-muted-foreground">
                Optional revocable living trust (+${trustAddonDollars()}) and spousal testamentary
                trust (if applicable) are chosen during qualify or on the pricing step — separate from base price.
              </p>
            </div>
          </ScrollReveal>
        </div>
      </section>

      <section className="border-t border-border/60 bg-secondary/30 py-14 sm:py-16">
        <div className="mx-auto max-w-3xl px-5 sm:px-8">
          <ScrollReveal variant="up">
            <WillBasedFitNote showFirms />
          </ScrollReveal>
        </div>
      </section>

      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-xl px-5 text-center sm:px-8">
          <h2 className="font-serif text-3xl tracking-tight">Ready when you are</h2>
          <p className="mt-3 text-sm text-muted-foreground">
            Two-minute qualifier · Plan summary · Secure payment · Questionnaire starts
            immediately after payment.
          </p>
          <Button asChild size="lg" className="mt-8 h-12 rounded-full px-8">
            <Link to={ctaPath}>
              {ctaPath === '/summary' ? 'Continue your will' : 'Start my will'}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>
    </>
  )
}
