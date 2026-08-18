import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import {
  buildSubmissionContext,
  notifyQuestionnaireSubmission,
} from '../_shared/email/send-submission.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type Answers = Record<string, unknown>

type Session = {
  orderId: string
  answersId: string
  partnerNumber: 1 | 2
  partnerToken: string
}

type DraftMeta = {
  plan: 'individual' | 'couples'
  includeTrust: boolean
  documents: string[]
  email: string
  partnerEmail?: string
  total: number
  expiresAt: string | null
}

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

function draftFromOrder(order: {
  plan_type: string | null
  user_email: string | null
  partner_email: string | null
  amount_paid: number | null
  add_ons: unknown
  questionnaire_expires_at: string | null
}): DraftMeta {
  const addOns = (order.add_ons ?? {}) as { trust?: boolean; documents?: string[] }
  const docs =
    Array.isArray(addOns.documents) && addOns.documents.length > 0
      ? addOns.documents
      : ['will']
  return {
    plan: order.plan_type === 'couples' ? 'couples' : 'individual',
    includeTrust: Boolean(addOns.trust),
    documents: docs,
    email: (order.user_email ?? '').trim(),
    partnerEmail: order.partner_email?.trim() || undefined,
    total: Math.round(Number(order.amount_paid ?? 0) / 100),
    expiresAt: order.questionnaire_expires_at,
  }
}

function isExpired(expiresAt: string | null | undefined): boolean {
  if (!expiresAt) return false
  return new Date(expiresAt).getTime() < Date.now()
}

async function resolvePartner(
  sb: ReturnType<typeof adminClient>,
  session: Session,
) {
  const { data: order, error } = await sb
    .from('orders')
    .select(
      'id, partner1_token, partner2_token, status, questionnaire_expires_at, plan_type, user_email, partner_email, amount_paid, add_ons',
    )
    .eq('id', session.orderId)
    .maybeSingle()

  if (error || !order) return null

  const token = session.partnerToken
  let partnerNumber: 1 | 2 | null = null
  if (token && token === order.partner1_token) partnerNumber = 1
  else if (token && token === order.partner2_token) partnerNumber = 2
  if (!partnerNumber || partnerNumber !== session.partnerNumber) return null

  if (order.status === 'pending_payment' || order.status === 'failed') return null
  if (isExpired(order.questionnaire_expires_at)) return null

  const { data: answers } = await sb
    .from('questionnaire_answers')
    .select('id, answers, submitted_at, current_section')
    .eq('id', session.answersId)
    .eq('order_id', session.orderId)
    .eq('partner_number', partnerNumber)
    .maybeSingle()

  if (!answers) return null
  return { order, answers, partnerNumber }
}

const ORDER_SELECT =
  'id, partner1_token, partner2_token, status, questionnaire_expires_at, plan_type, user_email, partner_email, amount_paid, add_ons'

type OrderRow = {
  id: string
  partner1_token: string | null
  partner2_token: string | null
  status: string | null
  questionnaire_expires_at: string | null
  plan_type: string | null
  user_email: string | null
  partner_email: string | null
  amount_paid: number | null
  add_ons: unknown
}

async function sessionForOrder(
  sb: ReturnType<typeof adminClient>,
  order: OrderRow,
  partnerNumber: 1 | 2,
) {
  if (order.status === 'pending_payment' || order.status === 'failed') {
    return { error: 'Payment is not complete for this order.' as const }
  }
  if (isExpired(order.questionnaire_expires_at)) {
    return {
      error:
        'This questionnaire link has expired (30 days from payment). Contact scott@myaiwill.com for help.' as const,
    }
  }

  let { data: answersRow } = await sb
    .from('questionnaire_answers')
    .select('id, answers, submitted_at, current_section')
    .eq('order_id', order.id)
    .eq('partner_number', partnerNumber)
    .maybeSingle()

  if (!answersRow) {
    const { data: created, error: createErr } = await sb
      .from('questionnaire_answers')
      .insert({
        order_id: order.id,
        partner_number: partnerNumber,
        answers: {},
        current_section: 1,
        review_status: 'in_progress',
      })
      .select('id, answers, submitted_at, current_section')
      .single()
    if (createErr || !created) {
      return { error: createErr?.message || 'Failed to open questionnaire' }
    }
    answersRow = created
  }

  const partnerToken =
    partnerNumber === 1 ? order.partner1_token : order.partner2_token

  const session: Session = {
    orderId: order.id,
    answersId: answersRow.id,
    partnerNumber,
    partnerToken: partnerToken || '',
  }

  return {
    session,
    answers: (answersRow.answers ?? {}) as Answers,
    submitted: Boolean(answersRow.submitted_at),
    draft: draftFromOrder(order),
  }
}

async function openByToken(sb: ReturnType<typeof adminClient>, rawToken: string) {
  const token = rawToken.trim()
  if (!token || token.length < 16) return null

  const { data: byP1 } = await sb
    .from('orders')
    .select(ORDER_SELECT)
    .eq('partner1_token', token)
    .maybeSingle()

  let order = byP1 as OrderRow | null
  let partnerNumber: 1 | 2 = 1

  if (!order) {
    const { data: byP2 } = await sb
      .from('orders')
      .select(ORDER_SELECT)
      .eq('partner2_token', token)
      .maybeSingle()
    order = byP2 as OrderRow | null
    partnerNumber = 2
  }

  if (!order) return null
  return sessionForOrder(sb, order, partnerNumber)
}

