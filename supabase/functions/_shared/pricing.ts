/** Server-side price calculation — app prices are the source of truth for charging. */

export const PLAN_PRICE_CENTS = {
  individual: 24900,
  couples: 39900,
} as const

export const TRUST_ADDON_CENTS = 5000

export type CheckoutPlan = keyof typeof PLAN_PRICE_CENTS

export function isValidEmail(email: string): boolean {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())
}

/** Always charge these amounts so UI, Stripe charge, and email stay in sync. */
export function computeAmountCents(plan: CheckoutPlan, includeTrust: boolean): number {
  return PLAN_PRICE_CENTS[plan] + (includeTrust ? TRUST_ADDON_CENTS : 0)
}

export function stripePriceIdsFromEnv(): {
  individual: string | null
  couples: string | null
  trust: string | null
} {
  const clean = (raw: string | undefined) => {
    const v = raw?.trim() || ''
    if (!v) return null
    if (v.includes('your_') || v.includes('xxxx') || v.includes('replace')) return null
    if (!v.startsWith('price_')) return null
    return v
  }
  return {
    individual: clean(Deno.env.get('STRIPE_PRICE_INDIVIDUAL')),
    couples: clean(Deno.env.get('STRIPE_PRICE_COUPLES')),
    trust: clean(Deno.env.get('STRIPE_PRICE_TRUST')),
  }
}

/**
 * Charge amount comes from app constants ($249 / $399 + optional $50 trust).
 * Stripe Price IDs are recorded in metadata only (do not drive the charged total).
 */
export function resolveCheckoutAmount(
  plan: CheckoutPlan,
  includeTrust: boolean,
): {
  amountCents: number
  currency: string
  priceIds: string[]
  planCents: number
  trustCents: number
} {
  const ids = stripePriceIdsFromEnv()
  const planPriceId = plan === 'couples' ? ids.couples : ids.individual
  const priceIds: string[] = []
  if (planPriceId) priceIds.push(planPriceId)
  if (includeTrust && ids.trust) priceIds.push(ids.trust)

  return {
    amountCents: computeAmountCents(plan, includeTrust),
    currency: 'usd',
    priceIds,
    planCents: PLAN_PRICE_CENTS[plan],
    trustCents: includeTrust ? TRUST_ADDON_CENTS : 0,
  }
}
