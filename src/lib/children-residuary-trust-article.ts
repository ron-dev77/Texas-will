/**
 * Step 8 Rev 1 — ARTICLE — TRUST FOR CHILDREN (Sections 1–6).
 * Fixed template; variables: adult trustee names, SNT article cross-ref.
 */

import { parseSntTrustRows, wantsSpecialNeedsTrust } from '@/lib/special-needs-trust'

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'] as const

function romanNumeral(n: number): string {
  return ROMAN[n - 1] ?? String(n)
}

type Answers = Record<string, unknown>

export type ChildrenTrustFillOptions = {
  /** Roman numeral of the first SNT article in this will (for Section 6). */
  firstSntArticleRoman?: string
}

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

export function usesChildrenLifetimeResiduaryTrust(answers: Answers): boolean {
  if (str(answers.residuary_plan) === 'spousal_trust') return false
  if (answers.has_children !== 'yes') return false
  const plan = str(answers.residuary_plan)
  return plan === 'children_equally' || plan === 'spouse_then_children'
}

/** Article VI when children lifetime trust is used; SNT follows as VII. */
export const CHILDREN_LIFETIME_TRUST_ARTICLE_ROMAN = 'VI'
export const DEFAULT_FIRST_SNT_AFTER_CHILDREN_TRUST_ROMAN = 'VII'

export function resolveFirstSntArticleRoman(
  answers: Answers,
  options: { includeSpousalTrust?: boolean } = {},
): string {
  if (options.includeSpousalTrust || str(answers.residuary_plan) === 'spousal_trust') {
    return 'VI'
  }
  if (usesChildrenLifetimeResiduaryTrust(answers)) {
    return DEFAULT_FIRST_SNT_AFTER_CHILDREN_TRUST_ROMAN
  }
  return 'VI'
}

/** Full articles inserted after Article V (children trust body, SNT block, etc.). */
export function postResiduaryArticleSlotCount(answers: Answers): number {
  let n = 0
  if (usesChildrenLifetimeResiduaryTrust(answers)) n++
  if (wantsSpecialNeedsTrust(answers) && parseSntTrustRows(answers).length > 0) n++
  return n
}

/** Simultaneous death follows residuary + optional trust/SNT blocks (always ≥ VII). */
export function resolveSimultaneousDeathArticleRoman(answers: Answers): string {
  const slots = postResiduaryArticleSlotCount(answers)
  return romanNumeral(7 + Math.max(0, slots - 1))
}

export function resolveNoContestArticleRoman(answers: Answers): string {
  const base = resolveSimultaneousDeathArticleRoman(answers)
  const idx = ROMAN.indexOf(base as (typeof ROMAN)[number])
  return idx >= 0 ? romanNumeral(idx + 2) : romanNumeral(8)
}

export function resolveFinalWishesArticleRoman(answers: Answers): string {
  const base = resolveSimultaneousDeathArticleRoman(answers)
  const idx = ROMAN.indexOf(base as (typeof ROMAN)[number])
  return idx >= 0 ? romanNumeral(idx + 3) : romanNumeral(9)
}

export function resolveGeneralProvisionsArticleRoman(answers: Answers): string {
  const base = resolveSimultaneousDeathArticleRoman(answers)
  const idx = ROMAN.indexOf(base as (typeof ROMAN)[number])
  return idx >= 0 ? romanNumeral(idx + 4) : romanNumeral(10)
}

