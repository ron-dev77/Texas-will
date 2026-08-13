/** Canonical app prices — UI and Stripe PaymentIntent must use these. */

export const PLAN_PRICE_CENTS = {
  individual: 24900,
  couples: 39900,
} as const

export const TRUST_ADDON_CENTS = 5000

export type CheckoutPlan = keyof typeof PLAN_PRICE_CENTS

export function planPriceDollars(plan: CheckoutPlan): number {
  return PLAN_PRICE_CENTS[plan] / 100
}

export function trustAddonDollars(): number {
  return TRUST_ADDON_CENTS / 100
}

export function computeTotalDollars(plan: CheckoutPlan, includeTrust: boolean): number {
  return planPriceDollars(plan) + (includeTrust ? trustAddonDollars() : 0)
}

export function computeAmountCents(plan: CheckoutPlan, includeTrust: boolean): number {
  return PLAN_PRICE_CENTS[plan] + (includeTrust ? TRUST_ADDON_CENTS : 0)
}
