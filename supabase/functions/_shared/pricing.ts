/** Server-side price calculation — app prices are the source of truth for charging. */

export const PLAN_PRICE_CENTS = {
  individual: 24900,
  couples: 39900,
} as const

export const TRUST_ADDON_CENTS = 5000

/** Provisional Phase 2 spousal testamentary trust — Scott must confirm final price. */
export const SPOUSAL_TRUST_ADDON_CENTS = 40000

export type CheckoutPlan = keyof typeof PLAN_PRICE_CENTS

export function isValidEmail(email: string): boolean {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())
}

export function computeAmountCents(
  plan: CheckoutPlan,
  includeTrust: boolean,
  includeSpousalTrust = false,
): number {
  return (
    PLAN_PRICE_CENTS[plan] +
    (includeTrust ? TRUST_ADDON_CENTS : 0) +
    (includeSpousalTrust ? SPOUSAL_TRUST_ADDON_CENTS : 0)
  )
}

export function stripePriceIdsFromEnv(): {
  individual: string | null
  couples: string | null
  trust: string | null
  spousal_trust: string | null
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
    spousal_trust: clean(Deno.env.get('STRIPE_PRICE_SPOUSAL_TRUST')),
  }
}

export function resolveCheckoutAmount(
  plan: CheckoutPlan,
  includeTrust: boolean,
  includeSpousalTrust = false,
): {
  amountCents: number
  currency: string
  priceIds: string[]
  planCents: number
  trustCents: number
  spousalTrustCents: number
} {
  const ids = stripePriceIdsFromEnv()
  const planPriceId = plan === 'couples' ? ids.couples : ids.individual
  const priceIds: string[] = []
  if (planPriceId) priceIds.push(planPriceId)
  if (includeTrust && ids.trust) priceIds.push(ids.trust)
  if (includeSpousalTrust && ids.spousal_trust) priceIds.push(ids.spousal_trust)

  const trustCents = includeTrust ? TRUST_ADDON_CENTS : 0
  const spousalTrustCents = includeSpousalTrust ? SPOUSAL_TRUST_ADDON_CENTS : 0

  return {
    amountCents: computeAmountCents(plan, includeTrust, includeSpousalTrust),
    currency: 'usd',
    priceIds,
    planCents: PLAN_PRICE_CENTS[plan],
    trustCents,
    spousalTrustCents,
  }
}
