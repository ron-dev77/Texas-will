import { Link } from 'react-router-dom'
import {
  ArrowRight,
  BadgeCheck,
  Briefcase,
  Building2,
  FileText,
  FolderOpen,
  Home,
  Scale,
  ScrollText,
  ShieldCheck,
  ShieldPlus,
  Users,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PlanPairCards } from '@/components/site/PlanPairCards'
import { ScrollReveal } from '@/components/site/ScrollReveal'
import { cn } from '@/lib/utils'
import { startWillPath } from '@/lib/start-will-path'

const DELIVERABLES = [
  {
    n: '01',
    t: 'A complete Texas Last Will and Testament',
    d: 'Drafted from your answers using language built around the Texas Estates Code. Names beneficiaries, an executor, and (if relevant) guardians for minor children.',
    Icon: FileText,
    tone: 'light' as const,
  },
  {
    n: '02',
    t: 'Attorney review on every single order',
    d: 'A licensed Texas attorney reads your specific will before it reaches you. Not an automated checklist. A real review.',
    Icon: Scale,
    tone: 'dark' as const,
  },
  {
    n: '03',
    t: 'Texas-specific signing instructions',
    d: 'A plain-English guide for the witness and self-proving affidavit requirements that make a Texas will valid. No legal jargon.',
    Icon: ScrollText,
    tone: 'light' as const,
  },
  {
    n: '04',
    t: 'PDF delivery by the next business day',
    d: 'Your reviewed will arrives in your inbox as a print-ready PDF. Sign, witness, and store it somewhere safe.',
    Icon: BadgeCheck,
    tone: 'light' as const,
  },
  {
    n: '05',
    t: 'Lifetime access to your document',
    d: 'Log back in any time to download a fresh copy. If your situation changes meaningfully, you can update for a small fee — never a subscription.',
    Icon: FolderOpen,
    tone: 'light' as const,
  },
  {
    n: '06',
    t: 'Honest about when a living trust is a better fit',
    d: 'This product is a Texas will, not a living trust. If you own property out of state, a private company interest, or need extra privacy, we point you to Texas estate-planning law firms instead of selling you the wrong tool.',
    Icon: ShieldPlus,
    tone: 'accent' as const,
  },
] as const

