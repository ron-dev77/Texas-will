/**
 * Admin: Approve & send reviewed PDFs to the customer (Resend attachments).
 * Requires a logged-in admin/staff JWT (supabase.functions.invoke from admin UI).
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { isPlaceholderEmail } from '../_shared/email/resend.ts'
import {
  markDocumentsSent,
  sendDocumentsReadyEmails,
  validateDocumentsReadyEmailDelivery,
  type DeliveryAttachment,
} from '../_shared/email/send-documents-ready.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const ALLOWED_KINDS = new Set([
  'will',
  'rlt',
  'spousal_trust',
  'mpoa',
  'dpoa',
  'directive',
  'hipaa',
])

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function adminClient() {
  const url = Deno.env.get('SUPABASE_URL')
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !key) throw new Error('Missing Supabase service credentials')
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

async function requireAdmin(req: Request) {
  const auth = req.headers.get('Authorization')
  if (!auth?.startsWith('Bearer ')) {
    return { error: 'Missing authorization', status: 401 as const }
  }
  const url = Deno.env.get('SUPABASE_URL')
  const anon = Deno.env.get('SUPABASE_ANON_KEY')
  if (!url || !anon) throw new Error('Missing Supabase anon credentials')

  const userClient = createClient(url, anon, {
    global: { headers: { Authorization: auth } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: userData, error: userErr } = await userClient.auth.getUser()
  if (userErr || !userData.user) {
    return { error: 'Invalid session', status: 401 as const }
  }

  const sb = adminClient()
  const { data: roles } = await sb
    .from('user_roles')
    .select('role')
    .eq('user_id', userData.user.id)

  const ok = (roles ?? []).some((r) => r.role === 'admin' || r.role === 'staff')
  if (!ok) return { error: 'Admin access required', status: 403 as const }

  return { user: userData.user, sb }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const auth = await requireAdmin(req)
    if ('error' in auth && auth.error) {
      return json({ error: auth.error }, auth.status)
    }
    const sb = auth.sb!

    const body = await req.json()
    const orderId = String(body?.orderId ?? '').trim()
    const markDelivered = body?.markDelivered !== false
    const rawAttachments = Array.isArray(body?.attachments) ? body.attachments : []

    if (!orderId) return json({ error: 'orderId is required' }, 400)
    if (rawAttachments.length === 0) {
      return json({ error: 'Attach at least one PDF document' }, 400)
    }

    const resendKey = Deno.env.get('RESEND_API_KEY')?.trim()
    if (!resendKey) {
      return json(
        {
          error:
            'RESEND_API_KEY is not configured on Supabase. Set it under Edge Function secrets and redeploy deliver-documents.',
        },
        503,
      )
    }

    const attachments: DeliveryAttachment[] = []
    for (const raw of rawAttachments) {
      const kind = String(raw?.kind ?? '').trim()
      const partnerNumber = Number(raw?.partnerNumber) === 2 ? 2 : 1
      const filename = String(raw?.filename ?? '').trim()
      const content = String(raw?.contentBase64 ?? raw?.content ?? '')
        .replace(/^data:application\/pdf;base64,/, '')
        .trim()
      const label = String(raw?.label ?? filename).trim()

      if (!ALLOWED_KINDS.has(kind)) {
        return json({ error: `Invalid document kind: ${kind}` }, 400)
      }
      if (!filename.toLowerCase().endsWith('.pdf')) {
        return json({ error: `Filename must be a PDF: ${filename}` }, 400)
      }
      if (!content || content.length < 32) {
        return json({ error: `Empty PDF for ${filename}` }, 400)
      }
      // ~4.5MB base64 ≈ Resend-friendly per file guard
      if (content.length > 6_000_000) {
        return json({ error: `PDF too large: ${filename}` }, 400)
      }

      attachments.push({
        kind,
        partnerNumber,
        filename,
        content,
        contentType: 'application/pdf',
        label,
      })
    }

    const { data: order, error: orderErr } = await sb
      .from('orders')
      .select(
        'id, plan_type, user_email, partner_email, customer_name, partner_name, add_ons, status',
      )
      .eq('id', orderId)
      .maybeSingle()

    if (orderErr || !order) {
      return json({ error: orderErr?.message || 'Order not found' }, 404)
    }

    const { data: answerRows } = await sb
      .from('questionnaire_answers')
      .select('partner_number, answers')
      .eq('order_id', orderId)

    const zipByPartner: Record<1 | 2, string | null> = { 1: null, 2: null }
    for (const row of answerRows ?? []) {
      const pn = Number(row.partner_number) === 2 ? 2 : 1
      const answers = (row.answers ?? {}) as Record<string, unknown>
      const zip = String(answers.address_zip ?? '').trim()
      zipByPartner[pn] = zip || null
    }

    const userEmail = String(order.user_email ?? '').trim()
    const partnerEmail = order.partner_email ? String(order.partner_email).trim() : null
    const planType = order.plan_type === 'couples' ? 'couples' : 'individual'

    if (isPlaceholderEmail(userEmail)) {
      return json(
        {
          error: `Order has no valid customer email (${userEmail || 'empty'}). Update the order email before sending.`,
        },
        400,
      )
    }

    const mail = await sendDocumentsReadyEmails({
      orderId: order.id,
      customerName: order.customer_name,
      partnerName: order.partner_name,
      userEmail,
      partnerEmail,
      planType,
      zipByPartner,
      attachments,
    })

    const deliveryCheck = validateDocumentsReadyEmailDelivery({
      mail,
      attachments,
      planType,
      userEmail,
      partnerEmail,
    })
    if (!deliveryCheck.ok) {
      return json(
        {
          error: deliveryCheck.error,
          primary: mail.primary,
          partner: mail.partner,
          recipients: deliveryCheck.recipients,
        },
        502,
      )
    }

    await markDocumentsSent(sb, order.id, attachments)

    if (markDelivered) {
      const now = new Date().toISOString()
      await sb
        .from('orders')
        .update({
          status: 'delivered',
          delivered_at: now,
          approved_at: now,
        })
        .eq('id', order.id)

      await sb.from('will_status_events').insert({
        order_id: order.id,
        status: 'delivered',
        note: `Approved & sent PDFs: ${attachments
          .map((a) => `${a.label} (P${a.partnerNumber})`)
          .join(', ')}`,
        partner_number: 1,
      })
    }

    return json({
      ok: true,
      emails: mail,
      sentCount: attachments.length,
      status: markDelivered ? 'delivered' : order.status,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error'
    console.error('[deliver-documents]', message)
    return json({ error: message }, 500)
  }
})
