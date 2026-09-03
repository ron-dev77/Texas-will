/** Pre-checkout qualifier answers — stored locally until order is created. */

export const QUALIFIER_STORAGE_KEY = 'myaiwill.qualifier.v1'

export type QualifierPlan = 'individual' | 'couples'

export type QualifierMaritalStatus =
  | 'single'
  | 'married'
  | 'domestic_partnership'
  | 'divorced'
  | 'widowed'

/** Couples only: whose children from a prior relationship. */
export type PriorKidsScope = 'me' | 'partner' | 'both'

export type EstateBracket = 'under_500k' | '500k_2m' | '2m_8m' | 'over_8m'

export type SpousalTrustChoice = 'simple' | 'spousal_trust'

export type QualifierDraft = {
  plan: QualifierPlan
  maritalStatus: QualifierMaritalStatus
  hasPriorRelationshipChildren: boolean
  /** Set when plan is couples and hasPriorRelationshipChildren is true. */
  priorKidsScope?: PriorKidsScope
  /** Blended-family screen — only when married/partnered + prior kids. */
  spousalTrustChoice?: SpousalTrustChoice
  /** Required when spousalTrustChoice is simple. */
  simpleWillAcknowledged?: boolean
  estateBracket: EstateBracket
  updatedAt: string
}

export const ESTATE_BRACKET_OPTIONS = [
  { value: 'under_500k' as const, label: 'Under $500,000' },
  { value: '500k_2m' as const, label: '$500,000 to $2 million' },
  { value: '2m_8m' as const, label: '$2 million to $8 million' },
  { value: 'over_8m' as const, label: 'Over $8 million' },
]

export function isMarriedOrPartnered(status: QualifierMaritalStatus) {
  return status === 'married' || status === 'domestic_partnership'
}

export function showsBlendedFamilyScreen(draft: Partial<QualifierDraft>) {
  return (
    isMarriedOrPartnered(draft.maritalStatus ?? 'single') &&
    Boolean(draft.hasPriorRelationshipChildren)
  )
}

export function isOverEightMillion(bracket: EstateBracket | undefined) {
  return bracket === 'over_8m'
}

export function estateBracketLabel(bracket: EstateBracket | undefined): string {
  return ESTATE_BRACKET_OPTIONS.find((o) => o.value === bracket)?.label ?? '—'
}

export function qualifierComplete(draft: QualifierDraft | null): draft is QualifierDraft {
  if (!draft?.plan || !draft.maritalStatus || !draft.estateBracket) return false
  if (isOverEightMillion(draft.estateBracket)) return false
  if (draft.plan === 'couples' && draft.hasPriorRelationshipChildren && !draft.priorKidsScope) {
    return false
  }
  if (showsBlendedFamilyScreen(draft)) {
    if (!draft.spousalTrustChoice) return false
    if (draft.spousalTrustChoice === 'simple' && !draft.simpleWillAcknowledged) return false
  }
  return true
}

export function loadQualifierDraft(): QualifierDraft | null {
  try {
    const raw = localStorage.getItem(QUALIFIER_STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as QualifierDraft
  } catch {
    return null
  }
}

export function saveQualifierDraft(draft: QualifierDraft) {
  localStorage.setItem(
    QUALIFIER_STORAGE_KEY,
    JSON.stringify({ ...draft, updatedAt: new Date().toISOString() }),
  )
}

export function clearQualifierDraft() {
  localStorage.removeItem(QUALIFIER_STORAGE_KEY)
}

/** Map qualifier marital status to questionnaire field value. */
export function maritalStatusForQuestionnaire(
  status: QualifierMaritalStatus,
): 'single' | 'married' | 'domestic_partnership' | 'divorced' | 'widowed' {
  return status
}

export function questionnairePrefillFromQualifier(draft: QualifierDraft): Record<string, unknown> {
  const next: Record<string, unknown> = {
    marital_status: maritalStatusForQuestionnaire(draft.maritalStatus),
  }
  if (draft.hasPriorRelationshipChildren) {
    next.has_prior_relationship_children = 'yes'
  } else {
    next.has_prior_relationship_children = 'no'
  }
  if (draft.plan === 'couples' && draft.priorKidsScope) {
    next.prior_relationship_children_scope = draft.priorKidsScope
  }
  return next
}
