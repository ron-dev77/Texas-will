/**
 * Thin Resend HTTP client for Deno edge functions.
 *
 * Only secret required: RESEND_API_KEY
 * Optional: EMAIL_FROM — e.g. 'My AI Will <hello@myaiwill.com>'
 *   (use a real inbox on your verified Resend domain — not noreply@)
 */

import type { EmailAddress, SendEmailInput, SendEmailResult } from './types.ts'

const RESEND_API = 'https://api.resend.com/emails'

/** Default From — real team inbox, not noreply. Override with EMAIL_FROM secret. */
export const DEFAULT_EMAIL_FROM = 'My AI Will <hello@myaiwill.com>'

function normalizeAddress(addr: EmailAddress): string {
  if (typeof addr === 'string') return addr.trim()
  if (addr.name?.trim()) return `${addr.name.trim()} <${addr.email.trim()}>`
  return addr.email.trim()
}

function normalizeTo(to: EmailAddress | EmailAddress[]): string[] {
  const list = Array.isArray(to) ? to : [to]
  return list.map(normalizeAddress).filter(Boolean)
}

/** Pull bare email from `Name <email@x.com>` or plain address. */
export function bareEmail(from: string): string {
  const angle = from.match(/<([^>]+)>/)
  if (angle?.[1]) return angle[1].trim().toLowerCase()
  return from.trim().toLowerCase()
}

export function getEmailFrom(): string {
  return Deno.env.get('EMAIL_FROM')?.trim() || DEFAULT_EMAIL_FROM
}

export function isPlaceholderEmail(email: string): boolean {
  const e = email.trim().toLowerCase()
  return (
    !e ||
    !e.includes('@') ||
    e.endsWith('@myaiwill.local') ||
    e.startsWith('pending@')
  )
}

export async function sendResendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const apiKey = Deno.env.get('RESEND_API_KEY')?.trim()
  if (!apiKey) {
    console.warn('[email] RESEND_API_KEY not set — skipping send')
    return { ok: false, skipped: true, error: 'RESEND_API_KEY not configured' }
  }

  const to = normalizeTo(input.to)
  if (to.length === 0) {
    return { ok: false, skipped: true, error: 'No recipients' }
  }

  const from = getEmailFrom()
  const payload: Record<string, unknown> = {
    from,
    to,
    subject: input.subject,
    html: input.html,
  }
  if (input.text) payload.text = input.text
  // Reply goes to the same real inbox (or explicit override on the call)
  const replyTo = input.replyTo?.trim() || bareEmail(from)
  if (replyTo) payload.reply_to = replyTo
  if (input.tags?.length) payload.tags = input.tags

  const res = await fetch(RESEND_API, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  const body = (await res.json().catch(() => ({}))) as {
    id?: string
    message?: string
    name?: string
  }

  if (!res.ok) {
    const error = body.message || body.name || `Resend HTTP ${res.status}`
    console.error('[email] Resend error', error)
    return { ok: false, error }
  }

  return { ok: true, id: body.id ?? 'unknown' }
}
