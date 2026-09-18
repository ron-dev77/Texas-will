/**
 * Step 8 — ARTICLE — TRUST FOR CHILDREN (6.1–6.6, Ron Rev 3 handoff with spousal trust).
 * Fixed template; variables: adult trustee names, SNT article cross-ref.
 */

import { parseSntTrustRows, wantsSpecialNeedsTrust } from '@/lib/special-needs-trust'
import {
  articleArabicFromRoman,
  romanIndex,
  romanNumeralFromIndex,
} from '@/lib/will-article-numbering'

function romanNumeral(n: number): string {
  return romanNumeralFromIndex(n)
}

type Answers = Record<string, unknown>

export type ChildrenTrustFillOptions = {
  /** Roman numeral of the first SNT article in this will (for 6.6). */
  firstSntArticleRoman?: string
}

export { articleArabicFromRoman } from '@/lib/will-article-numbering'

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

const RESIDUARY_PLANS_WITH_CHILDREN_SHARE = new Set([
  'spousal_trust',
  'spouse_then_children',
  'children_equally',
])

/** Module O — full residuary clause (children equally, outright). */
export const CHILDREN_OUTRIGHT_RESIDUARY_MODULE_O =
  'I give the residue of my estate, after payment of debts, expenses, and specific bequests, in equal shares, to my then-living children, outright and free of trust, and if a child of mine does not survive me but leaves then-living descendants, to that child\'s then-living descendants, per stirpes.'

/** Aligns outright gifts with Trust Article Section 5 when a child has no descendants. */
export const CHILDREN_OUTRIGHT_NO_DESCENDANTS_REALLOCATION =
  'If a child of mine does not survive me and has no then-living descendants, that child\'s share shall instead be added, in equal shares, to the shares passing to my other then-living children, or if a child of mine is not then living, to that deceased child\'s then-living descendants, per stirpes.'

/** Embedded in spouse-first / spousal remainder sentences (after a leading intro). */
export const CHILDREN_OUTRIGHT_RESIDUARY_PHRASE =
  'in equal shares, to my then-living children, outright and free of trust, and if a child of mine does not survive me but leaves then-living descendants, to that child\'s then-living descendants, per stirpes'

export function childrenOutrightResiduaryStandaloneText(): string {
  return `${CHILDREN_OUTRIGHT_RESIDUARY_MODULE_O} ${CHILDREN_OUTRIGHT_NO_DESCENDANTS_REALLOCATION}`
}

export function childrenOutrightResiduaryContingentText(): string {
  return `${CHILDREN_OUTRIGHT_RESIDUARY_PHRASE}. ${CHILDREN_OUTRIGHT_NO_DESCENDANTS_REALLOCATION}`
}

export function childrenResiduaryPlanMayPassToChildren(answers: Answers): boolean {
  if (answers.has_children !== 'yes') return false
  return RESIDUARY_PLANS_WITH_CHILDREN_SHARE.has(str(answers.residuary_plan))
}

function childrenResiduaryDelivery(answers: Answers): 'outright' | 'lifetime_trust' | '' {
  const v = str(answers.children_residuary_delivery)
  if (v === 'outright' || v === 'lifetime_trust') return v
  return ''
}

/** Legacy orders (pre–Step 8 redesign): lifetime trust fields applied without Q2. */
function legacyAssumesLifetimeTrust(answers: Answers): boolean {
  if (childrenResiduaryDelivery(answers)) return false
  const plan = str(answers.residuary_plan)
  return plan === 'children_equally' || plan === 'spouse_then_children'
}

export function usesChildrenLifetimeResiduaryTrust(answers: Answers): boolean {
  if (!childrenResiduaryPlanMayPassToChildren(answers)) return false
  const delivery = childrenResiduaryDelivery(answers)
  if (delivery === 'lifetime_trust') return true
  if (delivery === 'outright') return false
  return legacyAssumesLifetimeTrust(answers)
}

export function usesChildrenOutrightResiduary(answers: Answers): boolean {
  return (
    childrenResiduaryPlanMayPassToChildren(answers) &&
    !usesChildrenLifetimeResiduaryTrust(answers)
  )
}

/** Article VI when children lifetime trust is used; SNT follows as VII. */
export const CHILDREN_LIFETIME_TRUST_ARTICLE_ROMAN = 'VI'
export const DEFAULT_FIRST_SNT_AFTER_CHILDREN_TRUST_ROMAN = 'VII'

