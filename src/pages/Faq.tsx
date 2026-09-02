import { Link } from 'react-router-dom'
import { ArrowRight, BadgeCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FAQS, LSR_FAQ } from '@/lib/faqs'
import { ScrollReveal } from '@/components/site/ScrollReveal'
import { PageCta, PageHero, PageSection } from '@/components/site/PageShell'

export default function Faq() {
  return (
    <>
      <PageHero
        eyebrow="FAQ"
        title="Honest answers, before you ask."
        description="Texas will validity, attorney review, refunds, couples, and how the AI questionnaire works."
      />

      <PageSection className="py-16 sm:py-20">
        <div className="mx-auto max-w-4xl grid gap-3">
          {FAQS.map((item, i) => {
            const id =
              item.q === LSR_FAQ.q
                ? 'lsr'
                : item.q === 'Do you make living trusts?'
                  ? 'living-trust'
                  : item.q === 'Can I leave a gift in a special needs trust or a Texas ABLE account?'
                    ? 'special-needs'
                    : undefined
            return (
              <ScrollReveal key={item.q} variant="up" delay={Math.min(i, 6) * 50}>
                <details
                  id={id}
                  className="group overflow-hidden rounded-2xl border border-border/70 bg-card shadow-[0_8px_30px_-24px_rgba(15,23,42,0.28)] transition duration-300 open:border-accent/35 open:shadow-[0_16px_40px_-24px_rgba(15,23,42,0.35)] hover:border-accent/30"
                >
                  <summary className="flex cursor-pointer list-none items-center gap-4 px-5 py-5 sm:gap-5 sm:px-6 sm:py-6 [&::-webkit-details-marker]:hidden">
                    <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary font-serif text-sm font-semibold text-accent transition duration-300 group-open:bg-accent group-open:text-accent-foreground">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <h2 className="flex-1 font-serif text-base leading-snug text-foreground sm:text-lg">
                      {item.q}
                    </h2>
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
            )
          })}
        </div>
      </PageSection>

      <PageSection className="pb-24">
        <ScrollReveal variant="scale">
          <PageCta
            dark
            title="Still have questions?"
            description="We answer every email personally, usually same-day."
          >
            <Button asChild size="lg" variant="secondary" className="h-12 gap-2 rounded-full px-8">
              <Link to="/pricing?plan=individual#checkout">
                Start my will
                <ArrowRight className="h-4 w-4" strokeWidth={2} />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-12 rounded-full border-white/20 bg-white/5 px-8 text-primary-foreground hover:bg-white/10 hover:text-primary-foreground"
            >
              <Link to="/contact">
                Contact us
                <BadgeCheck className="h-4 w-4" strokeWidth={1.75} />
              </Link>
            </Button>
          </PageCta>
        </ScrollReveal>
      </PageSection>
    </>
  )
}
