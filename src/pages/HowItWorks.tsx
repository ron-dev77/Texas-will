import { Link } from 'react-router-dom'
import {
  ArrowRight,
  ClipboardList,
  CreditCard,
  Inbox,
  Scale,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollReveal } from '@/components/site/ScrollReveal'
import { WillBasedFitNote } from '@/components/site/WillBasedFitNote'
import { PageCta, PageHero, PageSection } from '@/components/site/PageShell'
import { startWillPath } from '@/lib/start-will-path'

const STEPS = [
  {
    n: '01',
    t: 'Choose your plan and pay',
    d: 'Individual at $249 or couples at $399. Attorney review is included in both — not an upsell. No subscriptions, no surprise add-ons at the end.',
    Icon: CreditCard,
  },
  {
    n: '02',
    t: 'Answer 10 minutes of guided questions',
    d: "AI-powered questions built around Texas law and your specific situation. We skip what doesn't apply to you. One question at a time, your progress saves automatically.",
    Icon: ClipboardList,
  },
  {
    n: '03',
    t: 'A licensed Texas attorney reviews your will',
    d: 'Within 24 hours of submission. Not a phone call. Not an automated stamp. A real attorney reads your specific document and flags anything that needs your attention.',
    Icon: Scale,
  },
  {
    n: '04',
    t: 'Your will arrives in your inbox',
    d: "By the next business day as a PDF with Texas-specific signing instructions. Print, sign in front of two witnesses, and you're done.",
    Icon: Inbox,
  },
] as const

export default function HowItWorks() {
  return (
    <>
      <PageHero
        eyebrow="How it works"
        title="Four simple steps. Done tomorrow."
        description="A will doesn't have to feel like paperwork. We've stripped this down to the only four steps that matter."
      />

      <PageSection className="pt-10 pb-4 sm:pt-14">
        <ScrollReveal variant="up" className="mx-auto max-w-4xl">
          <WillBasedFitNote showFirms />
        </ScrollReveal>
      </PageSection>

      <PageSection className="py-16 sm:py-24">
        <ol className="relative mx-auto max-w-4xl space-y-6">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-8 top-6 bottom-6 w-px bg-gradient-to-b from-accent/15 via-accent/50 to-accent/15 sm:left-1/2 sm:-translate-x-px"
          />

          {STEPS.map(({ n, t, d, Icon }, i) => {
            const isRight = i % 2 === 1
            return (
              <li
                key={n}
                className="relative grid items-center gap-4 sm:grid-cols-2 sm:gap-10 sm:py-4"
              >
                <ScrollReveal
                  variant={isRight ? 'right' : 'left'}
                  delay={80}
                  className={isRight ? 'sm:col-start-2' : 'sm:col-start-1'}
                >
                  <div
                    className={`group rounded-3xl border border-border/70 bg-card p-6 shadow-[0_14px_40px_-28px_rgba(15,23,42,0.4)] transition duration-300 hover:-translate-y-1 hover:border-accent/40 sm:p-7 ${
                      isRight ? '' : 'sm:text-right'
                    }`}
                  >
                    <div
                      className={`mb-4 flex items-center gap-3 ${
                        isRight ? '' : 'sm:flex-row-reverse'
                      }`}
                    >
                      <span className="inline-flex h-9 items-center rounded-full bg-secondary px-3 font-serif text-sm font-semibold text-accent">
                        {n}
                      </span>
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-secondary text-accent transition duration-500 group-hover:bg-accent group-hover:text-accent-foreground">
                        <Icon className="h-5 w-5" strokeWidth={1.75} />
                      </div>
                    </div>
                    <h2 className="font-serif text-xl leading-snug text-foreground sm:text-2xl">
                      {t}
                    </h2>
                    <p
                      className={`mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base ${
                        isRight ? '' : 'sm:ml-auto sm:max-w-md'
                      }`}
                    >
                      {d}
                    </p>
                  </div>
                </ScrollReveal>

                <div
                  aria-hidden="true"
                  className="absolute left-8 top-1/2 z-10 flex h-5 w-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-accent ring-8 ring-background sm:left-1/2"
                >
                  <span className="h-2 w-2 rounded-full bg-accent-foreground" />
                </div>
              </li>
            )
          })}
        </ol>
      </PageSection>

      <PageSection className="pb-24">
        <ScrollReveal variant="scale">
          <PageCta
            dark
            title="Ready when you are."
            description="Most people finish the questionnaire in under 15 minutes."
          >
            <Button
              asChild
              size="lg"
              variant="secondary"
              className="h-12 gap-2 rounded-full px-8"
            >
              <Link to={startWillPath()}>
                Start my will
                <ArrowRight className="h-4 w-4" strokeWidth={2} />
              </Link>
            </Button>
          </PageCta>
        </ScrollReveal>
      </PageSection>
    </>
  )
}