export function buildChildrenResiduaryTrustArticleText(
  answers: Answers,
  options: ChildrenTrustFillOptions = {},
): string {
  if (!usesChildrenLifetimeResiduaryTrust(answers)) return ''

  const primary = plain(str(answers.children_lifetime_primary_trustee_name, '[PRIMARY ADULT TRUSTEE NAME]'))
  const alternate = plain(
    str(answers.children_lifetime_alternate_trustee_name, '[ALTERNATE/SUCCESSOR ADULT TRUSTEE NAME]'),
  )
  const sntRoman =
    options.firstSntArticleRoman ??
    (wantsSpecialNeedsTrust(answers) && parseSntTrustRows(answers).length > 0
      ? DEFAULT_FIRST_SNT_AFTER_CHILDREN_TRUST_ROMAN
      : '___')

  const sections = [
    `**ARTICLE ${CHILDREN_LIFETIME_TRUST_ARTICLE_ROMAN} — TRUST FOR CHILDREN**`,
    `**Section 1. Creation of Trust Shares.** If any part of my residuary estate is payable to my children under this Will, I give that portion to my Trustee, IN TRUST, to be divided into separate shares as follows: one equal share for each of my children who survives me, and, for each child of mine who does not survive me but leaves then-living descendants, a separate share for that deceased child, to be further divided into equal separate shares among that deceased child's then-living descendants, per stirpes. Each share created under this Section shall be held and administered as a separate trust share for its Primary Beneficiary as provided in this Article.`,
    `"Primary Beneficiary" means, with respect to each trust share, my child for whom the share was created, or, if that share was created for a deceased child's descendant under this Section, the descendant for whom that particular share is held.`,
    `**Section 2. Trustee of Each Share.**`,
    `(a) **Adult Trustee.** With respect to any trust share held for a Primary Beneficiary who has not yet reached the age of thirty (30) years, ${primary} shall serve as Trustee. If ${primary} is unable or unwilling to serve or to continue serving, ${alternate} shall serve as successor Trustee.`,
    `(b) **Primary Beneficiary as Sole Trustee at Age 30.** When a Primary Beneficiary for whom a trust share is held reaches the age of thirty (30) years, that Primary Beneficiary shall become the Sole Trustee of their own trust share, and the Adult Trustee named above shall have no further duties with respect to that share.`,
    `(c) **Primary Beneficiary Already Age 30 or Older.** If a Primary Beneficiary has already reached the age of thirty (30) years at the time the share is created, that Primary Beneficiary shall serve as Sole Trustee of their trust share immediately upon the funding of the trust, and the Adult Trustee named above shall have no duties with respect to that share.`,
    `(d) **Merger Not Intended.** It is not my intent, and nothing in this Article shall be construed, to unite in one person both the entire legal title to and all equitable interests in a trust share. If the legal title to a trust share and all equitable interests in that share are ever determined to have become united in one person under Section 112.034, Texas Property Code, a court of competent jurisdiction shall appoint a successor or co-trustee to administer that share, and the trust shall not terminate by operation of the doctrine of merger.`,
    `**Section 3. Distribution Standard.** The Trustee of each trust share — including a Primary Beneficiary serving as Sole Trustee of their own share — may distribute to or for the benefit of the Primary Beneficiary of that share so much of the net income and principal of the share, up to the whole thereof, as the Trustee determines to be necessary or advisable for that Primary Beneficiary's health, education, maintenance, and support, taking into consideration, to the extent the Trustee deems advisable, any other income or resources of the Primary Beneficiary known to the Trustee. Any power of a Primary Beneficiary acting as Trustee to make distributions to or for the benefit of that Primary Beneficiary is limited by the ascertainable standard set forth in this Section, consistent with Section 112.035(f), Texas Property Code, and no such Primary Beneficiary-Trustee may make any distribution to or for their own benefit except as limited by this standard.`,
    `**Section 4. Spendthrift Provision.** No Primary Beneficiary of any trust share created under this Article shall have the power to sell, assign, transfer, encumber, or otherwise dispose of their interest in the trust, whether principal or income, before its actual distribution to the Primary Beneficiary by the Trustee, and no interest of a Primary Beneficiary shall be subject to the claims of that Primary Beneficiary's creditors or to legal process, to the maximum extent permitted under Section 112.035, Texas Property Code.`,
    `**Section 5. Distribution on Death of a Primary Beneficiary.** Upon the death of a Primary Beneficiary for whom a trust share is held under this Article, the remaining principal and any undistributed income of that trust share shall be distributed to that Primary Beneficiary's then-living descendants, per stirpes.`,
    `If that Primary Beneficiary has no then-living descendants, that share shall instead be added, in equal shares, to the trust shares then held under this Article for my other then-living children, or if a child of mine is not then living, to the share or shares held for that child's then-living descendants, per stirpes, to be held and administered as a part of that share on the same terms as provided in this Article.`,
    `If, at any time, no descendant of mine survives to take a share or portion of a share under this Section, the remaining trust property shall be distributed fifty percent (50%) to my heirs-at-law and fifty percent (50%) to the heirs-at-law of my spouse, in each case determined as if the relevant person had died intestate, unmarried, and domiciled in Texas on the date this paragraph becomes applicable; provided that if my spouse is then living, my spouse's fifty percent (50%) share shall instead be distributed to my spouse outright.`,
    `**Section 6. Special Needs Exception.** Notwithstanding anything in this Article to the contrary, if a Primary Beneficiary is, at the time a share would otherwise be created or funded for that Primary Beneficiary, receiving or eligible to receive means-tested government benefits, or is later determined to require a special needs trust, that Primary Beneficiary's share shall not be held or administered under this Article, but shall instead be held and administered as provided in Article ${sntRoman} (Special Needs Trust) of this Will.`,
  ]

  return sections.join('\n\n')
}
