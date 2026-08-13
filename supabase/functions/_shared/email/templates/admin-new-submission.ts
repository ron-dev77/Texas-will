import { emailLayout, escapeHtml, formatMoneyCents, formatWhen } from '../layout.ts'
import type { SubmissionEmailContext } from '../types.ts'

/** Internal alert when a customer submits the questionnaire. */
export function buildAdminNewSubmissionEmail(ctx: SubmissionEmailContext): {
  subject: string
  html: string
  text: string
} {
  const who =
    ctx.customerName?.trim() ||
    ctx.customerEmail ||
    'Unknown customer'
  const partnerBit =
    ctx.planType === 'couples'
      ? ` · Partner ${ctx.partnerNumber} submitted`
      : ''
  const when = formatWhen(ctx.submittedAt)
  const orderUrl = `${ctx.appOrigin.replace(/\/$/, '')}${ctx.adminOrdersPath}`

  const subject = `[New submission] ${who}${partnerBit}`
  const text = [
    'New questionnaire submission',
    '',
    `Customer: ${who}`,
    `Email: ${ctx.customerEmail}`,
    ctx.partnerEmail ? `Partner email: ${ctx.partnerEmail}` : null,
    `Plan: ${ctx.planType}${ctx.includeTrust ? ' + trust' : ''}`,
    `Amount: ${formatMoneyCents(ctx.amountPaidCents)}`,
    `Partner #: ${ctx.partnerNumber}`,
    `Submitted: ${when} CT`,
    `Order ID: ${ctx.orderId}`,
    '',
    `Open: ${orderUrl}`,
  ]
    .filter(Boolean)
    .join('\n')

  const html = emailLayout({
    title: subject,
    preheader: `New order from ${who}`,
    bodyHtml: `
      <h1 style="margin:0 0 12px;font-size:24px;font-weight:normal;line-height:1.25;">
        New questionnaire submission
      </h1>
      <p style="margin:0 0 16px;font-size:15px;line-height:1.55;font-family:system-ui,-apple-system,sans-serif;color:#44403c;">
        A customer finished the questionnaire and is waiting for review.
      </p>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 20px;background:#fafaf9;border:1px solid #e7e5e4;border-radius:8px;font-family:system-ui,-apple-system,sans-serif;font-size:14px;color:#44403c;">
        <tr><td style="padding:14px 16px;">
          <div><strong>Customer</strong> · ${escapeHtml(who)}</div>
          <div style="margin-top:6px;"><strong>Email</strong> · ${escapeHtml(ctx.customerEmail)}</div>
          ${
            ctx.partnerEmail
              ? `<div style="margin-top:6px;"><strong>Partner email</strong> · ${escapeHtml(ctx.partnerEmail)}</div>`
              : ''
          }
          <div style="margin-top:6px;"><strong>Plan</strong> · ${escapeHtml(ctx.planType)}${ctx.includeTrust ? ' + trust' : ''}</div>
          <div style="margin-top:6px;"><strong>Partner #</strong> · ${ctx.partnerNumber}</div>
          <div style="margin-top:6px;"><strong>Amount</strong> · ${escapeHtml(formatMoneyCents(ctx.amountPaidCents))}</div>
          <div style="margin-top:6px;"><strong>Submitted</strong> · ${escapeHtml(when)} CT</div>
          <div style="margin-top:6px;"><strong>Order ID</strong> · <span style="font-family:ui-monospace,monospace;font-size:12px;">${escapeHtml(ctx.orderId)}</span></div>
        </td></tr>
      </table>
      <p style="margin:0;">
        <a href="${escapeHtml(orderUrl)}" style="display:inline-block;padding:12px 18px;background:#1c1917;color:#fafaf9;text-decoration:none;border-radius:999px;font-family:system-ui,-apple-system,sans-serif;font-size:14px;font-weight:600;">
          Open in admin
        </a>
      </p>
    `,
  })

  return { subject, html, text }
}
