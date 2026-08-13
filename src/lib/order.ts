export const ORDER_STORAGE_KEY = 'myaiwill.order.v1'

export type Plan = 'individual' | 'couples'

/** Base package docs the customer can include (trust remains a paid add-on). */
export const PACKAGE_DOC_IDS = ['will', 'mpoa', 'dpoa', 'directive', 'hipaa'] as const
export type PackageDocId = (typeof PACKAGE_DOC_IDS)[number]

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
  includeTrust: boolean
  /** At least one required; defaults to will-only. */
  documents: PackageDocId[]
  total: number
  lsrConsent: boolean
}

export function normalizeOrderDocuments(raw: unknown): PackageDocId[] {
  if (!Array.isArray(raw)) return ['will']
  const next = raw.filter((id): id is PackageDocId =>
    (PACKAGE_DOC_IDS as readonly string[]).includes(String(id)),
  )
  return next.length > 0 ? next : ['will']
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
