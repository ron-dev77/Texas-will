/** Server-side price calculation — prefer Stripe Price IDs from env. */

export const PLAN_PRICE_CENTS = {
  individual: 24900,
  couples: 39900,
} as const

export const TRUST_ADDON_CENTS = 5000

export type CheckoutPlan = keyof typeof PLAN_PRICE_CENTS

export function isValidEmail(email: string): boolean {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())
}

/** Fallback cents when Stripe Price IDs are not configured. */
export function computeAmountCentsFallback(
  plan: CheckoutPlan,
  includeTrust: boolean,
): number {
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
    // Ignore placeholder values from .env.example
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

type StripeLike = {
  prices: {
    retrieve: (id: string) => Promise<{
      id: string
      active?: boolean
      unit_amount: number | null
      currency: string
    }>
  }
}

/**
 * Resolve charge amount from Stripe Price IDs (recommended).
 * Falls back to hardcoded cents if price IDs are missing.
 */
export async function resolveCheckoutAmount(
  stripe: StripeLike,
  plan: CheckoutPlan,
  includeTrust: boolean,
): Promise<{
  amountCents: number
  currency: string
  priceIds: string[]
  usedStripePrices: boolean
}> {
  const ids = stripePriceIdsFromEnv()
  const planPriceId = plan === 'couples' ? ids.couples : ids.individual
  const priceIds: string[] = []

  if (!planPriceId) {
    return {
      amountCents: computeAmountCentsFallback(plan, includeTrust),
      currency: 'usd',
      priceIds,
      usedStripePrices: false,
    }
  }

  const planPrice = await stripe.prices.retrieve(planPriceId)
  if (!planPrice.unit_amount || planPrice.unit_amount <= 0) {
    throw new Error(`Stripe price ${planPriceId} has no unit_amount`)
  }
  if (planPrice.active === false) {
    throw new Error(`Stripe price ${planPriceId} is inactive`)
  }

  let amountCents = planPrice.unit_amount
  priceIds.push(planPrice.id)
  let currency = planPrice.currency || 'usd'

  if (includeTrust) {
    if (!ids.trust) {
      amountCents += TRUST_ADDON_CENTS
    } else {
      const trustPrice = await stripe.prices.retrieve(ids.trust)
      if (!trustPrice.unit_amount || trustPrice.unit_amount <= 0) {
        throw new Error(`Stripe price ${ids.trust} has no unit_amount`)
      }
      if (trustPrice.active === false) {
        throw new Error(`Stripe price ${ids.trust} is inactive`)
      }
      amountCents += trustPrice.unit_amount
      priceIds.push(trustPrice.id)
    }
  }

  return {
    amountCents,
    currency,
    priceIds,
    usedStripePrices: true,
  }
}
