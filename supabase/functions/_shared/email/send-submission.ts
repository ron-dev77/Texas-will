/**
 * Orchestrates transactional emails for a questionnaire submission.
 *
 * Recipients:
 * - Client → email they entered on the order (not a secret)
 * - Admins → every row in public.admin_users (registered admins in Supabase)
 */

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { isPlaceholderEmail, sendResendEmail } from './resend.ts'
import { buildAdminNewSubmissionEmail } from './templates/admin-new-submission.ts'
import { buildClientSubmissionEmail } from './templates/client-submission.ts'
import type { SendEmailResult, SubmissionEmailContext } from './types.ts'

export type SubmissionNotifyResult = {
  client: SendEmailResult | null
  admin: SendEmailResult | null
}

function appOrigin(): string {
  return (
    Deno.env.get('APP_ORIGIN')?.trim() ||
    Deno.env.get('PUBLIC_SITE_URL')?.trim() ||
    'https://myaiwill.com'
  )
}

export function buildSubmissionContext(params: {
  order: {
    id: string
    plan_type: string | null
    user_email: string | null
    partner_email: string | null
    customer_name: string | null
    partner_name: string | null
    amount_paid: number | null
    add_ons: unknown
  }
  partnerNumber: 1 | 2
  submittedAt: string
}): SubmissionEmailContext {
  const addOns = (params.order.add_ons ?? {}) as { trust?: boolean }
  return {
    orderId: params.order.id,
    planType: params.order.plan_type ?? 'individual',
    includeTrust: Boolean(addOns.trust),
    amountPaidCents: Number(params.order.amount_paid ?? 0),
    customerName: params.order.customer_name,
    customerEmail: (params.order.user_email ?? '').trim(),
    partnerName: params.order.partner_name,
    partnerEmail: params.order.partner_email,
    partnerNumber: params.partnerNumber,
    submittedAt: params.submittedAt,
    appOrigin: appOrigin(),
    adminOrdersPath: `/admin/orders/${params.order.id}`,
  }
}

/** Recipient for the client confirmation (submitting partner when couples). */
function clientRecipient(ctx: SubmissionEmailContext): string | null {
  if (ctx.partnerNumber === 2 && ctx.partnerEmail && !isPlaceholderEmail(ctx.partnerEmail)) {
    return ctx.partnerEmail
  }
  if (!isPlaceholderEmail(ctx.customerEmail)) return ctx.customerEmail
  return null
}

/** All registered admin emails from Supabase (admin_users). */
export async function listRegisteredAdminEmails(
  sb: SupabaseClient,
): Promise<string[]> {
  const { data, error } = await sb.from('admin_users').select('email')
  if (error) {
    console.error('[email] admin_users lookup failed', error.message)
    return []
  }
  const unique = new Set<string>()
  for (const row of data ?? []) {
    const email = String(row.email ?? '')
      .trim()
      .toLowerCase()
    if (email.includes('@') && !isPlaceholderEmail(email)) unique.add(email)
  }
  return [...unique]
}

/**
 * Send client confirmation + admin notification to every registered admin.
 * Never throws — callers should not fail submit if mail fails.
 */
export async function notifyQuestionnaireSubmission(
  sb: SupabaseClient,
  ctx: SubmissionEmailContext,
): Promise<SubmissionNotifyResult> {
  const result: SubmissionNotifyResult = { client: null, admin: null }

  const clientTo = clientRecipient(ctx)
  if (clientTo) {
    const tpl = buildClientSubmissionEmail(ctx)
    result.client = await sendResendEmail({
      to: clientTo,
      subject: tpl.subject,
      html: tpl.html,
      text: tpl.text,
      tags: [
        { name: 'category', value: 'client_submission' },
        { name: 'order_id', value: ctx.orderId.slice(0, 36) },
      ],
    })
  } else {
    result.client = {
      ok: false,
      skipped: true,
      error: 'No valid client email on order',
    }
  }

  const admins = await listRegisteredAdminEmails(sb)
  if (admins.length > 0) {
    const tpl = buildAdminNewSubmissionEmail(ctx)
    result.admin = await sendResendEmail({
      to: admins,
      subject: tpl.subject,
      html: tpl.html,
      text: tpl.text,
      tags: [
        { name: 'category', value: 'admin_new_submission' },
        { name: 'order_id', value: ctx.orderId.slice(0, 36) },
      ],
    })
  } else {
    result.admin = {
      ok: false,
      skipped: true,
      error: 'No admins in admin_users table',
    }
  }

  console.log('[email] submission notify', {
    orderId: ctx.orderId,
    adminCount: admins.length,
    client: result.client,
    admin: result.admin,
  })

  return result
}