export default function WhatYouGet() {
  return (
    <>
      {/* Hero — split composition */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_oklch(0.94_0.02_85)_0%,_transparent_50%),radial-gradient(circle_at_90%_10%,_oklch(0.9_0.05_45_/_0.28)_0%,_transparent_38%)]"
        />
        <div
          aria-hidden="true"
          className="hero-orb pointer-events-none absolute -right-24 top-20 h-80 w-80 rounded-full bg-accent/15 blur-3xl"
        />

        <div className="relative mx-auto grid max-w-6xl items-end gap-12 px-5 py-16 sm:px-8 sm:py-24 lg:grid-cols-[1.15fr_0.85fr] lg:gap-16">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-card/90 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-accent shadow-sm">
              <ShieldCheck className="h-3.5 w-3.5" strokeWidth={1.75} />
              What you get
            </div>
            <h1 className="mt-6 max-w-xl font-serif text-4xl leading-[1.05] tracking-tight text-foreground sm:text-5xl lg:text-[3.6rem]">
              Everything you need. Nothing you don't.
            </h1>
            <p className="mt-5 max-w-lg text-lg leading-relaxed text-muted-foreground">
              One flat price. Every important thing already included — attorney review is the
              baseline, not an upgrade.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="h-12 gap-2 rounded-full px-8">
                <Link to={startWillPath()}>
                  Start my will — $249
                  <ArrowRight className="h-4 w-4" strokeWidth={2} />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-12 rounded-full px-8">
                <Link to="/how-it-works">See how it works</Link>
              </Button>
            </div>
          </div>

          <ScrollReveal variant="right" className="w-full">
            <div className="relative overflow-hidden rounded-[1.75rem] bg-primary p-6 text-primary-foreground shadow-[0_28px_70px_-36px_rgba(15,23,42,0.55)] sm:p-8">
              <div className="absolute inset-x-0 top-0 h-1.5 bg-accent" />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-10 bottom-0 h-40 w-40 rounded-full bg-accent/20 blur-3xl"
              />
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">
                Flat pricing
              </p>
              <div className="mt-6">
                <PlanPairCards surface="onDark" compact stack />
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Deliverables — editorial numbered stack */}
      <section className="border-t border-border/60 bg-secondary/40 py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <ScrollReveal variant="up" className="max-w-2xl">
            <div className="text-xs font-medium uppercase tracking-[0.18em] text-accent">
              Included with every order
            </div>
            <h2 className="mt-3 font-serif text-3xl leading-tight text-foreground sm:text-4xl lg:text-[2.75rem]">
              Six deliverables. Zero filler.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
              This is the full package — not a feature comparison table with half the important
              things locked behind a higher tier.
            </p>
          </ScrollReveal>

          <ol className="relative mt-14 space-y-5">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute left-[1.65rem] top-8 bottom-8 hidden w-px bg-gradient-to-b from-accent/20 via-accent/50 to-accent/20 sm:block"
            />

            {DELIVERABLES.map(({ n, t, d, Icon, tone }, i) => {
              const isDark = tone === 'dark'
              const isAccent = tone === 'accent'
              return (
                <ScrollReveal key={t} variant="up" delay={Math.min(i, 5) * 70}>
                  <li
                    className={cn(
                      'group relative overflow-hidden rounded-[1.75rem] transition duration-300 hover:-translate-y-1',
                      isDark &&
                        'bg-primary text-primary-foreground shadow-[0_28px_70px_-36px_rgba(15,23,42,0.55)]',
                      isAccent &&
                        'border border-accent/35 bg-accent/[0.08] shadow-[0_18px_50px_-30px_rgba(15,23,42,0.28)]',
                      !isDark &&
                        !isAccent &&
                        'border border-border/70 bg-card shadow-[0_18px_50px_-30px_rgba(15,23,42,0.28)] hover:border-accent/40',
                    )}
                  >
                    {isDark ? <div className="absolute inset-x-0 top-0 h-1.5 bg-accent" /> : null}
                    <div className="grid gap-5 p-6 sm:grid-cols-[auto_1fr_auto] sm:items-center sm:gap-8 sm:p-8 lg:p-9">
                      <div className="flex items-center gap-4 sm:flex-col sm:items-center sm:gap-3">
                        <span
                          className={cn(
                            'relative z-10 flex h-14 w-14 items-center justify-center rounded-full font-serif text-lg font-semibold',
                            isDark && 'bg-white/10 text-accent ring-8 ring-primary',
                            isAccent && 'bg-accent text-accent-foreground ring-8 ring-secondary/70',
                            !isDark &&
                              !isAccent &&
                              'bg-secondary text-accent ring-8 ring-secondary/70',
                          )}
                        >
                          {n}
                        </span>
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-3">
                          {isDark ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">
                              Baseline — not an upgrade
                            </span>
                          ) : null}
                          {isAccent ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-accent-foreground">
                              Optional add-on
                            </span>
                          ) : null}
                        </div>
                        <h3
                          className={cn(
                            'mt-2 font-serif text-2xl leading-snug sm:text-[1.65rem]',
                            isDark ? 'text-primary-foreground' : 'text-foreground',
                          )}
                        >
                          {t}
                        </h3>
                        <p
                          className={cn(
                            'mt-3 max-w-2xl text-sm leading-relaxed sm:text-base',
                            isDark
                              ? 'text-primary-foreground/70'
                              : 'text-muted-foreground',
                          )}
                        >
                          {d}
                        </p>
                      </div>

                      <div
                        className={cn(
                          'flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl transition duration-500 group-hover:scale-105',
                          isDark &&
                            'bg-white/10 text-accent ring-1 ring-white/15 group-hover:bg-accent group-hover:text-accent-foreground',
                          isAccent &&
                            'bg-accent text-accent-foreground',
                          !isDark &&
                            !isAccent &&
                            'bg-secondary text-accent group-hover:bg-accent group-hover:text-accent-foreground',
                        )}
                      >
                        <Icon
                          className="h-6 w-6 transition-transform duration-700 group-hover:rotate-[360deg]"
                          strokeWidth={1.75}
                        />
                      </div>
                    </div>
                  </li>
                </ScrollReveal>
              )
            })}
          </ol>
        </div>
      </section>

      {/* Honesty */}
      <section className="relative overflow-hidden bg-background py-16 sm:py-24">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_80%,_oklch(0.92_0.03_255_/_0.14)_0%,_transparent_40%)]"
        />
        <div className="relative mx-auto max-w-6xl px-5 sm:px-8">
          <ScrollReveal variant="up">
            <div className="overflow-hidden rounded-[2rem] border border-border/70 bg-card shadow-[0_28px_70px_-40px_rgba(15,23,42,0.35)]">
              <div className="grid lg:grid-cols-[1.05fr_0.95fr]">
                <div className="relative flex flex-col justify-center px-7 py-10 sm:px-10 sm:py-14 lg:px-12">
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute -left-16 top-8 h-48 w-48 rounded-full bg-accent/10 blur-3xl"
                  />
                  <div className="relative text-xs font-semibold uppercase tracking-[0.18em] text-accent">
                    Honesty first
                  </div>
                  <h2 className="relative mt-4 max-w-xl font-serif text-3xl leading-tight text-foreground sm:text-4xl lg:text-[2.75rem]">
                    When My AI Will isn't the right fit
                  </h2>
                  <p className="relative mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                    If you have multiple properties, own a business, have a blended family with
                    complicated dynamics, or significant estate-tax planning needs, we'll tell you
                    that upfront and recommend you work directly with an attorney. We'd rather be
                    honest than sell you something that doesn't serve you.
                  </p>
                </div>

                <div className="relative border-t border-border/70 bg-primary p-7 text-primary-foreground sm:p-9 lg:border-l lg:border-t-0 lg:p-10">
                  <div className="absolute inset-x-0 top-0 h-1.5 bg-accent lg:inset-x-auto lg:inset-y-0 lg:left-0 lg:h-auto lg:w-1.5" />
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">
                    Better served by a full attorney
                  </p>
                  <ul className="mt-6 grid gap-3">
                    {[
                      { label: 'Multiple properties', Icon: Home },
                      { label: 'Business ownership', Icon: Briefcase },
                      { label: 'Complex blended family', Icon: Users },
                      { label: 'Estate-tax planning', Icon: Building2 },
                    ].map(({ label, Icon }) => (
                      <li
                        key={label}
                        className="group flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3.5 transition duration-300 hover:border-accent/40 hover:bg-white/10"
                      >
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-accent transition group-hover:bg-accent group-hover:text-accent-foreground">
                          <Icon className="h-4 w-4" strokeWidth={1.75} />
                        </span>
                        <span className="text-sm font-medium text-primary-foreground sm:text-base">
                          {label}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* CTA — homepage-style pricing band */}
      <section className="pb-24">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <ScrollReveal variant="scale">
            <div className="relative overflow-hidden rounded-[2rem] bg-primary px-6 py-14 text-primary-foreground shadow-[0_28px_70px_-36px_rgba(15,23,42,0.55)] sm:px-12 sm:py-16 lg:px-16 lg:py-20">
              <div className="absolute inset-x-0 top-0 h-1.5 bg-accent" />
              <div
                aria-hidden="true"
                className="hero-orb pointer-events-none absolute -left-20 top-0 h-64 w-64 rounded-full bg-accent/25 blur-3xl"
              />
              <div
                aria-hidden="true"
                className="hero-orb-delayed pointer-events-none absolute -right-16 bottom-0 h-72 w-72 rounded-full bg-white/10 blur-3xl"
              />

              <div className="relative mx-auto max-w-3xl text-center">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-accent backdrop-blur-sm">
                  <ShieldCheck className="h-3.5 w-3.5" strokeWidth={1.75} />
                  Built for Texas · Attorney reviewed
                </div>
                <h2 className="mt-6 font-serif text-4xl leading-tight sm:text-5xl lg:text-6xl">
                  Your will. Done tomorrow.
                </h2>
                <p className="mx-auto mt-5 max-w-xl text-base text-primary-foreground/75 sm:text-lg">
                  The first AI-powered will platform built for Texas. Attorney review included. No
                  subscriptions.
                </p>
              </div>

              <div className="relative mx-auto mt-10 max-w-2xl">
                <PlanPairCards surface="onDark" />
              </div>

              <div className="relative mx-auto mt-7 flex max-w-2xl flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-primary-foreground/70">
                {[
                  'Attorney review included',
                  'No subscriptions',
                  'Next business day delivery',
                ].map((label) => (
                  <span key={label} className="inline-flex items-center gap-1.5">
                    <BadgeCheck className="h-3.5 w-3.5 text-accent" strokeWidth={1.75} />
                    {label}
                  </span>
                ))}
              </div>

              <div className="relative mt-8 flex justify-center">
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="h-11 rounded-full border-white/20 bg-white/5 px-7 text-primary-foreground hover:bg-white/10 hover:text-primary-foreground"
                >
                  <Link to="/faq">
                    Still have questions? Read the FAQ
                    <ArrowRight className="h-4 w-4" strokeWidth={2} />
                  </Link>
                </Button>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </>
  )
}