export function resolveFirstSntArticleRoman(
  answers: Answers,
  options: { includeSpousalTrust?: boolean } = {},
): string {
  const spousal =
    options.includeSpousalTrust || str(answers.residuary_plan) === 'spousal_trust'
  if (usesChildrenLifetimeResiduaryTrust(answers)) {
    return spousal ? 'VII' : DEFAULT_FIRST_SNT_AFTER_CHILDREN_TRUST_ROMAN
  }
  if (spousal) return 'VI'
  return 'VI'
}

/** Ron Rev 3 — pour-over to Trust for Children (5.2 contingent + 5.4(d) termination). */
export function childrenLifetimeTrustPourOverPhrase(_answers?: Answers): string {
  const roman = CHILDREN_LIFETIME_TRUST_ARTICLE_ROMAN
  return `to the Trustee named in Article ${roman} of this Will, to be held and administered as provided in Article ${roman} (Trust for Children)`
}

/** Phrase for spousal-trust 5.2 / direct contingent child distribution. */
export function childrenResiduaryDistributionPhrase(answers: Answers): string {
  if (usesChildrenLifetimeResiduaryTrust(answers)) {
    return childrenLifetimeTrustPourOverPhrase(answers)
  }
  return childrenOutrightResiduaryContingentText()
}

/** Ron Rev 3 — 5.4(d) spousal trust termination pour-over (same destination as 5.2). */
export function spousalTrustTerminationRemainderPhrase(answers: Answers): string {
  if (usesChildrenLifetimeResiduaryTrust(answers)) {
    return childrenLifetimeTrustPourOverPhrase(answers)
  }
  return childrenResiduaryDistributionPhrase(answers)
}

/** Full articles inserted after Article V (children trust body, SNT block, etc.). */
export function postResiduaryArticleSlotCount(answers: Answers): number {
  let n = 0
  if (usesChildrenLifetimeResiduaryTrust(answers)) n++
  if (wantsSpecialNeedsTrust(answers) && parseSntTrustRows(answers).length > 0) n++
  return n
}

/** Last Roman article index (1-based) used by post–Article V blocks (V = 5). */
export function postResiduaryLastArticleIndex(answers: Answers): number {
  let n = 5
  if (usesChildrenLifetimeResiduaryTrust(answers)) n += 1
  if (wantsSpecialNeedsTrust(answers)) n += parseSntTrustRows(answers).length
  return n
}

export function guardianClauseApplies(answers: Answers): boolean {
  return answers.has_children === 'yes' && Boolean(str(answers.primary_guardian_name))
}

export function resolveGuardianArticleRoman(answers: Answers): string {
  return romanNumeral(postResiduaryLastArticleIndex(answers) + 1)
}

/** Simultaneous death follows guardian when present (skeleton order). */
export function resolveSimultaneousDeathArticleRoman(answers: Answers): string {
  let n = postResiduaryLastArticleIndex(answers) + 1
  if (guardianClauseApplies(answers)) n += 1
  return romanNumeral(n)
}

export function resolveNoContestArticleRoman(answers: Answers): string {
  const base = resolveSimultaneousDeathArticleRoman(answers)
  const idx = romanIndex(base)
  return idx > 0 ? romanNumeral(idx + 1) : romanNumeral(8)
}

export function resolveFinalWishesArticleRoman(answers: Answers): string {
  const base = resolveSimultaneousDeathArticleRoman(answers)
  const idx = romanIndex(base)
  return idx > 0 ? romanNumeral(idx + 2) : romanNumeral(9)
}

