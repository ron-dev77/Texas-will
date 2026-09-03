/** Canonical app prices — UI and Stripe PaymentIntent must use these. */

export const PLAN_PRICE_CENTS = {
  individual: 24900,
  couples: 39900,
} as const

export const TRUST_ADDON_CENTS = 5000

/** Provisional Phase 2 spousal testamentary trust — Scott must confirm final price. */
export const SPOUSAL_TRUST_ADDON_CENTS = 40000

export type CheckoutPlan = keyof typeof PLAN_PRICE_CENTS

export function planPriceDollars(plan: CheckoutPlan): number {
  return PLAN_PRICE_CENTS[plan] / 100
}

export function trustAddonDollars(): number {
  return TRUST_ADDON_CENTS / 100
}

export function spousalTrustAddonDollars(): number {
  return SPOUSAL_TRUST_ADDON_CENTS / 100
}

export function computeTotalDollars(
  plan: CheckoutPlan,
  includeTrust: boolean,
  includeSpousalTrust = false,
): number {
  return (
    planPriceDollars(plan) +
    (includeTrust ? trustAddonDollars() : 0) +
    (includeSpousalTrust ? spousalTrustAddonDollars() : 0)
  )
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
