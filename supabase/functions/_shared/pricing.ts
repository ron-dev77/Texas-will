/** Server-side price calculation — Stripe Price IDs are source of truth when configured. */

import type Stripe from 'https://esm.sh/stripe@17.7.0?target=deno'

export const PLAN_PRICE_CENTS = {
  individual: 24900,
  couples: 39900,
} as const

export const TRUST_ADDON_CENTS = 5000

/** Fallback when STRIPE_PRICE_SPOUSAL_TRUST is not set (dev only). */
export const SPOUSAL_TRUST_ADDON_CENTS = 40000

export type CheckoutPlan = keyof typeof PLAN_PRICE_CENTS

export type StripeCatalogCents = {
  individual: number
  couples: number
  trust: number
  spousal_trust: number
  /** True when every configured price ID resolved from Stripe. */
  fromStripe: boolean
}

export function isValidEmail(email: string): boolean {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())
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

async function retrievePriceCents(
  stripe: Stripe,
  priceId: string | null,
  fallbackCents: number,
): Promise<{ cents: number; fromStripe: boolean }> {
  if (!priceId) return { cents: fallbackCents, fromStripe: false }
  try {
    const price = await stripe.prices.retrieve(priceId)
    const cents = typeof price.unit_amount === 'number' ? price.unit_amount : fallbackCents
    return { cents, fromStripe: typeof price.unit_amount === 'number' }
  } catch (err) {
    console.error('[pricing] failed to retrieve Stripe price', priceId, err)
    return { cents: fallbackCents, fromStripe: false }
  }
}

/** Public catalog for UI + checkout — amounts from Stripe when price IDs are set. */
export async function fetchStripeCatalog(stripe: Stripe): Promise<StripeCatalogCents> {
  const ids = stripePriceIdsFromEnv()
  const [individual, couples, trust, spousal_trust] = await Promise.all([
    retrievePriceCents(stripe, ids.individual, PLAN_PRICE_CENTS.individual),
    retrievePriceCents(stripe, ids.couples, PLAN_PRICE_CENTS.couples),
    retrievePriceCents(stripe, ids.trust, TRUST_ADDON_CENTS),
    retrievePriceCents(stripe, ids.spousal_trust, SPOUSAL_TRUST_ADDON_CENTS),
  ])
  const resolved = [individual, couples, trust, spousal_trust]
  return {
    individual: individual.cents,
    couples: couples.cents,
    trust: trust.cents,
    spousal_trust: spousal_trust.cents,
    fromStripe: resolved.every((row) => row.fromStripe),
  }
}

export async function resolveCheckoutAmount(
  stripe: Stripe,
  plan: CheckoutPlan,
  includeTrust: boolean,
  includeSpousalTrust = false,
): Promise<{
  amountCents: number
  currency: string
  priceIds: string[]
  planCents: number
  trustCents: number
  spousalTrustCents: number
}> {
  const ids = stripePriceIdsFromEnv()
  const planPriceId = plan === 'couples' ? ids.couples : ids.individual
  const priceIds: string[] = []
  if (planPriceId) priceIds.push(planPriceId)
  if (includeTrust && ids.trust) priceIds.push(ids.trust)

  if (includeSpousalTrust) {
    if (!ids.spousal_trust) {
      throw new Error(
        'Spousal trust add-on is not configured. Set STRIPE_PRICE_SPOUSAL_TRUST in Supabase secrets (Stripe Dashboard → Products → Spousal Trust → Price ID).',
      )
    }
    priceIds.push(ids.spousal_trust)
  }

  const catalog = await fetchStripeCatalog(stripe)
  const planCents = plan === 'couples' ? catalog.couples : catalog.individual
  const trustCents = includeTrust ? catalog.trust : 0
  const spousalTrustCents = includeSpousalTrust ? catalog.spousal_trust : 0

  return {
    amountCents: planCents + trustCents + spousalTrustCents,
    currency: 'usd',
    priceIds,
    planCents,
    trustCents,
    spousalTrustCents,
  }
}
