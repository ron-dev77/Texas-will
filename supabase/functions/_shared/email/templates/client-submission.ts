import { emailLayout, escapeHtml, formatMoneyCents, formatWhen } from '../layout.ts'
import type { SubmissionEmailContext } from '../types.ts'

/** Client confirmation after questionnaire submit. */
export function buildClientSubmissionEmail(ctx: SubmissionEmailContext): {
  subject: string
  html: string
  text: string
} {
  const name = ctx.customerName?.trim() || 'there'
  const plan =
    ctx.planType === 'couples' ? 'Couples plan' : 'Individual plan'
  const trust = ctx.includeTrust ? ' · Trust add-on' : ''
  const when = formatWhen(ctx.submittedAt)

  const subject = 'We received your My AI Will questionnaire'
  const text = [
    `Hi ${name},`,
    '',
    'Thanks for submitting your Texas will questionnaire. Our team will review your answers and prepare your documents.',
    '',
    `Order: ${ctx.orderId}`,
    `Plan: ${plan}${trust}`,
    `Submitted: ${when}`,
    '',
    'You do not need to do anything else right now. We will follow up when your documents are ready for review.',
    '',
    '— My AI Will',
    'scott@myaiwill.com',
  ].join('\n')

  const html = emailLayout({
    title: subject,
    preheader: 'Your questionnaire is in review.',
    bodyHtml: `
      <h1 style="margin:0 0 12px;font-size:26px;font-weight:normal;line-height:1.25;">
        We received your answers
      </h1>
      <p style="margin:0 0 16px;font-size:16px;line-height:1.55;font-family:system-ui,-apple-system,sans-serif;color:#44403c;">
        Hi ${escapeHtml(name)}, thank you for submitting your Texas will questionnaire.
        Our team will review your answers and prepare your documents.
      </p>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 20px;background:#fafaf9;border:1px solid #e7e5e4;border-radius:8px;font-family:system-ui,-apple-system,sans-serif;font-size:14px;color:#44403c;">
        <tr><td style="padding:14px 16px;">
          <div><strong>Order</strong> · ${escapeHtml(ctx.orderId.slice(0, 8))}…</div>
          <div style="margin-top:6px;"><strong>Plan</strong> · ${escapeHtml(plan)}${escapeHtml(trust)}</div>
          <div style="margin-top:6px;"><strong>Submitted</strong> · ${escapeHtml(when)} CT</div>
          ${
            ctx.amountPaidCents > 0
              ? `<div style="margin-top:6px;"><strong>Amount</strong> · ${escapeHtml(formatMoneyCents(ctx.amountPaidCents))}</div>`
              : ''
          }
        </td></tr>
      </table>
      <p style="margin:0;font-size:15px;line-height:1.55;font-family:system-ui,-apple-system,sans-serif;color:#44403c;">
        You do not need to do anything else right now. We will email you when your documents are ready.
      </p>
    `,
  })

  return { subject, html, text }
}
