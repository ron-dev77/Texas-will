import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

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

type Draft = {
  plan?: 'individual' | 'couples'
  email?: string
  partnerEmail?: string
  includeTrust?: boolean
  total?: number
} | null

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

async function resolvePartner(
  sb: ReturnType<typeof adminClient>,
  session: Session,
) {
  const { data: order, error } = await sb
    .from('orders')
    .select('id, partner1_token, partner2_token, status')
    .eq('id', session.orderId)
    .maybeSingle()

  if (error || !order) return null

  const token = session.partnerToken
  let partnerNumber: 1 | 2 | null = null
  if (token && token === order.partner1_token) partnerNumber = 1
  else if (token && token === order.partner2_token) partnerNumber = 2
  if (!partnerNumber || partnerNumber !== session.partnerNumber) return null

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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const action = body?.action as string
    const sb = adminClient()

    if (action === 'ensure') {
      const draft = (body?.draft ?? null) as Draft
      const localAnswers = (body?.localAnswers ?? {}) as Answers
      const existing = body?.session as Session | null | undefined

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
          })
        }
      }

      const email = draft?.email?.trim() || 'pending@myaiwill.local'
      const plan = draft?.plan === 'couples' ? 'couples' : 'individual'
      const amountCents = Math.round((draft?.total ?? 0) * 100)

      const { data: order, error: orderError } = await sb
        .from('orders')
        .insert({
          plan_type: plan,
          user_email: email,
          partner_email: plan === 'couples' ? draft?.partnerEmail?.trim() || null : null,
          add_ons: { trust: Boolean(draft?.includeTrust) },
          amount_paid: amountCents,
          status: 'paid',
        })
        .select('id, partner1_token')
        .single()

      if (orderError || !order) {
        return json({ error: orderError?.message || 'Failed to create order' }, 400)
      }

      const { data: answersRow, error: answersError } = await sb
        .from('questionnaire_answers')
        .insert({
          order_id: order.id,
          partner_number: 1,
          answers: localAnswers,
          current_section: 1,
          review_status: 'in_progress',
        })
        .select('id')
        .single()

      if (answersError || !answersRow) {
        return json({ error: answersError?.message || 'Failed to create answers' }, 400)
      }

      const session: Session = {
        orderId: order.id,
        answersId: answersRow.id,
        partnerNumber: 1,
        partnerToken: order.partner1_token,
      }

      await sb.from('will_status_events').insert({
        order_id: order.id,
        status: 'paid',
        note: 'Order created from questionnaire (pre-email flow)',
        partner_number: 1,
      })

      return json({ session, answers: localAnswers, submitted: false })
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

      return json({ ok: true })
    }

    return json({ error: `Unknown action: ${action}` }, 400)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error'
    return json({ error: message }, 500)
  }
})
