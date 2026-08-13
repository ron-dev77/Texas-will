/** Shared email types for Resend transactional mail. */

export type EmailAddress = string | { email: string; name?: string }

export type EmailAttachment = {
  /** File name shown to the recipient, e.g. Last-Will-and-Testament.pdf */
  filename: string
  /** Base64-encoded file contents (no data: prefix) */
  content: string
  contentType?: string
}

export type SendEmailInput = {
  to: EmailAddress | EmailAddress[]
  subject: string
  html: string
  text?: string
  replyTo?: string
  tags?: { name: string; value: string }[]
  attachments?: EmailAttachment[]
}

export type SendEmailResult =
  | { ok: true; id: string }
  | { ok: false; error: string; skipped?: boolean }

export type SubmissionEmailContext = {
  orderId: string
  planType: string
  includeTrust: boolean
  amountPaidCents: number
  customerName: string | null
  customerEmail: string
  partnerName: string | null
  partnerEmail: string | null
  partnerNumber: 1 | 2
  submittedAt: string
  /** Public site origin for links, e.g. https://myaiwill.com */
  appOrigin: string
  adminOrdersPath: string
}
