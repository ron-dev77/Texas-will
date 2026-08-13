import { supabase } from '@/integrations/supabase/client'
import type { OrderDraft, PackageDocId, Plan } from '@/lib/order'
import { normalizeOrderDocuments, saveOrderDraft } from '@/lib/order'

export type CreateCheckoutIntentResult = {
  orderId: string
  clientSecret: string
  amountCents: number
}

export type FinalizeCheckoutResult = {
  ok: true
  orderId: string
  plan: Plan
  emailsSent: boolean
  expiresAt: string
  userEmail: string
  partnerEmail: string | null
}

async function invokeCheckout<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('checkout', { body })
  if (error) {
    throw new Error(error.message || 'Checkout service error')
  }
  if (data && typeof data === 'object' && 'error' in data && data.error) {
    throw new Error(String((data as { error: string }).error))
  }
  return data as T
}

export async function createCheckoutIntent(draft: {
  plan: Plan
  email: string
  partnerEmail?: string
  includeTrust: boolean
  documents: PackageDocId[]
  lsrConsent: boolean
}): Promise<CreateCheckoutIntentResult> {
  return invokeCheckout<CreateCheckoutIntentResult>({
    action: 'create_intent',
    plan: draft.plan,
    email: draft.email,
    partnerEmail: draft.partnerEmail,
    includeTrust: draft.includeTrust,
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
  documents: PackageDocId[]
  total: number
  lsrConsent: boolean
}) {
  const order: OrderDraft = {
    plan: params.plan,
    email: params.email,
    partnerEmail: params.partnerEmail,
    includeTrust: params.includeTrust,
    documents: normalizeOrderDocuments(params.documents),
    total: params.total,
    lsrConsent: params.lsrConsent,
  }
  saveOrderDraft(order)
}