export function resolveGeneralProvisionsArticleRoman(answers: Answers): string {
  const base = resolveSimultaneousDeathArticleRoman(answers)
  const idx = romanIndex(base)
  return idx > 0 ? romanNumeral(idx + 3) : romanNumeral(10)
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

  const artRoman = CHILDREN_LIFETIME_TRUST_ARTICLE_ROMAN
  const n = articleArabicFromRoman(artRoman)

  const sections = [
    `**ARTICLE ${artRoman} — TRUST FOR CHILDREN**`,
    `**${n}.1 Creation of Trust Shares.** If any part of my residuary estate is payable to my children under this Will, or if any property becomes distributable to my children upon the termination of any other trust created under this Will, including the Spousal Trust, I give that portion to my Trustee, IN TRUST, to be divided into separate shares as follows: one equal share for each of my children who survives me, and, for each child of mine who does not survive me but leaves then-living descendants, a separate share for that deceased child, to be further divided into equal separate shares among that deceased child's then-living descendants, per stirpes. Each share created under **${n}.1** shall be held and administered as a separate trust share for its Primary Beneficiary as provided in this Article. "Primary Beneficiary" means, with respect to each trust share, my child for whom the share was created, or, if that share was created for a deceased child's descendant under **${n}.1**, the descendant for whom that particular share is held.`,
    `**${n}.2 Trustee of Each Share.**`,
    `(a) **Adult Trustee.** With respect to any trust share held for a Primary Beneficiary who has not yet reached the age of thirty (30) years, ${primary} shall serve as Trustee. If ${primary} is unable or unwilling to serve or to continue serving, ${alternate} shall serve as successor Trustee.`,
    `(b) **Primary Beneficiary as Sole Trustee at Age 30.** When a Primary Beneficiary for whom a trust share is held reaches the age of thirty (30) years, that Primary Beneficiary shall become the Sole Trustee of their own trust share, and the Adult Trustee named above shall have no further duties with respect to that share.`,
    `(c) **Primary Beneficiary Already Age 30 or Older.** If a Primary Beneficiary has already reached the age of thirty (30) years at the time the share is created, that Primary Beneficiary shall serve as Sole Trustee of their trust share immediately upon the funding of the trust, and the Adult Trustee named above shall have no duties with respect to that share.`,
    `(d) **Merger Not Intended.** It is not my intent, and nothing in this Article shall be construed, to unite in one person both the entire legal title to and all equitable interests in a trust share. If the legal title to a trust share and all equitable interests in that share are ever determined to have become united in one person under Section 112.034, Texas Property Code, a court of competent jurisdiction shall appoint a successor or co-trustee to administer that share, and the trust shall not terminate by operation of the doctrine of merger.`,
    `**${n}.3 Distribution Standard.** The Trustee of each trust share — including a Primary Beneficiary serving as Sole Trustee of their own share — may distribute to or for the benefit of the Primary Beneficiary of that share so much of the net income and principal of the share, up to the whole thereof, as the Trustee determines to be necessary or advisable for that Primary Beneficiary's health, education, maintenance, and support, taking into consideration, to the extent the Trustee deems advisable, any other income or resources of the Primary Beneficiary known to the Trustee. Any power of a Primary Beneficiary acting as Trustee to make distributions to or for the benefit of that Primary Beneficiary is limited by the ascertainable standard set forth in **${n}.3**, consistent with Section 112.035(f), Texas Property Code, and no such Primary Beneficiary-Trustee may make any distribution to or for their own benefit except as limited by this standard.`,
    `**${n}.4 Spendthrift Provision.** No Primary Beneficiary of any trust share created under this Article shall have the power to sell, assign, transfer, encumber, or otherwise dispose of their interest in the trust, whether principal or income, before its actual distribution to the Primary Beneficiary by the Trustee, and no interest of a Primary Beneficiary shall be subject to the claims of that Primary Beneficiary's creditors or to legal process, to the maximum extent permitted under Section 112.035, Texas Property Code.`,
    `**${n}.5 Distribution on Death of a Primary Beneficiary.** Upon the death of a Primary Beneficiary for whom a trust share is held under this Article, the remaining principal and any undistributed income of that trust share shall be distributed to that Primary Beneficiary's then-living descendants, per stirpes.`,
    `If that Primary Beneficiary has no then-living descendants, that share shall instead be added, in equal shares, to the trust shares then held under this Article for my other then-living children, or if a child of mine is not then living, to the share or shares held for that child's then-living descendants, per stirpes, to be held and administered as a part of that share on the same terms as provided in this Article.`,
    `If, at any time, no descendant of mine survives to take a share or portion of a share under **${n}.5**, the remaining trust property shall be distributed fifty percent (50%) to my heirs-at-law and fifty percent (50%) to the heirs-at-law of my spouse, in each case determined as if the relevant person had died intestate, unmarried, and domiciled in Texas on the date this paragraph becomes applicable; provided that if my spouse is then living, my spouse's fifty percent (50%) share shall instead be distributed to my spouse outright.`,
    `**${n}.6 Special Needs Exception.** Notwithstanding anything in this Article to the contrary, if a Primary Beneficiary is, at the time a share would otherwise be created or funded for that Primary Beneficiary, receiving or eligible to receive means-tested government benefits, or is later determined to require a special needs trust, that Primary Beneficiary's share shall not be held or administered under this Article, but shall instead be held and administered as provided in Article ${sntRoman} (Special Needs Trust) of this Will.`,
  ]

  return sections.join('\n\n')
}
