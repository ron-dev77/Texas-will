import { supabase } from '@/integrations/supabase/client'
import type { OrderDraft, PackageDocId, Plan } from '@/lib/order'
import { normalizeOrderDocuments, saveOrderDraft } from '@/lib/order'

export type CreateCheckoutIntentResult = {
  orderId: string
  clientSecret: string
  amountCents: number
  questionnaireToken?: string
}

export type FinalizeCheckoutResult = {
  ok: true
  orderId: string
  plan: Plan
  emailsSent: boolean
  expiresAt: string
  userEmail: string
  partnerEmail: string | null
  questionnaireToken?: string
}

async function readFunctionError(error: unknown, data: unknown): Promise<string> {
  if (data && typeof data === 'object' && 'error' in data && (data as { error: unknown }).error) {
    return String((data as { error: string }).error)
  }

  const err = error as {
    message?: string
    context?: Response
  }

  try {
    const ctx = err?.context
    if (ctx && typeof ctx.json === 'function') {
      const body = await ctx.clone().json()
      if (body && typeof body === 'object' && 'error' in body && body.error) {
        return String((body as { error: string }).error)
      }
      if (body && typeof body === 'object' && 'message' in body && body.message) {
        return String((body as { message: string }).message)
      }
    }
  } catch {
    /* ignore */
  }

  const msg = err?.message || 'Checkout service error'
  if (msg.toLowerCase().includes('non-2xx')) {
    return (
      'Checkout could not start. Deploy the `checkout` edge function and set ' +
      'STRIPE_SECRET_KEY (and real price IDs) in Supabase secrets.'
    )
  }
  return msg
}

async function invokeCheckout<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('checkout', { body })
  if (error) {
    throw new Error(await readFunctionError(error, data))
  }
  if (data && typeof data === 'object' && 'error' in data && data.error) {
    throw new Error(String((data as { error: string }).error))
  }
  if (!data) {
    throw new Error(
      'Checkout returned empty response. Deploy `checkout` and set STRIPE_SECRET_KEY in Supabase.',
    )
  }
  return data as T
}

export async function createCheckoutIntent(draft: {
  plan: Plan
  email: string
  partnerEmail?: string
  includeTrust: boolean
  includeSpousalTrust: boolean
  qualifier?: OrderDraft['qualifier']
  documents: PackageDocId[]
  lsrConsent: boolean
}): Promise<CreateCheckoutIntentResult> {
  return invokeCheckout<CreateCheckoutIntentResult>({
    action: 'create_intent',
    plan: draft.plan,
    email: draft.email,
    partnerEmail: draft.partnerEmail,
    includeTrust: draft.includeTrust,
    includeSpousalTrust: draft.includeSpousalTrust,
    qualifier: draft.qualifier,
    estateBracket: draft.qualifier?.estateBracket,
    documents: draft.documents,
    lsrConsent: draft.lsrConsent,
  })
}

export async function finalizeCheckoutPayment(
  paymentIntentId: string,
): Promise<FinalizeCheckoutResult> {
  return invokeCheckout<FinalizeCheckoutResult>({
    action: 'finalize',
    paymentIntentId,
  })
}

/** Persist paid draft locally so success UI / resume have context. */
export function savePaidOrderDraft(params: {
  plan: Plan
  email: string
  partnerEmail?: string
  includeTrust: boolean
  includeSpousalTrust: boolean
  qualifier?: OrderDraft['qualifier']
  documents: PackageDocId[]
  total: number
  lsrConsent: boolean
}) {
  const order: OrderDraft = {
    plan: params.plan,
    email: params.email,
    partnerEmail: params.partnerEmail,
    includeTrust: params.includeTrust,
    includeSpousalTrust: params.includeSpousalTrust,
    qualifier: params.qualifier,
    documents: normalizeOrderDocuments(params.documents),
    total: params.total,
    lsrConsent: params.lsrConsent,
  }
  saveOrderDraft(order)
}