async function openByPaymentIntent(
  sb: ReturnType<typeof adminClient>,
  rawPaymentIntentId: string,
) {
  const paymentIntentId = rawPaymentIntentId.trim()
  if (!paymentIntentId.startsWith('pi_')) return null

  const { data: order } = await sb
    .from('orders')
    .select(ORDER_SELECT)
    .eq('stripe_payment_intent_id', paymentIntentId)
    .maybeSingle()

  if (!order) return null
  return sessionForOrder(sb, order as OrderRow, 1)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const action = body?.action as string
    const sb = adminClient()

    if (action === 'open') {
      const token = String(body?.token ?? '')
      const opened = await openByToken(sb, token)
      if (!opened) return json({ error: 'Invalid questionnaire link' }, 403)
      if ('error' in opened && opened.error && !('session' in opened)) {
        return json({ error: opened.error }, 403)
      }
      return json(opened)
    }

    if (action === 'ensure') {
      const localAnswers = (body?.localAnswers ?? {}) as Answers
      const existing = body?.session as Session | null | undefined
      const token = String(body?.token ?? '').trim()
      const paymentIntentId = String(body?.paymentIntentId ?? '').trim()

      // Email link token wins over any stale localStorage session
      if (token) {
        const opened = await openByToken(sb, token)
        if (!opened) return json({ error: 'Invalid questionnaire link' }, 403)
        if ('error' in opened && opened.error && !('session' in opened)) {
          return json({ error: opened.error }, 403)
        }
        return json(opened)
      }

      if (paymentIntentId) {
        const opened = await openByPaymentIntent(sb, paymentIntentId)
        if (!opened) return json({ error: 'Invalid questionnaire link' }, 403)
        if ('error' in opened && opened.error && !('session' in opened)) {
          return json({ error: opened.error }, 403)
        }
        return json(opened)
      }

      if (existing?.orderId && existing?.partnerToken && existing?.answersId) {
        const resolved = await resolvePartner(sb, existing)
        if (resolved) {
          const dbAnswers = (resolved.answers.answers ?? {}) as Answers
          const merged =
            Object.keys(dbAnswers).length > 0
              ? dbAnswers
              : Object.keys(localAnswers).length > 0
                ? localAnswers
                : {}
          return json({
            session: existing,
            answers: merged,
            submitted: Boolean(resolved.answers.submitted_at),
            draft: draftFromOrder(resolved.order),
          })
        }
      }

      return json(
        {
          error:
            'Open the secure link from your payment confirmation email to start the questionnaire.',
        },
        403,
      )
    }

    if (action === 'save') {
      const session = body?.session as Session
      const answers = (body?.answers ?? {}) as Answers
      const currentSection = Math.max(1, Number(body?.currentSection) || 1)
      if (!session) return json({ error: 'Missing session' }, 400)

      const resolved = await resolvePartner(sb, session)
      if (!resolved) return json({ error: 'Invalid or expired session token' }, 403)
      if (resolved.answers.submitted_at) {
        return json({ error: 'Questionnaire already submitted' }, 409)
      }

      const { error } = await sb
        .from('questionnaire_answers')
        .update({
          answers,
          current_section: currentSection,
        })
        .eq('id', session.answersId)

      if (error) return json({ error: error.message }, 400)
      return json({ ok: true })
    }

    if (action === 'submit') {
      const session = body?.session as Session
      const answers = (body?.answers ?? {}) as Answers
      if (!session) return json({ error: 'Missing session' }, 400)

      const resolved = await resolvePartner(sb, session)
      if (!resolved) return json({ error: 'Invalid or expired session token' }, 403)

      const now = new Date().toISOString()
      const { error: answersError } = await sb
        .from('questionnaire_answers')
        .update({
          answers,
          submitted_at: now,
          review_status: 'pending',
        })
        .eq('id', session.answersId)

      if (answersError) return json({ error: answersError.message }, 400)

      const orderPatch =
        session.partnerNumber === 1
          ? { partner1_submitted_at: now, submitted_at: now, status: 'submitted' }
          : { partner2_submitted_at: now, submitted_at: now, status: 'submitted' }

      const { error: orderError } = await sb
        .from('orders')
        .update(orderPatch)
        .eq('id', session.orderId)

      if (orderError) return json({ error: orderError.message }, 400)

      await sb.from('will_status_events').insert({
        order_id: session.orderId,
        status: 'submitted',
        note: 'Questionnaire submitted',
        partner_number: session.partnerNumber,
      })

      try {
        const { data: orderRow } = await sb
          .from('orders')
          .select(
            'id, plan_type, user_email, partner_email, customer_name, partner_name, amount_paid, add_ons',
          )
          .eq('id', session.orderId)
          .maybeSingle()

        if (orderRow) {
          const ctx = buildSubmissionContext({
            order: orderRow,
            partnerNumber: session.partnerNumber,
            submittedAt: now,
          })
          await notifyQuestionnaireSubmission(sb, ctx)
        }
      } catch (mailErr) {
        console.error('[email] submission notify failed', mailErr)
      }

      return json({ ok: true })
    }

    return json({ error: `Unknown action: ${action}` }, 400)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error'
    return json({ error: message }, 500)
  }
})
