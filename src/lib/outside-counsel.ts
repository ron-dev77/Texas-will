/** Early-process copy: this product is will-based, not an RLT shop. */
export const HOW_IT_WORKS_HONEST_FIT_LEAD =
  "We prepare a custom Texas Last Will and Testament alongside essential supporting legal documents — a Medical POA, Durable POA, Directive to Physicians, and HIPAA release — so someone you trust can make medical and financial decisions on your behalf if you're ever unable to."

export const WILL_BASED_EDUCATION = {
  title: "When My AI Will isn't the right fit — and when it's a good start anyway",
  body: "My AI Will is built for straightforward Texas estates. If any of the below sound like you, your estate may benefit from more than a will alone — and we'll tell you that upfront rather than sell you something incomplete.",
  closing:
    'If none of the above apply to you, My AI Will covers what you need: a legally valid Texas will, reviewed by a licensed Texas attorney, done in about 10 minutes.',
} as const

/** Landing page (/what-you-get) — short scannable bullets per Word doc 9/7/26. */
export const HONESTY_FIRST_FIT_BULLETS = [
  'You own property outside Texas, or hold multiple real estate properties',
  "You own and actively operate a business — especially if you're the only person with banking or payroll authority (see note below)",
  'You have significant tax planning needs',
  'Your family situation involves complex trust or guardianship arrangements beyond a standard spousal or child provision',
] as const

export const BUSINESS_OWNER_DETAIL = {
  title: 'Why this matters if you run the business yourself',
  body: [
    "A will only takes effect after a probate court formally approves it and appoints an executor — a process that takes time. If you're the sole managing member or the only authorized signer on your company's bank and payroll accounts, that gap can create an immediate crisis: accounts can be frozen, payroll can't run, and contracts can't be signed until the court process is complete. A revocable living trust avoids this because a successor trustee can step in right away, with no court involved.",
    "If you own and operate a business, a will is still a good place to start — but we'd recommend also talking to an attorney about a revocable living trust for the business. A will and a trust aren't either/or; many people who need both use them together, with the will covering everything else.",
  ],
} as const

/** Checkout fit screen — "yes" on offRamp reasons blocks purchase. */
export const WILL_FIT_REASONS = [
  {
    id: 'out_of_state_property',
    label: 'I own a house or land outside Texas',
    offRamp: true,
  },
  {
    id: 'multiple_real_estate',
    label:
      'I own multiple real estate properties (more than a primary home and one other property)',
    offRamp: true,
  },
  {
    id: 'active_business',
    label:
      "I own and actively operate a business (especially if I'm the only person with banking or payroll authority)",
    offRamp: false,
  },
  {
    id: 'tax_planning',
    label: 'I have significant tax planning needs',
    offRamp: true,
  },
  {
    id: 'complex_trust_guardianship',
    label:
      'My family situation involves complex trust or guardianship arrangements beyond a standard spousal or child provision',
    offRamp: true,
  },
] as const

/** @deprecated Use WILL_FIT_REASONS — kept for type migration in one place. */
export const RLT_FIT_REASONS = WILL_FIT_REASONS

export type WillFitId = (typeof WILL_FIT_REASONS)[number]['id']
export type RltFitId = WillFitId

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

export function needsOutsideCounsel(answers: Record<WillFitId, 'yes' | 'no' | ''>) {
  return WILL_FIT_REASONS.filter((r) => r.offRamp).some((r) => answers[r.id] === 'yes')
}

export const SPOUSAL_TRUST_CHECKOUT_NOTE =
  "We'll include this in your will — your reviewing attorney will confirm it's the right fit for your situation before your will is finalized."
