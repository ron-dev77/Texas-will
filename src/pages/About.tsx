import { Link } from 'react-router-dom'
import {
  ArrowRight,
  BadgeCheck,
  Clock3,
  Quote,
  Scale,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollReveal } from '@/components/site/ScrollReveal'
import ceoPhoto from '@/assets/ceo.webp'

const PRINCIPLES = [
  {
    n: '01',
    title: 'One flat price',
    body: 'No subscriptions, no tiered access to the things that should be standard. Attorney review is included — not an upsell.',
    Icon: Sparkles,
  },
  {
    n: '02',
    title: 'Ten focused minutes',
    body: 'Guided questions built around Texas law — not a stack of irrelevant forms. One question at a time.',
    Icon: Clock3,
  },
  {
    n: '03',
    title: 'Attorney review always',
    body: 'A licensed Texas attorney reads your specific document before delivery. Every order. No exceptions.',
    Icon: Scale,
  },
] as const

export default function About() {
  return (
    <>
      {/* Tall hero */}
      <section className="relative flex min-h-[70dvh] items-center overflow-hidden border-b border-border/60">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_oklch(0.94_0.02_85)_0%,_transparent_55%),radial-gradient(circle_at_90%_15%,_oklch(0.9_0.05_45_/_0.28)_0%,_transparent_40%)]"
        />
        <div
          aria-hidden="true"
          className="hero-orb pointer-events-none absolute -left-20 top-24 h-72 w-72 rounded-full bg-accent/12 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="hero-orb-delayed pointer-events-none absolute -right-16 bottom-10 h-80 w-80 rounded-full bg-primary/5 blur-3xl"
        />

        <div className="relative mx-auto w-full max-w-6xl px-5 py-20 sm:px-8 sm:py-28 lg:py-32">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-card/90 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-accent shadow-sm">
              <ShieldCheck className="h-3.5 w-3.5" strokeWidth={1.75} />
              About My AI Will
            </div>
            <h1 className="mt-7 font-serif text-4xl leading-[1.05] tracking-tight text-foreground sm:text-5xl lg:text-[3.75rem]">
              Built for the Texans who keep putting it off.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
              Most Texans know they need a will. Most don't have one. The reasons are almost always
              the same: it feels expensive, it feels overwhelming, and nothing forces the
              conversation today instead of someday.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              {[
                'Licensed Texas attorney review',
                'Software — not a law firm',
                'Built in Texas',
              ].map((label) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-card/90 px-4 py-2 text-sm font-medium text-foreground shadow-sm"
                >
                  <BadgeCheck className="h-4 w-4 text-accent" strokeWidth={1.75} />
                  {label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Why we exist — generous height */}
      <section className="bg-background py-20 sm:py-28 lg:py-32">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <ScrollReveal variant="up">
              <div className="text-xs font-medium uppercase tracking-[0.18em] text-accent">
                Why we exist
              </div>
              <h2 className="mt-4 font-serif text-3xl leading-tight text-foreground sm:text-4xl lg:text-5xl">
                Remove every reason to wait.
              </h2>
              <p className="mt-6 text-lg leading-relaxed text-muted-foreground sm:text-xl">
                My AI Will exists to remove every one of those reasons. One flat price. Ten minutes
                of guided questions. A real Texas attorney reading your specific document. A signed
                will by tomorrow.
              </p>
              <p className="mt-5 text-base leading-relaxed text-muted-foreground sm:text-lg">
                We're a software company that respects the law and respects your time. We don't sell
                upsells, subscriptions, or tiered access to the things that should be standard.
              </p>
            </ScrollReveal>
          </div>

          <div className="mt-16 grid gap-5 md:grid-cols-3 md:gap-6">
            {PRINCIPLES.map(({ n, title, body, Icon }, i) => (
              <ScrollReveal key={title} variant="up" delay={i * 90} className="h-full">
                <div className="group relative flex h-full min-h-[280px] flex-col overflow-hidden rounded-[1.75rem] border border-border/70 bg-card p-7 shadow-[0_18px_50px_-30px_rgba(15,23,42,0.3)] transition duration-300 hover:-translate-y-1.5 hover:border-accent/40 sm:min-h-[320px] sm:p-8">
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute -right-2 -top-4 font-serif text-8xl font-semibold tracking-tight text-accent/[0.07]"
                  >
                    {n}
                  </div>
                  <div className="relative flex items-center justify-between">
                    <span className="inline-flex h-9 items-center rounded-full bg-secondary px-3 text-xs font-semibold tracking-[0.14em] text-accent">
                      {n}
                    </span>
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary text-accent transition duration-500 group-hover:bg-accent group-hover:text-accent-foreground">
                      <Icon className="h-5 w-5" strokeWidth={1.75} />
                    </div>
                  </div>
                  <h3 className="relative mt-10 font-serif text-2xl leading-snug text-foreground">
                    {title}
                  </h3>
                  <p className="relative mt-4 flex-1 text-base leading-relaxed text-muted-foreground">
                    {body}
                  </p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Founder — tall split */}
      <section className="bg-secondary/50 py-20 sm:py-28 lg:py-32">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <ScrollReveal variant="up">
            <div className="overflow-hidden rounded-[2rem] border border-border/70 bg-card shadow-[0_28px_70px_-40px_rgba(15,23,42,0.4)]">
              <div className="grid lg:grid-cols-[0.95fr_1.05fr]">
                <div className="relative min-h-[420px] overflow-hidden bg-primary sm:min-h-[480px] lg:min-h-[560px]">
                  <img
                    src={ceoPhoto}
                    alt="Scott Pappas, licensed Texas attorney and founder of My AI Will"
                    className="absolute inset-0 h-full w-full object-cover object-[center_18%] transition-transform duration-700 hover:scale-105"
                  />
                  <div
                    aria-hidden="true"
                    className="absolute inset-0 bg-gradient-to-t from-primary via-primary/30 to-transparent"
                  />
                  <div className="absolute inset-x-0 bottom-0 p-8 sm:p-10">
                    <div className="font-serif text-3xl text-primary-foreground sm:text-4xl">
                      Scott Pappas
                    </div>
                    <div className="mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-accent">
                      Licensed Texas Attorney · Founder
                    </div>
                  </div>
                </div>

                <div className="relative flex flex-col justify-center px-8 py-12 sm:px-12 sm:py-16 lg:px-14 lg:py-20">
                  <div className="absolute inset-x-0 top-0 h-1.5 bg-accent lg:inset-x-auto lg:inset-y-0 lg:left-0 lg:h-auto lg:w-1.5" />
                  <Quote className="h-10 w-10 text-accent" strokeWidth={1.5} aria-hidden="true" />
                  <blockquote className="mt-6 font-serif text-2xl italic leading-relaxed text-foreground sm:text-3xl">
                    "I built My AI Will because I saw that most Texans who need a simple will keep
                    putting it off — not because they don't care, but because the options are either
                    expensive or overwhelming. This is the product I wished existed."
                  </blockquote>
                  <div className="mt-10 flex flex-wrap gap-2.5">
                    {['Licensed Texas attorney', 'Founder', 'Built for Texas'].map((label) => (
                      <span
                        key={label}
                        className="inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-secondary/70 px-3.5 py-2 text-sm font-medium text-foreground"
                      >
                        <ShieldCheck className="h-4 w-4 text-accent" strokeWidth={1.75} />
                        {label}
                      </span>
                    ))}
                  </div>
                  <div className="mt-10">
                    <Button asChild size="lg" variant="outline" className="h-12 gap-2 rounded-full px-7">
                      <Link to="/contact">
                        Get in touch
                        <ArrowRight className="h-4 w-4" strokeWidth={2} />
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* CTA — homepage style, tall */}
      <section className="bg-background py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <ScrollReveal variant="scale">
            <div className="relative overflow-hidden rounded-[2rem] bg-primary px-6 py-16 text-primary-foreground shadow-[0_28px_70px_-36px_rgba(15,23,42,0.55)] sm:px-12 sm:py-20 lg:px-16 lg:py-24">
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
                <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-accent">
                  <ShieldCheck className="h-3.5 w-3.5" strokeWidth={1.75} />
                  Built for Texas · Attorney reviewed
                </div>
                <h2 className="mt-6 font-serif text-4xl leading-tight sm:text-5xl lg:text-6xl">
                  Ready to get it done?
                </h2>
                <p className="mx-auto mt-5 max-w-xl text-base text-primary-foreground/75 sm:text-lg">
                  Start your Texas will today — attorney review included on every order.
                </p>
              </div>

              <div className="relative mx-auto mt-10 grid max-w-2xl gap-3 sm:grid-cols-2">
                <Link
                  to="/pricing?plan=individual#checkout"
                  className="group rounded-2xl border border-white/10 bg-white px-6 py-6 text-left text-foreground shadow-lg transition duration-300 hover:-translate-y-1 hover:shadow-xl"
                >
                  <div className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Individual
                  </div>
                  <div className="mt-1 flex items-end gap-1.5">
                    <span className="font-serif text-4xl font-semibold leading-none">$249</span>
                    <span className="mb-1 text-sm font-medium text-accent">flat</span>
                  </div>
                  <div className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium">
                    Start my will
                    <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                  </div>
                </Link>
                <Link
                  to="/pricing?plan=couples#checkout"
                  className="group rounded-2xl border border-accent/40 bg-accent px-6 py-6 text-left text-accent-foreground shadow-lg transition duration-300 hover:-translate-y-1 hover:bg-accent/95 hover:shadow-xl"
                >
                  <div className="text-xs font-semibold uppercase tracking-[0.14em] text-accent-foreground/80">
                    Couples
                  </div>
                  <div className="mt-1 flex items-end gap-1.5">
                    <span className="font-serif text-4xl font-semibold leading-none">$399</span>
                    <span className="mb-1 text-sm font-medium text-accent-foreground/90">flat</span>
                  </div>
                  <div className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium">
                    Start our wills
                    <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                  </div>
                </Link>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </>
  )
}
