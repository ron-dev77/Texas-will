import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Clock3,
  Mail,
  MapPin,
  MessageSquareText,
  Send,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ScrollReveal } from '@/components/site/ScrollReveal'
import { PageHero, PageSection } from '@/components/site/PageShell'

const SUPPORT_EMAIL = 'scott@myaiwill.com'

const HIGHLIGHTS = [
  {
    title: 'Personal replies',
    body: 'Every message is read by a real person — not a ticket queue.',
    Icon: MessageSquareText,
  },
  {
    title: 'Same-day responses',
    body: 'We typically reply within a few hours during Texas business hours.',
    Icon: Clock3,
  },
  {
    title: 'Built in Texas',
    body: 'Questions about Texas wills, pricing, or your order — ask us directly.',
    Icon: MapPin,
  },
] as const

export default function Contact() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')

  const mailto = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
    `Question from ${name || 'the website'}`,
  )}&body=${encodeURIComponent(`${message}\n\n— ${name || '(name)'}\n${email}`)}`

  return (
    <>
      <PageHero
        eyebrow="Contact"
        title="We answer every email personally."
        description="Reach out at scott@myaiwill.com, or use the form below. We typically reply within a few hours during Texas business hours."
      />

      <PageSection className="py-14 sm:py-20">
        <div className="mb-10 grid gap-4 sm:grid-cols-3">
          {HIGHLIGHTS.map(({ title, body, Icon }, i) => (
            <ScrollReveal key={title} variant="up" delay={i * 70}>
              <div className="h-full rounded-2xl border border-border/70 bg-card p-5 shadow-[0_12px_40px_-28px_rgba(15,23,42,0.22)]">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-accent">
                  <Icon className="h-4 w-4" strokeWidth={1.75} />
                </div>
                <h2 className="mt-4 font-serif text-lg text-foreground">{title}</h2>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{body}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>

        <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:gap-10">
          <ScrollReveal variant="left">
            <div className="relative overflow-hidden rounded-[2rem] bg-primary p-8 text-primary-foreground shadow-[0_28px_70px_-36px_rgba(15,23,42,0.55)] sm:p-10">
              <div className="absolute inset-x-0 top-0 h-1.5 bg-accent" />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-accent/20 blur-3xl"
              />
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-accent ring-1 ring-white/15">
                <Mail className="h-5 w-5" strokeWidth={1.75} />
              </div>
              <h2 className="mt-6 font-serif text-3xl leading-tight sm:text-4xl">
                Prefer to email us directly?
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-primary-foreground/75 sm:text-base">
                Write us and we'll get back to you same-day whenever we can. Include order details
                if you're already a customer.
              </p>
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="mt-8 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 py-3 text-base font-medium text-accent transition hover:bg-white/10"
              >
                {SUPPORT_EMAIL}
                <ArrowRight className="h-4 w-4" strokeWidth={2} />
              </a>
              <div className="mt-10 border-t border-white/10 pt-6">
                <p className="text-xs uppercase tracking-[0.14em] text-primary-foreground/55">
                  Looking for something else?
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link
                    to="/faq"
                    className="rounded-full border border-white/15 px-3.5 py-1.5 text-sm text-primary-foreground/85 transition hover:bg-white/10"
                  >
                    FAQ
                  </Link>
                  <Link
                    to="/plans"
                    className="rounded-full border border-white/15 px-3.5 py-1.5 text-sm text-primary-foreground/85 transition hover:bg-white/10"
                  >
                    Pricing
                  </Link>
                  <Link
                    to="/disclaimer"
                    className="rounded-full border border-white/15 px-3.5 py-1.5 text-sm text-primary-foreground/85 transition hover:bg-white/10"
                  >
                    Disclaimer
                  </Link>
                </div>
              </div>
            </div>
          </ScrollReveal>

          <ScrollReveal variant="right" delay={80}>
            <form
              className="rounded-[2rem] border border-border/70 bg-card p-6 shadow-[0_18px_50px_-32px_rgba(15,23,42,0.28)] sm:p-9"
              onSubmit={(e) => {
                e.preventDefault()
                window.location.href = mailto
              }}
            >
              <div className="text-xs font-medium uppercase tracking-[0.18em] text-accent">
                Send a message
              </div>
              <h2 className="mt-2 font-serif text-2xl text-foreground sm:text-3xl">
                Tell us how we can help.
              </h2>

              <div className="mt-8 grid gap-5 sm:grid-cols-2">
                <div className="sm:col-span-1">
                  <Label htmlFor="name">Your name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-2"
                    placeholder="Jane Doe"
                    required
                  />
                </div>
                <div className="sm:col-span-1">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-2"
                    placeholder="you@example.com"
                    required
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="message">Message</Label>
                  <Textarea
                    id="message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="mt-2 min-h-[160px]"
                    placeholder="How can we help?"
                    required
                  />
                </div>
              </div>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <Button type="submit" size="lg" className="h-12 gap-2 rounded-full px-8">
                  Send message
                  <Send className="h-4 w-4" strokeWidth={2} />
                </Button>
                <p className="text-xs text-muted-foreground sm:max-w-[16rem] sm:text-right">
                  This opens your email client with your message ready to send.
                </p>
              </div>
            </form>
          </ScrollReveal>
        </div>
      </PageSection>
    </>
  )
}
