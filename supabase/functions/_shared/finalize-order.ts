import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { sendQuestionnaireInvites } from './email/send-invite.ts'
import type { CheckoutPlan } from './pricing.ts'

export function expiresIn30Days(): string {
  const d = new Date()
  d.setDate(d.getDate() + 30)
  return d.toISOString()
}

async function ensureAnswerRows(
  sb: SupabaseClient,
  orderId: string,
  plan: CheckoutPlan,
) {
  const { data: existing } = await sb
    .from('questionnaire_answers')
    .select('id, partner_number')
    .eq('order_id', orderId)

  const have = new Set((existing ?? []).map((r) => r.partner_number))
  const toCreate: number[] = []
  if (!have.has(1)) toCreate.push(1)
  if (plan === 'couples' && !have.has(2)) toCreate.push(2)

  for (const partner_number of toCreate) {
    const { error } = await sb.from('questionnaire_answers').insert({
      order_id: orderId,
      partner_number,
      answers: {},
      current_section: 1,
      review_status: 'in_progress',
    })
    if (error) throw new Error(error.message)
  }
}

/** Mark order paid, create answer rows, send questionnaire invite emails (idempotent). */
export async function finalizePaidOrder(
  sb: SupabaseClient,
  paymentIntentId: string,
  note = 'Stripe payment succeeded',
) {
  const { data: order, error } = await sb
    .from('orders')
    .select(
      'id, plan_type, user_email, partner_email, amount_paid, add_ons, status, partner1_token, partner2_token, questionnaire_expires_at, customer_confirmation_sent_at',
    )
    .eq('stripe_payment_intent_id', paymentIntentId)
    .maybeSingle()

  if (error || !order) {
    return { ok: false as const, error: 'Order not found for this payment' }
  }

  const plan: CheckoutPlan = order.plan_type === 'couples' ? 'couples' : 'individual'
  const addOns = (order.add_ons ?? {}) as {
    trust?: boolean
    plan_cents?: number
    trust_cents?: number
  }
  const expiresAt = order.questionnaire_expires_at || expiresIn30Days()

  if (order.status === 'pending_payment' || order.status === 'failed') {
    const { error: updErr } = await sb
      .from('orders')
      .update({
        status: 'paid',
        questionnaire_expires_at: expiresAt,
      })
      .eq('id', order.id)

    if (updErr) return { ok: false as const, error: updErr.message }

    await sb.from('will_status_events').insert({
      order_id: order.id,
      status: 'paid',
      note,
      partner_number: 1,
    })
  }

  await ensureAnswerRows(sb, order.id, plan)

  let emailsSent = Boolean(order.customer_confirmation_sent_at)
  if (!emailsSent) {
    try {
      await sendQuestionnaireInvites(sb, {
        orderId: order.id,
        planType: plan,
        includeTrust: Boolean(addOns.trust),
        amountPaidCents: Number(order.amount_paid ?? 0),
        userEmail: order.user_email,
        partnerEmail: order.partner_email,
        partner1Token: order.partner1_token,
        partner2Token: order.partner2_token,
        expiresAt,
        planCents: Number(addOns.plan_cents ?? (plan === 'couples' ? 39900 : 24900)),
        trustCents: Boolean(addOns.trust)
          ? Number(addOns.trust_cents ?? 5000)
          : 0,
      })
      await sb
        .from('orders')
        .update({ customer_confirmation_sent_at: new Date().toISOString() })
        .eq('id', order.id)
      emailsSent = true
    } catch (mailErr) {
      console.error('[checkout] invite email failed', mailErr)
    }
  }

  return {
    ok: true as const,
    orderId: order.id,
    plan,
    emailsSent,
    expiresAt,
    userEmail: order.user_email,
    partnerEmail: order.partner_email,
  }
}
