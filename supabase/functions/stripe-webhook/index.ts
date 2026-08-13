/**
 * Stripe webhook endpoint.
 * URL: https://<project-ref>.supabase.co/functions/v1/stripe-webhook
 *
 * Stripe Dashboard → Developers → Webhooks → Add endpoint
 * Events: payment_intent.succeeded, payment_intent.payment_failed
 * Signing secret → STRIPE_WEBHOOK_SECRET (Supabase secrets)
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import Stripe from 'https://esm.sh/stripe@17.7.0?target=deno'
import { finalizePaidOrder } from '../_shared/finalize-order.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, stripe-signature',
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

function stripeClient() {
  const key = Deno.env.get('STRIPE_SECRET_KEY')?.trim()
  if (!key) throw new Error('STRIPE_SECRET_KEY is not configured')
  return new Stripe(key, {
    apiVersion: '2024-06-20',
    httpClient: Stripe.createFetchHttpClient(),
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')?.trim()
  if (!webhookSecret) {
    console.error('[stripe-webhook] STRIPE_WEBHOOK_SECRET is not configured')
    return json({ error: 'Webhook secret not configured' }, 500)
  }

  const signature = req.headers.get('stripe-signature')
  if (!signature) {
    return json({ error: 'Missing stripe-signature header' }, 400)
  }

  try {
    const stripe = stripeClient()
    const body = await req.text()

    let event: Stripe.Event
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Invalid signature'
      console.error('[stripe-webhook] signature verify failed', message)
      return json({ error: `Webhook signature verification failed: ${message}` }, 400)
    }

    const sb = adminClient()

    if (event.type === 'payment_intent.succeeded') {
      const intent = event.data.object as Stripe.PaymentIntent
      const result = await finalizePaidOrder(
        sb,
        intent.id,
        'Stripe webhook: payment_intent.succeeded',
      )
      if (!result.ok) {
        console.error('[stripe-webhook] finalize failed', intent.id, result.error)
        // 200 so Stripe does not retry forever when order was never created
        return json({ received: true, finalized: false, error: result.error })
      }
      return json({
        received: true,
        finalized: true,
        orderId: result.orderId,
        emailsSent: result.emailsSent,
      })
    }

    if (event.type === 'payment_intent.payment_failed') {
      const intent = event.data.object as Stripe.PaymentIntent
      const { error } = await sb
        .from('orders')
        .update({ status: 'failed' })
        .eq('stripe_payment_intent_id', intent.id)
        .eq('status', 'pending_payment')

      if (error) {
        console.error('[stripe-webhook] mark failed', error.message)
      }

      return json({ received: true, markedFailed: true })
    }

    return json({ received: true, ignored: event.type })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error'
    console.error('[stripe-webhook]', message)
    return json({ error: message }, 500)
  }
})
