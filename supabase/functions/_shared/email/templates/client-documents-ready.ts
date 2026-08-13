import { emailLayout, escapeHtml } from '../layout.ts'
import { notaryFinderPageUrl, notaryMapsSearchUrl } from '../notary.ts'

export type DocumentsReadyEmailContext = {
  customerName: string | null
  customerEmail: string
  orderId: string
  /** From questionnaire address_zip when available */
  zip: string | null
  appOrigin: string
}

/**
 * Client email when the reviewed will / package is returned (Approve & Send).
 * Includes a hot link to find a notary for the self-proving affidavit.
 */
export function buildClientDocumentsReadyEmail(ctx: DocumentsReadyEmailContext): {
  subject: string
  html: string
  text: string
} {
  const name = ctx.customerName?.trim() || 'there'
  const finderUrl = notaryFinderPageUrl(ctx.appOrigin, ctx.zip)
  const mapsUrl = notaryMapsSearchUrl(ctx.zip)
  const zipNote = ctx.zip?.trim()
    ? `We pre-filled ZIP ${ctx.zip.trim()} from your questionnaire — you can change it on the page.`
    : 'Enter your ZIP code on the page to search Google Maps for notaries near you.'

  const subject = 'Your My AI Will documents are ready'
  const text = [
    `Hi ${name},`,
    '',
    'Your reviewed documents are ready. Please download and review them carefully.',
    '',
    'Important — notarization:',
    'Texas wills typically include a self-proving affidavit that should be notarized when you sign with your witnesses.',
    '',
    `Find a notary near you: ${finderUrl}`,
    `(Direct Google Maps: ${mapsUrl})`,
    zipNote,
    '',
    `Order: ${ctx.orderId}`,
    '',
    '— My AI Will',
    'scott@myaiwill.com',
  ].join('\n')

  const html = emailLayout({
    title: subject,
    preheader: 'Your documents are ready — find a notary for the self-proving affidavit.',
    bodyHtml: `
      <h1 style="margin:0 0 12px;font-size:26px;font-weight:normal;line-height:1.25;">
        Your documents are ready
      </h1>
      <p style="margin:0 0 16px;font-size:16px;line-height:1.55;font-family:system-ui,-apple-system,sans-serif;color:#44403c;">
        Hi ${escapeHtml(name)}, your reviewed My AI Will package is ready. Please download and review everything carefully.
      </p>
      <div style="margin:0 0 20px;padding:16px;background:#fafaf9;border:1px solid #e7e5e4;border-radius:8px;font-family:system-ui,-apple-system,sans-serif;font-size:14px;color:#44403c;line-height:1.55;">
        <strong style="display:block;margin-bottom:6px;">Next step: notarize the self-proving affidavit</strong>
        When you sign with your witnesses, have a notary complete the self-proving affidavit.
        ${escapeHtml(zipNote)}
      </div>
      <p style="margin:0 0 12px;">
        <a href="${escapeHtml(finderUrl)}" style="display:inline-block;padding:12px 18px;background:#1c1917;color:#fafaf9;text-decoration:none;border-radius:999px;font-family:system-ui,-apple-system,sans-serif;font-size:14px;font-weight:600;">
          Find a notary near me
        </a>
      </p>
      <p style="margin:0 0 16px;font-size:12px;font-family:system-ui,-apple-system,sans-serif;color:#a8a29e;">
        Or open <a href="${escapeHtml(mapsUrl)}" style="color:#78716c;">Google Maps directly</a>.
      </p>
      <p style="margin:0;font-size:13px;font-family:system-ui,-apple-system,sans-serif;color:#78716c;">
        Order ${escapeHtml(ctx.orderId.slice(0, 8))}…
      </p>
    `,
  })

  return { subject, html, text }
}
