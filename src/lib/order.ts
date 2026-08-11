export const ORDER_STORAGE_KEY = 'myaiwill.order.v1'

export type Plan = 'individual' | 'couples'

export type OrderDraft = {
  plan: Plan
  email: string
  partnerEmail?: string
  includeTrust: boolean
  total: number
  lsrConsent: boolean
}

export function loadOrderDraft(): OrderDraft | null {
  try {
    const raw = localStorage.getItem(ORDER_STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as OrderDraft
  } catch {
    return null
  }
}

export function saveOrderDraft(order: OrderDraft) {
  localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(order))
}
