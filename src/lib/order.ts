export const ORDER_STORAGE_KEY = 'myaiwill.order.v1'

export type Plan = 'individual' | 'couples'

/** Base package docs. Will is always required; others are optional at no extra charge. */
export const PACKAGE_DOC_IDS = ['will', 'mpoa', 'dpoa', 'directive', 'hipaa'] as const
export type PackageDocId = (typeof PACKAGE_DOC_IDS)[number]

/** Optional package docs (same plan price — not extra per paper). */
export const OPTIONAL_PACKAGE_DOC_IDS = ['mpoa', 'dpoa', 'directive', 'hipaa'] as const
export type OptionalPackageDocId = (typeof OPTIONAL_PACKAGE_DOC_IDS)[number]

export const PACKAGE_DOC_LABEL: Record<PackageDocId, string> = {
  will: 'Last Will and Testament',
  mpoa: 'Medical Power of Attorney',
  dpoa: 'Durable Power of Attorney',
  directive: 'Directive to Physicians',
  hipaa: 'HIPAA Release',
}

import { computeTotalDollars } from '@/lib/pricing'
import { loadQualifierDraft } from '@/lib/qualifier'
import type {
  EstateBracket,
  PriorKidsScope,
  QualifierMaritalStatus,
  QualifierPlan,
  SpousalTrustChoice,
} from '@/lib/qualifier'

export type QualifierSnapshot = {
  plan: QualifierPlan
  maritalStatus: QualifierMaritalStatus
  hasPriorRelationshipChildren?: boolean
  priorKidsScope?: PriorKidsScope
  spousalTrustChoice?: SpousalTrustChoice
  estateBracket: EstateBracket
}

export type OrderDraft = {
  plan: Plan
  email: string
  partnerEmail?: string
  /** Revocable living trust add-on (+$50). Separate from spousal testamentary trust. */
  includeTrust: boolean
  /** Phase 2 spousal testamentary trust from qualifier (+$400). */
  includeSpousalTrust: boolean
  qualifier?: QualifierSnapshot
  /** Always includes `will`; other ids are optional at the same plan price. */
  documents: PackageDocId[]
  total: number
  lsrConsent: boolean
}

/** Always keeps `will`. Drops unknowns. Trust is never in this list. */
export function normalizeOrderDocuments(raw: unknown): PackageDocId[] {
  const fromRaw = Array.isArray(raw)
    ? raw.filter((id): id is PackageDocId =>
        (PACKAGE_DOC_IDS as readonly string[]).includes(String(id)),
      )
    : []
  const withoutWill = fromRaw.filter((id) => id !== 'will')
  return ['will', ...withoutWill]
}

/** True when the order includes the spousal testamentary trust add-on. */
export function resolveIncludeSpousalTrust(order: OrderDraft | null | undefined): boolean {
  if (order?.includeSpousalTrust) return true
  if (order?.qualifier?.spousalTrustChoice === 'spousal_trust') return true
  const savedQualifier = loadQualifierDraft()
  return savedQualifier?.spousalTrustChoice === 'spousal_trust'
}

export function resolveOrderTotal(order: OrderDraft | null | undefined): number {
  if (!order) return 0
  const includeSpousalTrust = resolveIncludeSpousalTrust(order)
  const fromFlags = computeTotalDollars(
    order.plan,
    Boolean(order.includeTrust),
    includeSpousalTrust,
  )
  return Math.max(order.total ?? 0, fromFlags)
}

export function normalizeOrderDraft(parsed: OrderDraft): OrderDraft {
  const includeSpousalTrust = resolveIncludeSpousalTrust(parsed)
  return {
    ...parsed,
    documents: normalizeOrderDocuments(parsed.documents),
    includeTrust: Boolean(parsed.includeTrust),
    includeSpousalTrust,
    total: resolveOrderTotal({ ...parsed, includeSpousalTrust }),
  }
}

export function loadOrderDraft(): OrderDraft | null {
  try {
    const raw = localStorage.getItem(ORDER_STORAGE_KEY)
    if (!raw) return null
    return normalizeOrderDraft(JSON.parse(raw) as OrderDraft)
  } catch {
    return null
  }
}

export function saveOrderDraft(order: OrderDraft) {
  localStorage.setItem(
    ORDER_STORAGE_KEY,
    JSON.stringify({
      ...order,
      documents: normalizeOrderDocuments(order.documents),
    }),
  )
}
