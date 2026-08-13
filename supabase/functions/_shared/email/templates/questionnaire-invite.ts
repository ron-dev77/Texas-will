import { emailLayout, escapeHtml, formatMoneyCents, formatWhen } from '../layout.ts'

export type QuestionnaireInviteContext = {
  orderId: string
  planType: string
  includeTrust: boolean
  amountPaidCents: number
  recipientEmail: string
  partnerLabel: 'you' | 'partner'
  questionnaireUrl: string
  expiresAt: string
  appOrigin: string
}

/** Post-payment invite with secure questionnaire link (30-day token). */
export function buildQuestionnaireInviteEmail(ctx: QuestionnaireInviteContext): {
  subject: string
  html: string
  text: string
} {
  const plan = ctx.planType === 'couples' ? 'Couples plan' : 'Individual plan'
  const trust = ctx.includeTrust ? ' · Living trust add-on' : ''
  const expires = formatWhen(ctx.expiresAt)
  const who =
    ctx.partnerLabel === 'partner'
      ? 'Your partner completed payment for your Couples My AI Will package. This link is yours alone.'
      : 'Thank you for your payment. Your secure questionnaire link is ready.'

  const subject = 'Your My AI Will questionnaire is ready'
  const text = [
    'Hi,',
    '',
    who,
    '',
    `Plan: ${plan}${trust}`,
    `Amount paid: ${formatMoneyCents(ctx.amountPaidCents)}`,
    `Complete by: ${expires} CT (30 days from payment)`,
    '',
    'Open your questionnaire:',
    ctx.questionnaireUrl,
    '',
    'Keep this email — the link is private. Do not share it.',
    '',
    'Questions? Reply to this email or write scott@myaiwill.com',
    '',
    '— My AI Will',
    'Texas Ai Law Group, PLLC',
  ].join('\n')

  const html = emailLayout({
    title: subject,
    preheader: 'Secure link to complete your Texas will questionnaire — valid 30 days.',
    bodyHtml: `
      <h1 style="margin:0 0 12px;font-size:26px;font-weight:normal;line-height:1.25;color:#1c1917;">
        Your questionnaire is ready
      </h1>
      <p style="margin:0 0 16px;font-size:16px;line-height:1.55;font-family:system-ui,-apple-system,sans-serif;color:#44403c;">
        ${escapeHtml(who)}
      </p>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 24px;background:#fafaf9;border:1px solid #e7e5e4;border-radius:8px;font-family:system-ui,-apple-system,sans-serif;font-size:14px;color:#44403c;">
        <tr><td style="padding:14px 16px;">
          <div><strong>Plan</strong> · ${escapeHtml(plan)}${escapeHtml(trust)}</div>
          <div style="margin-top:6px;"><strong>Paid</strong> · ${escapeHtml(formatMoneyCents(ctx.amountPaidCents))}</div>
          <div style="margin-top:6px;"><strong>Complete by</strong> · ${escapeHtml(expires)} CT</div>
          <div style="margin-top:6px;font-size:12px;color:#78716c;">Order ${escapeHtml(ctx.orderId.slice(0, 8))}…</div>
        </td></tr>
      </table>
      <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 0 20px;">
        <tr>
          <td style="border-radius:999px;background:#c45c26;">
            <a href="${escapeHtml(ctx.questionnaireUrl)}" style="display:inline-block;padding:14px 28px;font-family:system-ui,-apple-system,sans-serif;font-size:15px;font-weight:600;color:#fffaf5;text-decoration:none;">
              Continue questionnaire →
            </a>
          </td>
        </tr>
      </table>
      <p style="margin:0 0 12px;font-size:14px;line-height:1.55;font-family:system-ui,-apple-system,sans-serif;color:#57534e;">
        You have <strong>30 days</strong> from payment to finish. Save this email — your link is private and unique to you.
      </p>
      <p style="margin:0;font-size:12px;line-height:1.5;font-family:system-ui,-apple-system,sans-serif;color:#a8a29e;word-break:break-all;">
        If the button does not work, paste this URL into your browser:<br />
        ${escapeHtml(ctx.questionnaireUrl)}
      </p>
    `,
  })

  return { subject, html, text }
}
