import { supabase } from '@/integrations/supabase/client'
import {
  PLAN_PRICE_CENTS,
  SPOUSAL_TRUST_ADDON_CENTS,
  TRUST_ADDON_CENTS,
  type CheckoutPlan,
} from '@/lib/pricing'

export type StripeCatalog = {
  individualCents: number
  couplesCents: number
  trustCents: number
  spousalTrustCents: number
  fromStripe: boolean
}

const FALLBACK: StripeCatalog = {
  individualCents: PLAN_PRICE_CENTS.individual,
  couplesCents: PLAN_PRICE_CENTS.couples,
  trustCents: TRUST_ADDON_CENTS,
  spousalTrustCents: SPOUSAL_TRUST_ADDON_CENTS,
  fromStripe: false,
}

let cached: StripeCatalog | null = null
let inflight: Promise<StripeCatalog> | null = null

export function fallbackStripeCatalog(): StripeCatalog {
  return { ...FALLBACK }
}

export async function loadStripeCatalog(force = false): Promise<StripeCatalog> {
  if (!force && cached) return cached
  if (!force && inflight) return inflight

  inflight = (async () => {
    try {
      const { data, error } = await supabase.functions.invoke('checkout', {
        body: { action: 'quote' },
      })
      if (error || !data || typeof data !== 'object' || 'error' in data) {
        cached = fallbackStripeCatalog()
        return cached
      }
      const row = data as {
        individualCents?: number
        couplesCents?: number
        trustCents?: number
        spousalTrustCents?: number
        fromStripe?: boolean
      }
      cached = {
        individualCents: Number(row.individualCents) || FALLBACK.individualCents,
        couplesCents: Number(row.couplesCents) || FALLBACK.couplesCents,
        trustCents: Number(row.trustCents) || FALLBACK.trustCents,
        spousalTrustCents: Number(row.spousalTrustCents) || FALLBACK.spousalTrustCents,
        fromStripe: Boolean(row.fromStripe),
      }
      return cached
    } catch {
      cached = fallbackStripeCatalog()
      return cached
    } finally {
      inflight = null
    }
  })()

  return inflight
}

export function planCentsFromCatalog(plan: CheckoutPlan, catalog: StripeCatalog): number {
  return plan === 'couples' ? catalog.couplesCents : catalog.individualCents
}

export function totalCentsFromCatalog(
  plan: CheckoutPlan,
  includeTrust: boolean,
  includeSpousalTrust: boolean,
  catalog: StripeCatalog,
): number {
  return (
    planCentsFromCatalog(plan, catalog) +
    (includeTrust ? catalog.trustCents : 0) +
    (includeSpousalTrust ? catalog.spousalTrustCents : 0)
  )
}

export function totalDollarsFromCatalog(
  plan: CheckoutPlan,
  includeTrust: boolean,
  includeSpousalTrust: boolean,
  catalog: StripeCatalog,
): number {
  return totalCentsFromCatalog(plan, includeTrust, includeSpousalTrust, catalog) / 100
}
