/**
 * Ron 9/13/26 — Article V residuary + spousal testamentary trust (coordinates SNT in 5.2 and 5.4(d)).
 */

import { parseSntTrustRows, wantsSpecialNeedsTrust } from '@/lib/special-needs-trust'
import { spousalTrusteeMode } from '@/lib/spousal-trust'

type Answers = Record<string, unknown>

function str(v: unknown, fallback = '') {
  return typeof v === 'string' ? v.trim() : fallback
}

function plain(text: string) {
  return text
    .replace(/[—–]/g, ', ')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII']

export function intToRoman(n: number): string {
  if (n > 0 && n < ROMAN.length) return ROMAN[n]!
  return String(n)
}

function romanNumeralIndex(label: string): number {
  const normalized = plain(label).toUpperCase()
  const idx = ROMAN.indexOf(normalized)
  if (idx > 0) return idx
  const fallback = ROMAN.indexOf(DEFAULT_FIRST_SNT_ARTICLE_ROMAN)
  return fallback > 0 ? fallback : 6
}

export function sntArticleRomanNumeral(firstArticleRoman: string, offset = 0): string {
  return intToRoman(romanNumeralIndex(firstArticleRoman) + offset)
}

/** Default bundled will skeleton: SNT articles follow Article V (guardian paragraph, then SNT clause). */
export const DEFAULT_FIRST_SNT_ARTICLE_ROMAN = 'VI'

function sntTrustLabel(fullName: string) {
  return `${plain(fullName)} Special Needs Trust`
}

function joinSntProvisoClauses(clauses: string[]): string {
  if (clauses.length === 0) return ''
  if (clauses.length === 1) {
    return `; provided, however, that ${clauses[0]}.`
  }
  return `; provided, however, that ${clauses.join('; and that ')}.`
}

/** 5.2 contingent residuary — full pour-over language. */
function sntPourOverProviso(
  rows: ReturnType<typeof parseSntTrustRows>,
  firstArticleRoman: string,
): string {
  if (rows.length === 0) return ''
  const clauses = rows.map((row, i) => {
    const name = plain(row.beneficiary_name)
    const article = sntArticleRomanNumeral(firstArticleRoman, i)
    const trust = sntTrustLabel(name)
    return `any share allocated to ${name} shall not pass outright to ${name}, but shall instead be delivered to the Trustee of the ${trust} established under Article ${article} of this Will, to be held and administered under its terms and not distributed to ${name} free of trust`
  })
  return joinSntProvisoClauses(clauses)
}

/** 5.4(d) spousal trust remainder — Ron shorter delivery language. */
function sntRemainderPourOverProviso(
  rows: ReturnType<typeof parseSntTrustRows>,
  firstArticleRoman: string,
): string {
  if (rows.length === 0) return ''
  const clauses = rows.map((row, i) => {
    const name = plain(row.beneficiary_name)
    const article = sntArticleRomanNumeral(firstArticleRoman, i)
    const trust = sntTrustLabel(name)
    return `any share allocated to ${name} shall be delivered to the Trustee of the ${trust} established under Article ${article} of this Will, and shall not be distributed to ${name} free of trust`
  })
  return joinSntProvisoClauses(clauses)
}

function section54CoTrustee(params: {
  trustName: string
  spouseName: string
  coTrusteeChildName: string
  successorCoTrusteeName: string
  remainderWithSnt: string
}) {
  const coChild = params.coTrusteeChildName || '[Child Name]'
  const successor = params.successorCoTrusteeName || '[Successor Co-Trustee Name]'
  return [
    `**5.4 Creation and Terms of the Spousal Testamentary Trust.** If my spouse survives me, the residuary estate shall be held, administered, and distributed under the following terms:`,
    `(a) **Creation of Trust:** The Co-Trustees shall hold the residuary estate in a separate trust for the primary benefit of my spouse, designated as the "${params.trustName}."`,
    `(b) **Appointment of Co-Trustees:** I appoint my spouse, ${params.spouseName}, and my child, ${coChild}, as Co-Trustees of the ${params.trustName}.`,
    `(1) **Unanimous Decision-Making:** Except as otherwise expressly provided herein, all powers, duties, and discretionary authority granted to the Trustees shall be exercised only by the unanimous agreement of both Co-Trustees (Tex. Prop. Code § 113.085).`,
    `(2) **Successor Co-Trustee:** If either Co-Trustee ceases or refuses to serve, ${successor} shall serve as successor Co-Trustee in their place.`,
    `(3) **Waiver of Bond:** No Co-Trustee serving under this Instrument shall be required to post bond or other security in any jurisdiction (Tex. Prop. Code § 113.058).`,
    `(c) **Lifetime Distributions to Spouse:**`,
    `(1) **Mandatory Net Income:** The Co-Trustees shall pay to or apply for the benefit of my spouse all of the net income of the Trust, distributed at least annually or in more frequent installments.`,
    `(2) **Principal Discretion (HEMS Standard):** The Co-Trustees may pay to or apply for the benefit of my spouse so much of the trust principal as is reasonably necessary for my spouse's health, education, maintenance, and support in reasonable comfort (HEMS Standard). In exercising this discretion, the Co-Trustees shall balance my primary intent to support my spouse during their lifetime with my secondary intent to preserve the principal for my surviving children.`,
    `(d) **Termination and Remainder Distribution:** Upon the death of my spouse, the ${params.trustName} shall terminate. The Co-Trustees shall distribute the remaining trust principal and any accrued but undistributed net income in equal shares to my children per stirpes${params.remainderWithSnt}`,
  ].join('\n\n')
}

function section54SoleTrustee(params: {
  trustName: string
  spouseName: string
  alternateTrusteeName: string
  remainderWithSnt: string
}) {
  const alternate = params.alternateTrusteeName || '[Alternate Trustee Name]'
  return [
    `**5.4 Creation and Terms of the Spousal Testamentary Trust.** If my spouse survives me, the residuary estate shall be held, administered, and distributed under the following terms:`,
    `(a) **Creation of Trust:** The Trustee shall hold the residuary estate in a separate trust for the primary benefit of my spouse, designated as the "${params.trustName}."`,
    `(b) **Appointment of Trustee:** I appoint my spouse, ${params.spouseName}, as the sole Trustee of the ${params.trustName}. If my spouse fails or ceases to serve for any reason, I appoint ${alternate} as successor Trustee. No Trustee serving under this Instrument shall be required to post bond or other security in any jurisdiction (Tex. Prop. Code § 113.058).`,
    `(c) **Lifetime Distributions to Spouse:**`,
    `(1) **Mandatory Net Income:** The Trustee shall pay to or apply for the benefit of my spouse all of the net income of the Trust, distributed at least annually or in more frequent installments.`,
    `(2) **Principal Discretion (HEMS Standard):** The Trustee may pay to or apply for the benefit of my spouse so much of the trust principal as the Trustee deems necessary or advisable for my spouse's health, education, maintenance, and support in reasonable comfort (the "HEMS Standard"), taking into consideration any other financial resources known to the Trustee to be available to my spouse.`,
    `(d) **Termination and Remainder Distribution:** Upon the death of my spouse, the ${params.trustName} shall terminate. The Trustee shall distribute the remaining trust principal and any accrued but undistributed net income in equal shares to my children per stirpes${params.remainderWithSnt}`,
  ].join('\n\n')
}

const SECTION_55 = `**5.5 Texas Statutory Administration Powers.**

(a) **General Powers:** The Co-Trustees shall possess all administration powers granted to trustees under the Texas Trust Code (Tex. Prop. Code § 111.001 et seq.), including full power to manage, invest, sell, lease, exchange, or encumber trust property.
(b) **Duty to Account:** The Co-Trustees shall render an annual accounting of trust transactions to my spouse and to the adult remainder beneficiaries (Tex. Prop. Code § 113.151). Providing financial account statements from financial institutions shall satisfy this requirement.
(c) **Principal and Income Allocations:** Receipts and expenses shall be allocated between principal and income pursuant to the Texas Uniform Principal and Income Act (Tex. Prop. Code Chapter 116).
(d) **In-Kind / Non-Pro Rata Distributions:** The Co-Trustees may make distributions of trust assets in cash or in kind, or partly in each, and make non-pro rata distributions among beneficiaries without cash adjustments for tax cost bases (Tex. Prop. Code § 113.027).`

const SECTION_55_SOLE = SECTION_55.replace(/Co-Trustees/g, 'Trustee').replace(
  /Co-Trustee/g,
  'Trustee',
)

const SECTION_56_CO = `**5.6 Co-Trustee Exculpation and Discretionary Protection.**
Pursuant to Texas Property Code § 114.007, no Co-Trustee shall be held individually liable for any action taken, decision made, or failure to act in connection with the administration of this Trust—including discretionary principal distributions under the HEMS standard—except in instances of gross negligence, intentional fraud, or bad faith. In exercising discretion regarding principal distributions to my spouse, the Co-Trustees shall be fully protected so long as such decision was made in good faith under the HEMS standard, notwithstanding any resulting reduction in the remaining corpus available to remainder beneficiaries.`

const SECTION_56_SOLE = `**5.6 Trustee Exculpation and Discretionary Protection.**
To the fullest extent permitted under Texas Property Code § 114.007, no Trustee shall be personally liable to any beneficiary or third party for any loss, damage, or depreciation in value of the trust estate resulting from any act, omission, or exercise of discretion made in good faith, except for losses resulting directly from such Trustee's gross negligence, willful misconduct, intentional fraud, or bad faith.`

export type BuildRonArticleVOptions = {
  /** Roman numeral of the first special-needs trust article in this will (e.g. VII). */
  firstSntArticleRoman?: string
}

/** Full Article V text (5.1–5.6) for orders with spousal testamentary trust. */
export function buildRonArticleVResiduarySpousalText(
  answers: Answers,
  options: BuildRonArticleVOptions = {},
): string {
  const testatorName = plain(str(answers.legal_full_name, '[Testator Name]'))
  const spouseName = plain(str(answers.spouse_full_name, '[Spouse Name]'))
  const trustName = `${testatorName} Family Trust`
  const firstSntRoman = options.firstSntArticleRoman ?? DEFAULT_FIRST_SNT_ARTICLE_ROMAN
  const sntRows = wantsSpecialNeedsTrust(answers) ? parseSntTrustRows(answers) : []
  const contingentSnt = sntPourOverProviso(sntRows, firstSntRoman)
  const remainderSnt =
    sntRows.length > 0 ? sntRemainderPourOverProviso(sntRows, firstSntRoman) : ''
  const mode = spousalTrusteeMode(answers)

  const fiduciaryRef =
    mode === 'co_trustee'
      ? 'the Co-Trustees named in Section 5.4 of this Article'
      : 'the Trustee named in Section 5.4 of this Article'
  const section51 = `**5.1 Primary Disposition to Spousal Trust.**
If my spouse, ${spouseName}, survives me, I give, devise, and bequeath my entire residuary estate to ${fiduciaryRef}, to be held, administered, and distributed in a separate trust designated as the "${trustName}" as provided herein.`

  const section52 = `**5.2 Contingent Disposition (If Spouse Predeceases).**
If my spouse does not survive me, I give, devise, and bequeath my entire residuary estate to my surviving children in equal shares per stirpes${contingentSnt}`

  const section53 = `**5.3 Survival.**
If any beneficiary under this Will fails to survive me by thirty (30) days, that beneficiary shall be deemed to have predeceased me for all purposes of this Will (Tex. Est. Code § 121.101).`

  const section54 =
    mode === 'co_trustee'
      ? section54CoTrustee({
          trustName,
          spouseName,
          coTrusteeChildName: str(answers.spousal_trust_co_trustee_name),
          successorCoTrusteeName: str(answers.spousal_trust_successor_trustee_name),
          remainderWithSnt: remainderSnt,
        })
      : section54SoleTrustee({
          trustName,
          spouseName,
          alternateTrusteeName: str(answers.spousal_trust_alternate_trustee_name),
          remainderWithSnt: remainderSnt,
        })

  const section55 = mode === 'co_trustee' ? SECTION_55 : SECTION_55_SOLE
  const section56 = mode === 'co_trustee' ? SECTION_56_CO : SECTION_56_SOLE

  return [section51, section52, section53, section54, section55, section56].join('\n\n')
}

/** Ron opening paragraph (title block is separate). */
export function buildRonWillOpeningParagraph(answers: Answers): string {
  const name = plain(str(answers.legal_full_name, '[NAME]')).toUpperCase()
  const county = plain(str(answers.address_county, '__________'))
  return `I, ${name}, a resident of ${county} County, Texas, being of sound mind and memory, and being at least eighteen (18) years of age or older, do hereby make, publish, and declare this to be my Last Will, hereby revoking any and all former wills and codicils made by me at any time before.`
}

export const RON_ARTICLE_III_DEBTS_TAXES = `**3.1 Death Tax.** The Executor shall pay any death taxes out of my residuary estate.

**3.2 Debts and Expenses.** All of my debts, funeral expense, and expenses incurred in the administration of my estate paid by the Executor shall be paid out of my residuary estate. Nothing herein, however, shall require the Executor to prepay any debt. The Executor may pay death taxes, debts, and expenses out of the income of my estate.

**3.3 Allocation of Generation-Skipping Transfer Tax Exemption.** The Executor shall, in the sole and absolute discretion of the Executor, determine whether to allocate all or any portion of the unused generation-skipping transfer tax exemption available to my estate under Section 2631 of the Internal Revenue Code to any property or transfer of which I am considered the transferor.`
