import { Link } from 'react-router-dom'
import { type ReactNode } from 'react'
import {
  ArrowRight,
  BadgeCheck,
  CalendarOff,
  CircleDollarSign,
  ClipboardList,
  Clock3,
  CreditCard,
  Inbox,
  Layers,
  Mail,
  Quote,
  Scale,
  ShieldCheck,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PlanPairCards } from '@/components/site/PlanPairCards'
import { ScrollReveal } from '@/components/site/ScrollReveal'
import { FAQS } from '@/lib/faqs'
import { cn } from '@/lib/utils'
import ceoPhoto from '@/assets/ceo.webp'

function FounderPhoto() {
  return (
    <img
      src={ceoPhoto}
      alt="Scott Pappas, licensed Texas attorney and founder of My AI Will"
      className="absolute inset-0 h-full w-full object-cover object-[center_20%] transition-transform duration-700 ease-out group-hover:scale-110"
    />
  )
}

function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <div className="text-xs font-medium uppercase tracking-[0.18em] text-accent">{children}</div>
  )
}

function Section({
  children,
  className = '',
  tone = 'default',
}: {
  children: ReactNode
  className?: string
  tone?: 'default' | 'muted'
}) {
  return (
    <section
      className={cn(
        'w-full',
        tone === 'muted' ? 'bg-secondary/70' : 'bg-background',
        className,
      )}
    >
      <div className="mx-auto max-w-6xl px-5 sm:px-8">{children}</div>
    </section>
  )
}

