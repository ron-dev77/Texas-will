type Answers = Record<string, unknown>

function str(v: unknown) {
  return typeof v === 'string' ? v.trim() : ''
}

/** Placeholder brackets — Scott must confirm before production legal sign-off. */
export const RETIREMENT_ACCOUNT_VALUE_OPTIONS = [
  { value: 'under_50k', label: 'Under $50,000' },
  { value: '50k_250k', label: '$50,000 to $250,000' },
  { value: '250k_plus', label: '$250,000 or more' },
] as const

export type RetirementAccountValueBracket = (typeof RETIREMENT_ACCOUNT_VALUE_OPTIONS)[number]['value']

/** Bracket that triggers the full ERISA / spousal-consent note (placeholder: $250k+). */
export const ERISA_FULL_NOTE_THRESHOLD: RetirementAccountValueBracket = '250k_plus'

/** Bracket that triggers the brief note (placeholder: middle tier). */
export const ERISA_BRIEF_NOTE_THRESHOLD: RetirementAccountValueBracket = '50k_250k'

export function isMarriedForBeneficiaryRules(answers: Answers) {
  const status = str(answers.marital_status)
  return status === 'married' || status === 'domestic_partnership'
}

export function hasPriorRelationshipChildren(answers: Answers) {
  return str(answers.has_prior_relationship_children) === 'yes'
}

export function retirementAccountValueBracket(answers: Answers): RetirementAccountValueBracket | '' {
  const v = str(answers.retirement_accounts_value)
  if (v === 'under_50k' || v === '50k_250k' || v === '250k_plus') return v
  return ''
}

export type ErisaNoteLevel = 'full' | 'brief' | 'none'

/** Full / brief / hidden ERISA education based on marriage, prior-relationship children, and account size. */
export function getErisaNoteLevel(answers: Answers): ErisaNoteLevel {
  if (!isMarriedForBeneficiaryRules(answers) || !hasPriorRelationshipChildren(answers)) {
    return 'none'
  }
  const bracket = retirementAccountValueBracket(answers)
  if (!bracket) return 'none'
  if (bracket === ERISA_FULL_NOTE_THRESHOLD) return 'full'
  if (bracket === ERISA_BRIEF_NOTE_THRESHOLD) return 'brief'
  return 'none'
}

export const ERISA_NOTE_FULL =
  'Important — spouse rights on retirement accounts and life insurance: Under federal ERISA rules, your spouse may have a legal right to part of your 401(k) or other employer plan, even if someone else is named on the beneficiary form. If you want someone other than your spouse (such as children from a prior relationship) to receive those accounts, your spouse may need to sign a written waiver. This will does not change who gets IRA, 401(k), or life insurance proceeds — those pass by the beneficiary form on file with each company. This is general education only, not legal advice. A Texas attorney can review your specific accounts.'

export const ERISA_NOTE_BRIEF =
  'Reminder: IRA, 401(k), and life insurance pass by the beneficiary form at each company, not by this will. With a smaller combined balance, spousal waiver rules may still apply but are often simpler — confirm with your plan administrator or a Texas attorney if you want a non-spouse named.'

export function erisaNoteText(level: ErisaNoteLevel): string | null {
  if (level === 'full') return ERISA_NOTE_FULL
  if (level === 'brief') return ERISA_NOTE_BRIEF
  return null
}

export function formatRetirementBracketLabel(value: unknown): string {
  const v = str(value)
  return RETIREMENT_ACCOUNT_VALUE_OPTIONS.find((o) => o.value === v)?.label ?? '—'
}
