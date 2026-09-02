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

export type OrderDraft = {
  plan: Plan
  email: string
  partnerEmail?: string
  /** Older paid orders may still have a living trust. New checkouts are always false. */
  includeTrust: boolean
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

export function loadOrderDraft(): OrderDraft | null {
  try {
    const raw = localStorage.getItem(ORDER_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as OrderDraft
    return {
      ...parsed,
      documents: normalizeOrderDocuments(parsed.documents),
      includeTrust: Boolean(parsed.includeTrust),
    }
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