export default function Home() {
  return (
    <>
      {/* Hero */}
      <section className="relative flex min-h-[calc(100dvh-4.25rem)] items-center overflow-hidden bg-background">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_oklch(0.94_0.02_85)_0%,_transparent_55%),radial-gradient(circle_at_85%_15%,_oklch(0.9_0.05_45_/_0.28)_0%,_transparent_40%),radial-gradient(circle_at_10%_80%,_oklch(0.92_0.03_255_/_0.18)_0%,_transparent_35%)]"
        />
        <div
          aria-hidden="true"
          className="hero-orb pointer-events-none absolute -left-24 top-16 h-72 w-72 rounded-full bg-accent/10 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="hero-orb-delayed pointer-events-none absolute -right-16 bottom-10 h-80 w-80 rounded-full bg-primary/5 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-background to-transparent"
        />

        <div className="relative mx-auto w-full max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
          <div className="mx-auto max-w-4xl text-center">
            <div className="animate-in fade-in zoom-in-95 duration-500 fill-mode-both">
              <div className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-card/90 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-accent shadow-sm backdrop-blur-sm">
                <ShieldCheck className="h-3.5 w-3.5 animate-pulse" strokeWidth={1.75} />
                Built for Texas · Attorney reviewed
              </div>
            </div>

            <h1 className="mt-7 animate-in fade-in slide-in-from-bottom-4 font-serif text-4xl leading-[1.05] tracking-tight text-foreground duration-700 fill-mode-both sm:mt-8 sm:text-6xl lg:text-[4.25rem]">
              The first AI-powered will platform built for Texas.
            </h1>

            <p className="mx-auto mt-6 max-w-2xl animate-in fade-in slide-in-from-bottom-3 text-lg leading-relaxed text-muted-foreground delay-100 duration-700 fill-mode-both sm:text-xl">
              Done in 10 minutes. Every will reviewed by a licensed Texas
              attorney before it reaches you.
            </p>

            {/* Pricing — high visibility */}
            <div className="mx-auto mt-9 max-w-xl animate-in fade-in slide-in-from-bottom-3 delay-150 duration-700 fill-mode-both">
              <PlanPairCards surface="light" compact />
            </div>

            <div className="mx-auto mt-5 flex max-w-xl flex-wrap items-center justify-center gap-x-5 gap-y-2 animate-in fade-in delay-200 duration-700 fill-mode-both">
              {[
                { label: "No subscriptions", Icon: BadgeCheck },
                { label: "Attorney review in every order", Icon: Scale },
              ].map(({ label, Icon }) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground/80"
                >
                  <Icon className="h-4 w-4 text-accent" strokeWidth={1.75} />
                  {label}
                </span>
              ))}
            </div>

            <div className="mt-8 flex flex-col items-center gap-3 animate-in fade-in slide-in-from-bottom-2 delay-300 duration-700 fill-mode-both sm:flex-row sm:justify-center">
              <Button
                asChild
                size="lg"
                className="group h-12 w-full gap-2 rounded-full px-8 text-base shadow-lg shadow-primary/15 transition hover:scale-[1.02] sm:w-auto"
              >
                <Link to="/pricing?plan=individual#checkout">
                  Start my will — $249
                  <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" strokeWidth={2} />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="group h-12 w-full gap-2 rounded-full border-border bg-card/80 px-8 text-base backdrop-blur-sm transition hover:scale-[1.02] sm:w-auto"
              >
                <Link to="/how-it-works">
                  See how it works
                  <ArrowRight className="h-4 w-4 opacity-70 transition-transform duration-300 group-hover:translate-x-1" strokeWidth={2} />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Trust bar */}
      <Section tone="muted" className="py-16 sm:py-20">
        <ScrollReveal variant="scale">
          <div className="relative overflow-hidden rounded-[2rem] bg-primary px-6 py-10 text-primary-foreground shadow-[0_24px_60px_-30px_rgba(15,23,42,0.55)] sm:px-8 sm:py-12 lg:px-10">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -left-20 top-0 h-64 w-64 rounded-full bg-accent/20 blur-3xl"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-16 bottom-0 h-72 w-72 rounded-full bg-white/5 blur-3xl"
            />

            <ol className="relative grid gap-8 sm:grid-cols-3 sm:gap-0">
              {[
                {
                  step: "01",
                  t: "Attorney review in every order",
                  d: "A licensed Texas attorney reviews your will before it reaches you.",
                  Icon: Scale,
                },
                {
                  step: "02",
                  t: "Done in 10 minutes",
                  d: "AI-guided questions built around Texas law.",
                  Icon: Clock3,
                },
                {
                  step: "03",
                  t: "Next business day delivery",
                  d: "Your completed will arrives in your inbox as a PDF.",
                  Icon: Mail,
                },
              ].map(({ step, t, d, Icon }, i) => (
                <li
                  key={t}
                  className={`group relative flex flex-col items-center px-4 text-center sm:px-8 ${
                    i > 0 ? "sm:border-l sm:border-white/10" : ""
                  }`}
                >
                  <ScrollReveal variant="up" delay={i * 120}>
                    <span className="font-serif text-5xl font-semibold tracking-tight text-accent/90 sm:text-6xl">
                      {step}
                    </span>

                    <div className="mx-auto mt-5 flex h-16 w-16 items-center justify-center rounded-full bg-white/10 text-accent ring-1 ring-white/15 backdrop-blur-sm transition duration-500 group-hover:bg-accent group-hover:text-accent-foreground group-hover:ring-accent">
                      <Icon
                        className="h-7 w-7 transition-transform duration-700 ease-out group-hover:rotate-[360deg]"
                        strokeWidth={1.75}
                      />
                    </div>

                    <h3 className="mx-auto mt-6 max-w-[16rem] font-serif text-xl leading-snug text-primary-foreground sm:text-2xl">
                      {t}
                    </h3>
                    <p className="mx-auto mt-3 max-w-[18rem] text-sm leading-relaxed text-primary-foreground/70 sm:text-base">
                      {d}
                    </p>
                  </ScrollReveal>
                </li>
              ))}
            </ol>
          </div>
        </ScrollReveal>
      </Section>

      {/* Problem */}
      <Section tone="default" className="py-16 sm:py-24">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1.2fr)] lg:items-end lg:gap-12">
          <ScrollReveal variant="left" className="max-w-xl">
            <Eyebrow>The problem</Eyebrow>
            <h2 className="mt-4 font-serif text-3xl leading-tight text-foreground sm:text-4xl lg:text-[2.75rem]">
              Most Texans know they need a will. Most keep putting it off.
            </h2>
          </ScrollReveal>
          <ScrollReveal
            variant="right"
            delay={120}
            className="max-w-xl lg:justify-self-end"
          >
            <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">
              Nearly 7 in 10 American adults don't have a will. In a state of 30
              million people, that's a lot of Texas families left unprotected. The
              options are expensive, overwhelming, or easy to ignore. So it never
              gets done.
            </p>
          </ScrollReveal>
        </div>

        <div className="mt-12 grid gap-4 md:grid-cols-3 md:gap-5">
          {[
            {
              t: "Attorneys feel expensive and intimidating",
              d: "The average Texas attorney charges $1,000–$2,000 for a simple will. Most people avoid the conversation entirely.",
              n: "01",
              Icon: CircleDollarSign,
            },
            {
              t: "Online platforms create more questions than answers",
              d: "Multiple pricing tiers, feature comparison tables, and add-ons before you even get started. Most people look at the options and do nothing.",
              n: "02",
              Icon: Layers,
            },
            {
              t: "There's no deadline forcing anyone to act",
              d: "A will is the easiest thing to put off. Until a life event makes it impossible to ignore any longer.",
              n: "03",
              Icon: CalendarOff,
            },
          ].map(({ t, d, n, Icon }, i) => (
            <ScrollReveal key={t} variant="up" delay={i * 110} className="h-full">
              <div className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-border/70 bg-card p-7 shadow-[0_12px_40px_-28px_rgba(15,23,42,0.35)] transition duration-300 hover:-translate-y-1.5 hover:border-accent/40 hover:shadow-[0_22px_50px_-28px_rgba(15,23,42,0.4)] sm:p-8">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -right-3 -top-4 font-serif text-7xl font-semibold tracking-tight text-accent/[0.08] transition duration-300 group-hover:text-accent/[0.14] sm:text-8xl"
                >
                  {n}
                </div>
                <div
                  aria-hidden="true"
                  className="absolute inset-y-0 left-0 w-1 bg-accent/30 transition duration-300 group-hover:bg-accent"
                />

                <div className="relative flex items-center justify-between">
                  <span className="inline-flex h-9 items-center rounded-full bg-secondary px-3 text-xs font-semibold tracking-[0.14em] text-accent">
                    {n}
                  </span>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary text-accent transition duration-500 group-hover:bg-accent group-hover:text-accent-foreground">
                    <Icon
                      className="h-5 w-5 transition-transform duration-700 ease-out group-hover:rotate-[360deg]"
                      strokeWidth={1.75}
                    />
                  </div>
                </div>

                <h3 className="relative mt-8 font-serif text-xl leading-snug text-foreground sm:text-[1.35rem]">
                  {t}
                </h3>
                <p className="relative mt-3 flex-1 text-sm leading-relaxed text-muted-foreground sm:text-[0.95rem]">
                  {d}
                </p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </Section>

      {/* How it works */}
      <Section tone="muted" className="py-16 sm:py-24">
        <ScrollReveal variant="up" className="mx-auto max-w-3xl text-center">
          <Eyebrow>How it works</Eyebrow>
          <h2 className="mt-4 font-serif text-3xl leading-tight text-foreground sm:text-4xl">
            AI-powered questions. Attorney-reviewed results. Done tomorrow.
          </h2>
        </ScrollReveal>

        <ol className="relative mx-auto mt-14 max-w-4xl space-y-6 sm:space-y-0">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-8 top-4 bottom-4 w-px bg-gradient-to-b from-accent/10 via-accent/50 to-accent/10 sm:left-1/2 sm:-translate-x-px"
          />

          {[
            {
              t: "Choose your plan and pay",
              d: "Individual at $249 or couples at $399. Attorney review included in both. No subscriptions.",
              Icon: CreditCard,
            },
            {
              t: "Answer 10 minutes of guided questions",
              d: "AI-powered questions built around Texas law and your specific situation. Nothing irrelevant, nothing overwhelming.",
              Icon: ClipboardList,
            },
            {
              t: "A licensed Texas attorney reviews your will",
              d: "Within 24 hours of submission. Not a phone call. Not an automated stamp. A real attorney, your specific document, every time.",
              Icon: Scale,
            },
            {
              t: "Your will arrives in your inbox",
              d: "By the next business day as a PDF with Texas-specific signing instructions. Print, sign, and you're done.",
              Icon: Inbox,
            },
          ].map(({ t, d, Icon }, i) => {
            const step = String(i + 1).padStart(2, "0");
            const isRight = i % 2 === 1;

            return (
              <li
                key={t}
                className="relative grid items-center gap-4 sm:grid-cols-2 sm:gap-10 sm:py-7"
              >
                <ScrollReveal
                  variant={isRight ? "right" : "left"}
                  delay={80}
                  className={isRight ? "sm:col-start-2" : "sm:col-start-1"}
                >
                  <div
                    className={`group relative rounded-3xl border border-border/70 bg-card p-6 shadow-[0_14px_40px_-28px_rgba(15,23,42,0.4)] transition duration-300 hover:-translate-y-1 hover:border-accent/40 hover:shadow-[0_22px_50px_-28px_rgba(15,23,42,0.45)] sm:p-7 ${
                      isRight ? "" : "sm:text-right"
                    }`}
                  >
                    <div
                      className={`mb-4 flex items-center gap-3 ${
                        isRight ? "" : "sm:flex-row-reverse"
                      }`}
                    >
                      <span className="inline-flex h-9 items-center rounded-full bg-secondary px-3 text-xs font-semibold tracking-[0.14em] text-accent">
                        Step {step}
                      </span>
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-secondary text-accent transition duration-500 group-hover:bg-accent group-hover:text-accent-foreground">
                        <Icon
                          className="h-5 w-5 transition-transform duration-700 ease-out group-hover:rotate-[360deg]"
                          strokeWidth={1.75}
                        />
                      </div>
                    </div>
                    <h3 className="font-serif text-xl leading-snug text-foreground sm:text-2xl">
                      {t}
                    </h3>
                    <p
                      className={`mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base ${
                        isRight ? "" : "sm:ml-auto sm:max-w-md"
                      }`}
                    >
                      {d}
                    </p>
                  </div>
                </ScrollReveal>

                <div
                  aria-hidden="true"
                  className="absolute left-8 top-1/2 z-10 flex h-5 w-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-accent ring-8 ring-secondary/70 sm:left-1/2"
                >
                  <span className="h-2 w-2 rounded-full bg-accent-foreground" />
                </div>
              </li>
            );
          })}
        </ol>
      </Section>

      {/* Trust / founder */}
      <Section tone="default" className="py-16 sm:py-24">
        <ScrollReveal variant="up">
          <div className="overflow-hidden rounded-[2rem] border border-border/70 bg-card shadow-[0_24px_60px_-36px_rgba(15,23,42,0.35)]">
            <div className="grid lg:grid-cols-[1.05fr_0.95fr]">
              <div className="relative flex flex-col justify-center px-7 py-10 sm:px-10 sm:py-14 lg:px-12">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -left-16 top-10 h-48 w-48 rounded-full bg-accent/10 blur-3xl"
                />
                <Eyebrow>Why My AI Will</Eyebrow>
                <h2 className="relative mt-4 max-w-xl font-serif text-3xl leading-tight text-foreground sm:text-4xl lg:text-[2.75rem]">
                  Attorney review is the baseline. Not the upgrade.
                </h2>
                <p className="relative mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                  Every other platform in this space either skips attorney review
                  entirely or locks it behind a higher pricing tier. My AI Will
                  includes a licensed Texas attorney review on every order because
                  it should be the standard, not a premium feature.
                </p>

                <div className="relative mt-8 flex flex-wrap gap-3">
                  {[
                    "Licensed Texas attorney",
                    "Review on every order",
                    "No premium upsell",
                  ].map((label) => (
                    <span
                      key={label}
                      className="inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-secondary/70 px-3 py-1.5 text-xs font-medium text-foreground"
                    >
                      <BadgeCheck className="h-3.5 w-3.5 text-accent" strokeWidth={1.75} />
                      {label}
                    </span>
                  ))}
                </div>
              </div>

              <div className="relative border-t border-border/70 bg-primary text-primary-foreground lg:border-l lg:border-t-0">
                <div className="absolute inset-x-0 top-0 z-10 h-1.5 bg-accent" />
                <div className="grid h-full lg:grid-cols-1">
                  <div className="group relative aspect-[4/5] w-full cursor-pointer overflow-hidden sm:aspect-[5/4] lg:aspect-[4/5]">
                    <FounderPhoto />
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0 bg-gradient-to-t from-primary via-primary/20 to-transparent"
                    />
                    <div className="absolute inset-x-0 bottom-0 p-7 sm:p-8">
                      <Quote
                        className="mb-3 h-7 w-7 text-accent"
                        strokeWidth={1.5}
                        aria-hidden="true"
                      />
                      <blockquote className="font-serif text-base italic leading-relaxed text-primary-foreground sm:text-lg">
                        "I built My AI Will because I saw that most Texans who need
                        a simple will keep putting it off — not because they don't
                        care, but because the options are either expensive or
                        overwhelming. This is the product I wished existed."
                      </blockquote>
                      <div className="mt-5 border-t border-white/15 pt-4">
                        <div className="font-serif text-xl text-primary-foreground">
                          Scott Pappas
                        </div>
                        <div className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-accent">
                          Licensed Texas Attorney · Founder
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </Section>

      {/* Objections */}
      <Section tone="muted" className="py-16 sm:py-24">
        <ScrollReveal
          variant="up"
          className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between"
        >
          <div className="max-w-2xl">
            <Eyebrow>Common questions</Eyebrow>
            <h2 className="mt-4 font-serif text-3xl leading-tight text-foreground sm:text-4xl">
              Honest answers, before you ask.
            </h2>
          </div>
          <Link
            to="/faq"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-accent transition hover:gap-2.5"
          >
            View all FAQs
            <ArrowRight className="h-4 w-4" strokeWidth={2} />
          </Link>
        </ScrollReveal>

        <div className="mt-10 grid gap-3">
          {FAQS.map((item, i) => (
            <ScrollReveal key={item.q} variant="up" delay={Math.min(i, 6) * 60}>
              <details className="group overflow-hidden rounded-2xl border border-border/70 bg-card shadow-[0_8px_30px_-24px_rgba(15,23,42,0.28)] transition duration-300 open:border-accent/35 open:shadow-[0_16px_40px_-24px_rgba(15,23,42,0.35)] hover:border-accent/30">
                <summary className="flex cursor-pointer list-none items-center gap-4 px-5 py-5 sm:gap-5 sm:px-6 sm:py-6 [&::-webkit-details-marker]:hidden">
                  <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary font-serif text-sm font-semibold text-accent transition duration-300 group-open:bg-accent group-open:text-accent-foreground">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className="flex-1 font-serif text-base leading-snug text-foreground sm:text-lg">
                    {item.q}
                  </h3>
                  <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-background text-accent transition duration-300 group-open:rotate-45 group-open:border-accent group-open:bg-accent group-open:text-accent-foreground">
                    <svg
                      viewBox="0 0 24 24"
                      className="h-3.5 w-3.5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                    >
                      <path strokeLinecap="round" d="M12 5v14M5 12h14" />
                    </svg>
                  </span>
                </summary>
                <div className="border-t border-border/60 bg-secondary/35 px-5 py-5 sm:px-6 sm:pl-[4.75rem]">
                  <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                    {item.a}
                  </p>
                </div>
              </details>
            </ScrollReveal>
          ))}
        </div>
      </Section>

      {/* Final CTA */}
      <Section tone="default" className="pb-24 pt-8 sm:pt-12">
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
                The first AI-powered will platform built for Texas. Attorney review
                included. No subscriptions.
              </p>
            </div>

            <div className="relative mx-auto mt-10 max-w-2xl">
              <PlanPairCards surface="onDark" />
            </div>

            <div className="relative mx-auto mt-7 flex max-w-2xl flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-primary-foreground/70">
              {[
                "Attorney review included",
                "No subscriptions",
                "Next business day delivery",
              ].map((label) => (
                <span key={label} className="inline-flex items-center gap-1.5">
                  <BadgeCheck className="h-3.5 w-3.5 text-accent" strokeWidth={1.75} />
                  {label}
                </span>
              ))}
            </div>
          </div>
        </ScrollReveal>
      </Section>
    </>
  );
}
