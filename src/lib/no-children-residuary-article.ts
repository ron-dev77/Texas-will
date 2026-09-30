/**
 * Step 8 addendum — residuary for testators with no children (Sep 2026).
 */

type Answers = Record<string, unknown>

export type ResiduaryNamedBeneficiaryRow = {
  name: string
  relationship: string
  pct: number | string
}

export const RESIDUARY_NAMED_RELATIONSHIPS = [
  { value: 'niece', label: 'Niece' },
  { value: 'nephew', label: 'Nephew' },
  { value: 'brother', label: 'Brother' },
  { value: 'sister', label: 'Sister' },
  { value: 'parent', label: 'Parent' },
  { value: 'cousin', label: 'Cousin' },
  { value: 'friend_or_neighbor', label: 'Friend or neighbor' },
  { value: 'charity', label: 'Charity' },
  { value: 'other', label: 'Other' },
] as const

export const NO_CHILDREN_RESIDUARY_SURVIVOR_HELPER =
  'If someone on this list passes before you, their share goes to their children. If they don\'t have any, it goes to the others on this list.'

export const RESIDUARY_NAMED_PLANS = new Set(['spouse_then_named', 'named'])

function str(v: unknown, fallback = '') {
  return typeof v === 'string' ? v.trim() : fallback
}

export function isMarriedForResiduary(answers: Answers): boolean {
  const m = str(answers.marital_status)
  return m === 'married' || m === 'domestic_partnership'
}

export function usesNoChildrenNamedResiduary(answers: Answers): boolean {
  if (answers.has_children !== 'no') return false
  return RESIDUARY_NAMED_PLANS.has(str(answers.residuary_plan))
}

export function defaultNoChildrenResiduaryPlan(answers: Answers): 'spouse_then_named' | 'named' {
  return isMarriedForResiduary(answers) ? 'spouse_then_named' : 'named'
}

export function emptyResiduaryNamedBeneficiaryRow(pct = 100): ResiduaryNamedBeneficiaryRow {
  return { name: '', relationship: '', pct }
}

export function residuaryNamedBeneficiariesTotalPct(rows: ResiduaryNamedBeneficiaryRow[]): number {
  return rows.reduce((sum, row) => {
    const n = typeof row.pct === 'number' ? row.pct : Number.parseFloat(String(row.pct))
    return sum + (Number.isFinite(n) ? n : 0)
  }, 0)
}

export function parseResiduaryNamedBeneficiaries(
  answers: Answers,
): ResiduaryNamedBeneficiaryRow[] {
  const raw = answers.residuary_named_beneficiaries
  if (!Array.isArray(raw)) return []
  return raw
    .map((row) => {
      if (!row || typeof row !== 'object') return null
      const r = row as Record<string, unknown>
      const name = str(r.name)
      const relationship = str(r.relationship)
      const pctRaw = r.pct
      const pct =
        typeof pctRaw === 'number'
          ? pctRaw
          : typeof pctRaw === 'string'
            ? Number.parseFloat(pctRaw)
            : NaN
      if (!name && !relationship && Number.isNaN(pct)) return null
      return { name, relationship, pct: Number.isFinite(pct) ? pct : '' }
    })
    .filter(Boolean) as ResiduaryNamedBeneficiaryRow[]
}

const UNDER_20: Record<number, string> = {
  0: 'zero',
  1: 'one',
  2: 'two',
  3: 'three',
  4: 'four',
  5: 'five',
  6: 'six',
  7: 'seven',
  8: 'eight',
  9: 'nine',
  10: 'ten',
  11: 'eleven',
  12: 'twelve',
  13: 'thirteen',
  14: 'fourteen',
  15: 'fifteen',
  16: 'sixteen',
  17: 'seventeen',
  18: 'eighteen',
  19: 'nineteen',
}

const TENS: Record<number, string> = {
  2: 'twenty',
  3: 'thirty',
  4: 'forty',
  5: 'fifty',
  6: 'sixty',
  7: 'seventy',
  8: 'eighty',
  9: 'ninety',
}

/** Percent in words and numerals for will PDF (e.g. fifty (50)). */
export function formatSharePercentWordsAndNumerals(pct: number): string {
  const n = Math.round(pct)
  if (n < 0 || n > 100) return `${n} (${n})`
  if (n <= 19) return `${UNDER_20[n]} (${n})`
  if (n === 100) return 'one hundred (100)'
  const tens = Math.floor(n / 10)
  const ones = n % 10
  const words = ones === 0 ? TENS[tens]! : `${TENS[tens]!}-${UNDER_20[ones]!}`
  return `${words} (${n})`
}

function relationshipLabel(value: string): string {
  const opt = RESIDUARY_NAMED_RELATIONSHIPS.find((o) => o.value === value)
  if (!opt) return value.replace(/_/g, ' ')
  if (value === 'friend_or_neighbor') return 'friend or neighbor'
  return opt.label.toLowerCase()
}

function bold(s: string) {
  return `**${s}**`
}

export function buildNoChildrenResiduaryArticleText(answers: Answers): string {
  const plan = str(answers.residuary_plan)
  const spouse = str(answers.spouse_full_name)
  const rows = parseResiduaryNamedBeneficiaries(answers).filter((r) => r.name.trim())

  const section2Lines = rows.map((row) => {
    const name = row.name.trim()
    const pct = typeof row.pct === 'number' ? row.pct : Number.parseFloat(String(row.pct))
    const pctFormatted = formatSharePercentWordsAndNumerals(Number.isFinite(pct) ? pct : 0)
    if (row.relationship === 'charity') {
      return `${bold(name)}, ${pctFormatted} percent (${Number.isFinite(pct) ? Math.round(pct) : 0}%)`
    }
    const rel = relationshipLabel(row.relationship)
    return `${bold(name)}, my ${rel}, ${pctFormatted} percent (${Number.isFinite(pct) ? Math.round(pct) : 0}%)`
  })

  const parts: string[] = []

  if (plan === 'spouse_then_named' && spouse) {
    parts.push(
      `**Section 1. Gift to Spouse.** I give my residuary estate to my spouse, ${bold(spouse)}, if my spouse survives me by thirty (30) days. If my spouse does not so survive me, I give my residuary estate as provided in Section 2.`,
    )
  }

  parts.push(
    `**Section 2. Gift to Named Beneficiaries.** I give my residuary estate to the following persons who survive me by thirty (30) days, in the shares indicated:`,
  )
  if (section2Lines.length > 0) {
    parts.push(section2Lines.map((line) => `• ${line}`).join('\n'))
  }

  parts.push(
    `**Section 3. Beneficiary Who Does Not Survive Me.** If any beneficiary named in Section 2 does not survive me by thirty (30) days, that beneficiary's share shall pass to that beneficiary's descendants who so survive me, per stirpes, or if none, to the other beneficiaries named in Section 2 who so survive me, in proportion to their respective shares.`,
  )

  parts.push(
    `**Section 4. Final Disposition.** If no beneficiary or descendant takes under this Article, my residuary estate shall pass to my heirs-at-law, determined as if I had died intestate, unmarried, and domiciled in Texas.`,
  )

  parts.push(
    `**Section 5. Beneficiaries Under Age 21.** Any share distributable under this Article to a person who has not reached the age of twenty-one (21) years may be distributed to my Executor, as custodian for that person under the Texas Uniform Transfers to Minors Act, Chapter 141, Texas Property Code.`,
  )

  return parts.join('\n\n')
}
