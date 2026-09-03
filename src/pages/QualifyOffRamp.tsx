import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Wordmark } from '@/components/site/Wordmark'
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
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-5 text-center">
      <Wordmark />
      <h1 className="mt-10 max-w-lg font-serif text-3xl tracking-tight">
        Estates over $8 million need a fuller plan
      </h1>
      <p className="mt-4 max-w-md text-sm leading-relaxed text-muted-foreground">
        My AI Will is built for straightforward Texas estates. Larger estates benefit from in-person
        counsel — tax planning, entity structures, and advanced trusts. We cannot complete checkout
        here yet.
      </p>
      {!sent ? (
        <form onSubmit={(e) => void submitEmail(e)} className="mt-8 w-full max-w-sm text-left">
          <Label htmlFor="off-ramp-email" className="text-xs uppercase tracking-wide text-muted-foreground">
            Optional — notify me when we expand
          </Label>
          <Input
            id="off-ramp-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@email.com"
            className="mt-2"
          />
          {error ? <p className="mt-2 text-xs text-destructive">{error}</p> : null}
          <Button type="submit" className="mt-4 w-full rounded-full">
            Submit email
          </Button>
        </form>
      ) : (
        <p className="mt-8 text-sm text-accent">Thanks — we saved your email.</p>
      )}
      <Button asChild variant="outline" className="mt-8 rounded-full">
        <Link
          to="/qualify"
          onClick={() => {
            if (draft) {
              saveQualifierDraft({ ...draft, estateBracket: '2m_8m' })
            }
          }}
        >
          Go back and change estate size
        </Link>
      </Button>
      <Button asChild variant="ghost" className="mt-3 rounded-full">
        <Link to="/">Back to home</Link>
      </Button>
    </div>
  )
}
