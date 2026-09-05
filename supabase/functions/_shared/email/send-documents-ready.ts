import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { isPlaceholderEmail, sendResendEmail } from './resend.ts'
import {
  buildClientDocumentsReadyEmail,
  type DocumentsReadyEmailContext,
} from './templates/client-documents-ready.ts'
import type { EmailAttachment, SendEmailResult } from './types.ts'

function appOrigin(): string {
  return (
    Deno.env.get('APP_ORIGIN')?.trim() ||
    Deno.env.get('PUBLIC_SITE_URL')?.trim() ||
    'https://myaiwill.com'
  )
}

export type DeliveryAttachment = EmailAttachment & {
  kind: string
  partnerNumber: 1 | 2
  label: string
}

export type DeliverDocumentsResult = {
  primary: SendEmailResult | null
  partner: SendEmailResult | null
}

export function validateDocumentsReadyEmailDelivery(params: {
  mail: DeliverDocumentsResult
  attachments: DeliveryAttachment[]
  planType: string
  userEmail: string
  partnerEmail: string | null
}): {
  ok: boolean
  error?: string
  recipients?: { primary?: string; partner?: string }
} {
  const p1 = params.attachments.filter((a) => a.partnerNumber === 1)
  const p2 = params.attachments.filter((a) => a.partnerNumber === 2)
  const needsPrimary = p1.length > 0
  const needsPartner =
    p2.length > 0 &&
    params.planType === 'couples' &&
    Boolean(params.partnerEmail) &&
    !isPlaceholderEmail(params.partnerEmail ?? '')

  const recipients = {
    primary: needsPrimary ? params.userEmail : undefined,
    partner: needsPartner ? params.partnerEmail ?? undefined : undefined,
  }

  if (needsPrimary && isPlaceholderEmail(params.userEmail)) {
    return {
      ok: false,
      error: 'Partner 1 documents are in the bucket but the order has no valid customer email.',
      recipients,
    }
  }

  if (p2.length > 0 && params.planType === 'couples') {
    if (!params.partnerEmail || isPlaceholderEmail(params.partnerEmail)) {
      return {
        ok: false,
        error: 'Partner 2 documents are in the bucket but the order has no valid partner email.',
        recipients,
      }
    }
  }

  if (needsPrimary && params.mail.primary?.ok !== true) {
    const detail = params.mail.primary?.error ?? 'Primary customer email was not sent.'
    return {
      ok: false,
      error: `Email to ${params.userEmail} failed: ${detail}`,
      recipients,
    }
  }

  if (needsPartner && params.mail.partner?.ok !== true) {
    const detail = params.mail.partner?.error ?? 'Partner email was not sent.'
    return {
      ok: false,
      error: `Email to ${params.partnerEmail} failed: ${detail}`,
      recipients,
    }
  }

  if (params.attachments.length > 0 && !needsPrimary && !needsPartner) {
    return {
      ok: false,
      error: 'No valid recipient emails matched the documents in the bucket.',
      recipients,
    }
  }

  return { ok: true, recipients }
}

export async function sendDocumentsReadyEmails(params: {
  orderId: string
  customerName: string | null
  partnerName: string | null
  userEmail: string
  partnerEmail: string | null
  planType: string
  zipByPartner: Record<1 | 2, string | null>
  attachments: DeliveryAttachment[]
}): Promise<DeliverDocumentsResult> {
  const origin = appOrigin()
  const result: DeliverDocumentsResult = { primary: null, partner: null }

  const p1 = params.attachments.filter((a) => a.partnerNumber === 1)
  const p2 = params.attachments.filter((a) => a.partnerNumber === 2)

  if (!isPlaceholderEmail(params.userEmail) && p1.length > 0) {
    const ctx: DocumentsReadyEmailContext = {
      customerName: params.customerName,
      customerEmail: params.userEmail,
      orderId: params.orderId,
      zip: params.zipByPartner[1],
      appOrigin: origin,
      documentLabels: p1.map((a) => a.label),
    }
    const tpl = buildClientDocumentsReadyEmail(ctx)
    result.primary = await sendResendEmail({
      to: params.userEmail,
      subject: tpl.subject,
      html: tpl.html,
      text: tpl.text,
      attachments: p1.map(({ filename, content, contentType }) => ({
        filename,
        content,
        contentType: contentType || 'application/pdf',
      })),
      tags: [
        { name: 'category', value: 'documents_ready' },
        { name: 'order_id', value: params.orderId.slice(0, 36) },
      ],
    })
  }

  if (
    params.planType === 'couples' &&
    params.partnerEmail &&
    !isPlaceholderEmail(params.partnerEmail) &&
    p2.length > 0
  ) {
    const ctx: DocumentsReadyEmailContext = {
      customerName: params.partnerName,
      customerEmail: params.partnerEmail,
      orderId: params.orderId,
      zip: params.zipByPartner[2] ?? params.zipByPartner[1],
      appOrigin: origin,
      documentLabels: p2.map((a) => a.label),
    }
    const tpl = buildClientDocumentsReadyEmail(ctx)
    result.partner = await sendResendEmail({
      to: params.partnerEmail,
      subject: tpl.subject,
      html: tpl.html,
      text: tpl.text,
      attachments: p2.map(({ filename, content, contentType }) => ({
        filename,
        content,
        contentType: contentType || 'application/pdf',
      })),
      tags: [
        { name: 'category', value: 'documents_ready_partner' },
        { name: 'order_id', value: params.orderId.slice(0, 36) },
      ],
    })
  }

  // Individual / single-partner: if only partner 2 attachments somehow, still try primary email
  if (
    result.primary === null &&
    !isPlaceholderEmail(params.userEmail) &&
    p1.length === 0 &&
    p2.length > 0 &&
    params.planType !== 'couples'
  ) {
    const ctx: DocumentsReadyEmailContext = {
      customerName: params.customerName,
      customerEmail: params.userEmail,
      orderId: params.orderId,
      zip: params.zipByPartner[2] ?? params.zipByPartner[1],
      appOrigin: origin,
      documentLabels: p2.map((a) => a.label),
    }
    const tpl = buildClientDocumentsReadyEmail(ctx)
    result.primary = await sendResendEmail({
      to: params.userEmail,
      subject: tpl.subject,
      html: tpl.html,
      text: tpl.text,
      attachments: p2.map(({ filename, content, contentType }) => ({
        filename,
        content,
        contentType: contentType || 'application/pdf',
      })),
      tags: [
        { name: 'category', value: 'documents_ready' },
        { name: 'order_id', value: params.orderId.slice(0, 36) },
      ],
    })
  }

  console.log('[email] documents ready', {
    orderId: params.orderId,
    primary: result.primary,
    partner: result.partner,
  })

  return result
}

/** Mark will_documents rows as approved/sent for kinds that were emailed. */
export async function markDocumentsSent(
  sb: SupabaseClient,
  orderId: string,
  attachments: DeliveryAttachment[],
) {
  const now = new Date().toISOString()
  for (const att of attachments) {
    await sb
      .from('will_documents')
      .update({ status: 'sent', draft_generated_at: now })
      .eq('order_id', orderId)
      .eq('partner_number', att.partnerNumber)
      .eq('document_kind', att.kind)
  }
}
