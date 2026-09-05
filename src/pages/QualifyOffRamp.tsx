import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertCircle, ArrowLeft, Mail } from 'lucide-react'
import { CheckoutFlowShell } from '@/components/site/CheckoutFlowShell'
import { CheckoutFlowSteps } from '@/components/site/CheckoutFlowSteps'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { supabase } from '@/integrations/supabase/client'
import { loadQualifierDraft, saveQualifierDraft } from '@/lib/qualifier'

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

export default function QualifyOffRamp() {
  const draft = loadQualifierDraft()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submitEmail(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = email.trim().toLowerCase()
    if (!EMAIL_RE.test(trimmed)) {
      setError('Enter a valid email.')
      return
    }
    setError(null)
    const { error: insertErr } = await (
      supabase as unknown as {
        from: (t: string) => {
          insert: (row: Record<string, unknown>) => Promise<{ error: { message: string } | null }>
        }
      }
    )
      .from('qualifier_off_ramp_leads')
      .insert({
        email: trimmed,
        estate_bracket: draft?.estateBracket ?? 'over_8m',
        plan_type: draft?.plan ?? null,
        marital_status: draft?.maritalStatus ?? null,
        metadata: (draft ?? {}) as Record<string, unknown>,
      })
    if (insertErr) {
      setError(insertErr.message)
      return
    }
    setSent(true)
  }

  return (
    <CheckoutFlowShell
      headerRight={
        <Link to="/qualify" className="underline-offset-2 hover:underline">
          Edit answers
        </Link>
      }
    >
      <CheckoutFlowSteps current="qualify" linkCompleted={false} />

      <div className="mx-auto mt-8 max-w-lg">
        <div className="flex flex-col items-center text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-800">
            <AlertCircle className="h-7 w-7" strokeWidth={1.75} />
          </span>
          <h1 className="mt-6 font-serif text-3xl tracking-tight">
            Estates over $8 million need a fuller plan
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            My AI Will is built for straightforward Texas estates. Larger estates benefit from
            in-person counsel — tax planning, entity structures, and advanced trusts. Checkout is
            not available here yet.
          </p>
        </div>

        <div className="mt-8 rounded-3xl border border-border/50 bg-card/90 p-6 shadow-sm">
          {!sent ? (
            <>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-accent" strokeWidth={1.75} />
                <p className="text-sm font-medium">Get notified when we expand</p>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Optional — leave your email and we will reach out.</p>
              <form onSubmit={(e) => void submitEmail(e)} className="mt-4">
                <Label htmlFor="off-ramp-email" className="sr-only">
                  Email
                </Label>
                <Input
                  id="off-ramp-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@email.com"
                />
                {error ? <p className="mt-2 text-xs text-destructive">{error}</p> : null}
                <Button type="submit" className="mt-4 w-full rounded-full">
                  Submit email
                </Button>
              </form>
            </>
          ) : (
            <p className="text-center text-sm text-accent">Thanks — we saved your email.</p>
          )}
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button asChild variant="outline" className="rounded-full">
            <Link
              to="/qualify"
              onClick={() => {
                if (draft) {
                  saveQualifierDraft({ ...draft, estateBracket: '2m_8m' })
                }
              }}
            >
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              Change estate size
            </Link>
          </Button>
          <Button asChild variant="ghost" className="rounded-full">
            <Link to="/">Back to home</Link>
          </Button>
        </div>
      </div>
    </CheckoutFlowShell>
  )
}
