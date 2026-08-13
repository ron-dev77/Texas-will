import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import Stripe from 'https://esm.sh/stripe@17.7.0?target=deno'
import { finalizePaidOrder } from '../_shared/finalize-order.ts'
import {
  isValidEmail,
  resolveCheckoutAmount,
  type CheckoutPlan,
} from '../_shared/pricing.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const PACKAGE_DOC_IDS = ['will', 'mpoa', 'dpoa', 'directive', 'hipaa'] as const

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

function stripeClient() {
  const key = Deno.env.get('STRIPE_SECRET_KEY')?.trim()
  if (!key) throw new Error('STRIPE_SECRET_KEY is not configured')
  return new Stripe(key, {
    apiVersion: '2024-06-20',
    httpClient: Stripe.createFetchHttpClient(),
  })
}

function normalizeDocs(raw: unknown): string[] {
  const allowed = new Set(PACKAGE_DOC_IDS as readonly string[])
  const fromRaw = Array.isArray(raw)
    ? raw.map((d) => String(d)).filter((id) => allowed.has(id) && id !== 'will')
    : []
  // Will is always required. Trust is never in this list (paid add-on separately).
  return ['will', ...fromRaw]
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const action = body?.action as string
    const sb = adminClient()

    if (action === 'create_intent') {
      const plan: CheckoutPlan = body?.plan === 'couples' ? 'couples' : 'individual'
      const includeTrust = Boolean(body?.includeTrust)
      const documents = normalizeDocs(body?.documents)
      const email = String(body?.email ?? '')
        .trim()
        .toLowerCase()
      const partnerEmail = String(body?.partnerEmail ?? '')
        .trim()
        .toLowerCase()
      const lsrConsent = Boolean(body?.lsrConsent)

      if (!isValidEmail(email)) {
        return json({ error: 'A valid email is required.' }, 400)
      }
      if (plan === 'couples' && !isValidEmail(partnerEmail)) {
        return json({ error: "Partner's email is required for the Couples plan." }, 400)
      }
      if (plan === 'couples' && partnerEmail === email) {
        return json({ error: 'Partner email must be different from yours.' }, 400)
      }
      if (!lsrConsent) {
        return json({ error: 'LSR consent is required.' }, 400)
      }
      if (documents.length === 0) {
        return json({ error: 'Select at least one document.' }, 400)
      }

      const stripe = stripeClient()
      const priced = await resolveCheckoutAmount(stripe, plan, includeTrust)
      const amountCents = priced.amountCents

      const { data: activeForm } = await sb
        .from('questionnaire_forms')
        .select('id')
        .eq('is_active', true)
        .maybeSingle()

      const { data: order, error: orderError } = await sb
        .from('orders')
        .insert({
          plan_type: plan,
          user_email: email,
          partner_email: plan === 'couples' ? partnerEmail : null,
          add_ons: {
            trust: includeTrust,
            documents,
            stripe_price_ids: priced.priceIds,
          },
          amount_paid: amountCents,
          status: 'pending_payment',
          questionnaire_form_id: activeForm?.id ?? null,
        })
        .select('id')
        .single()

      if (orderError || !order) {
        return json({ error: orderError?.message || 'Failed to create order' }, 400)
      }

      const intent = await stripe.paymentIntents.create({
        amount: amountCents,
        currency: priced.currency || 'usd',
        automatic_payment_methods: { enabled: true },
        receipt_email: email,
        metadata: {
          order_id: order.id,
          plan,
          include_trust: includeTrust ? '1' : '0',
          stripe_price_ids: priced.priceIds.join(','),
        },
        description:
          plan === 'couples'
            ? `My AI Will — Couples${includeTrust ? ' + Trust' : ''}`
            : `My AI Will — Individual${includeTrust ? ' + Trust' : ''}`,
      })

      const { error: linkErr } = await sb
        .from('orders')
        .update({ stripe_payment_intent_id: intent.id })
        .eq('id', order.id)

      if (linkErr) {
        return json({ error: linkErr.message }, 400)
      }

      if (!intent.client_secret) {
        return json({ error: 'Stripe did not return a client secret' }, 500)
      }

      return json({
        orderId: order.id,
        clientSecret: intent.client_secret,
        amountCents,
      })
    }

    if (action === 'finalize') {
      const paymentIntentId = String(body?.paymentIntentId ?? '').trim()
      if (!paymentIntentId.startsWith('pi_')) {
        return json({ error: 'Invalid payment intent' }, 400)
      }

      const stripe = stripeClient()
      const intent = await stripe.paymentIntents.retrieve(paymentIntentId)

      if (intent.status !== 'succeeded') {
        return json(
          { error: `Payment not completed (status: ${intent.status})` },
          400,
        )
      }

      const result = await finalizePaidOrder(sb, paymentIntentId)
      if (!result.ok) return json({ error: result.error }, 400)

      return json({
        ok: true,
        orderId: result.orderId,
        plan: result.plan,
        emailsSent: result.emailsSent,
        expiresAt: result.expiresAt,
        userEmail: result.userEmail,
        partnerEmail: result.partnerEmail,
      })
    }

    return json({ error: `Unknown action: ${action}` }, 400)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error'
    console.error('[checkout]', message)
    return json({ error: message }, 500)
  }
})
