/** Early-process copy: this product is will-based, not an RLT shop. */
export const WILL_BASED_EDUCATION = {
  title: 'My AI Will is Texas will-based estate planning',
  body: 'We prepare a Texas last will and optional Texas papers. We do not sell or draft a revocable living trust. A living trust is needed only in limited cases: you own a house or land outside Texas; you own an interest in a private LLC, partnership, or closely held company; or you have a heightened need for privacy (a will is filed in court). If any of those apply, this product is not the right fit — work with a Texas estate-planning law firm instead.',
} as const

/** When a living trust (or other full estate plan) is a better fit than this will product. */
export const RLT_FIT_REASONS = [
  {
    id: 'out_of_state_property',
    label: 'I own a house or land outside Texas',
  },
  {
    id: 'private_business',
    label: 'I own a share of a private LLC, partnership, or closely held company',
  },
  {
    id: 'privacy',
    label: 'I need extra privacy (a will is filed in court; a living trust usually is not)',
  },
] as const

export type RltFitId = (typeof RLT_FIT_REASONS)[number]['id']

export type OutsideCounselFirm = {
  name: string
  detail: string
  href?: string
  /**
   * Empty name or pending = Scott has not named this firm.
   * Hidden from customers. Do not invent a private firm name here.
   */
  pending?: boolean
}

/**
 * Three Texas law-firm referral slots.
 * Only named firms are shown to customers. Put the second and third firm
 * names here after Scott (or another Texas lawyer) confirms them.
 */
export const OUTSIDE_COUNSEL_FIRMS: OutsideCounselFirm[] = [
  {
    name: 'Texas AI Law Group, PLLC',
    detail:
      'Texas estate-planning law firm. Ask for a full representation consult, not the limited-scope My AI Will review.',
  },
  {
    name: '',
    pending: true,
    detail: 'Second Texas estate-planning law firm. Scott must put the real firm name here.',
  },
  {
    name: '',
    pending: true,
    detail: 'Third Texas estate-planning law firm. Scott must put the real firm name here.',
  },
]

/** Firms a customer may actually be sent to. Pending / blank names stay hidden. */
export function listedOutsideCounselFirms() {
  return OUTSIDE_COUNSEL_FIRMS.filter((firm) => firm.name.trim() && !firm.pending)
}

export function needsOutsideCounsel(answers: Record<RltFitId, 'yes' | 'no' | ''>) {
  return RLT_FIT_REASONS.some((r) => answers[r.id] === 'yes')
}
