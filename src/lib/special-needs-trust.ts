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

function nameOrPlaceholder(v: unknown, fallback: string) {
  return plain(str(v, fallback)) || fallback
}

function firstName(full: string) {
  const t = plain(full)
  return t.split(/\s+/)[0] || t
}

export type SpecialNeedsArticle = {
  heading: string
  paragraphs: string[]
}

/** Follow-up fields cleared when the client says no to special-needs planning. */
export const SPECIAL_NEEDS_FOLLOW_UP_IDS = [
  'snt_beneficiary_name',
  'snt_trustee_name',
  'snt_successor_trustee_name',
  'snt_remainder',
  'snt_contingent_remainder',
  'snt_trustee_notes',
  'snt_has_existing',
  'snt_existing_name',
  'snt_existing_date',
] as const

export function wantsSpecialNeedsTrust(answers: Answers) {
  return str(answers.wants_snt) === 'yes'
}

export function needsSpecialNeedsLawyerSignoff(answers: Answers) {
  return wantsSpecialNeedsTrust(answers)
}

export function orderNeedsSpecialNeedsLawyerSignoff(
  rows: { answers?: Answers | null }[],
) {
  return rows.some((row) => needsSpecialNeedsLawyerSignoff(row.answers ?? {}))
}

export const SPECIAL_NEEDS_LAWYER_SIGNOFF_TEXT =
  'I am Scott Pappas or another licensed Texas attorney. I have reviewed this special needs trust language against current Texas Property Code (Chapter 111 et seq.) and current SSI/Medicaid resource-eligibility rules, and I approve sending it to the client.'

/** Testamentary SNT — placeholders filled from answers. */
function buildSntArticle(answers: Answers): SpecialNeedsArticle {
  const beneficiary = nameOrPlaceholder(answers.snt_beneficiary_name, '[Beneficiary Full Legal Name]')
  const first = firstName(beneficiary) || 'Beneficiary'
  const trustee = nameOrPlaceholder(answers.snt_trustee_name, '[Trustee Full Legal Name]')
  const successor = nameOrPlaceholder(
    answers.snt_successor_trustee_name,
    '[Successor Trustee Full Legal Name]',
  )
  const remainder = nameOrPlaceholder(
    answers.snt_remainder,
    '[Remainder Beneficiary Name(s), Relationship(s), and Share(s)]',
  )
  const contingent = nameOrPlaceholder(
    answers.snt_contingent_remainder,
    '[Contingent Remainder Provision]',
  )
  const notes = plain(str(answers.snt_trustee_notes))
  const hasExisting = str(answers.snt_has_existing) === 'yes'
  const existingName = nameOrPlaceholder(answers.snt_existing_name, '[Name of Existing Trust]')
  const existingDate = nameOrPlaceholder(answers.snt_existing_date, '[Date Established]')

  const paragraphs: string[] = [
    `This Article establishes a trust for the benefit of **${beneficiary}** ("Beneficiary"), to be funded upon my death with the share of my estate otherwise passing to Beneficiary under this Will. I have created this trust because I understand Beneficiary may be receiving, or may in the future receive, government benefits based on disability, including but not limited to Supplemental Security Income (SSI) and Medicaid, and I intend that Beneficiary's inheritance supplement, and not replace or jeopardize, such benefits.`,
    `**1. Name of Trust.** This trust shall be known as the "**${first} Special Needs Trust**" (the "Trust").`,
    `**2. Trustee.** I appoint **${trustee}** to serve as Trustee of the Trust. If **${trustee}** is unable or unwilling to serve, or ceases to serve for any reason, I appoint **${successor}** to serve as successor Trustee. No beneficiary of this Trust, including Beneficiary, shall serve as Trustee or co-Trustee of the Trust.`,
    `**3. Purpose and Distribution Standard.** The Trustee shall hold, manage, and administer the Trust for the sole benefit of Beneficiary during Beneficiary's lifetime. The Trustee, in the Trustee's sole and absolute discretion, may distribute so much of the net income and principal of the Trust as the Trustee deems advisable for the special needs of Beneficiary, supplementing rather than supplanting any benefits Beneficiary may be eligible to receive from any local, state, or federal government program, including but not limited to SSI, Medicaid, and any successor programs. No distribution shall be made that would render Beneficiary ineligible for, or reduce the amount of, any such benefit, except upon the Trustee's determination, in the Trustee's sole discretion, that a particular distribution is in Beneficiary's best interest notwithstanding any effect on eligibility. Beneficiary shall have no power to compel any distribution from the Trust, and no interest in the Trust that is assignable, transferable, or subject to anticipation.`,
    `**4. Spendthrift Provision.** No part of the principal or income of the Trust shall be subject to anticipation, assignment, pledge, sale, transfer, or encumbrance by Beneficiary, nor shall it be subject to the claims of Beneficiary's creditors or liable to attachment, execution, or other legal process before receipt by Beneficiary.`,
    `**5. Source of Funding; No Payback Provision.** This Trust is funded solely with assets from my estate and not with any assets belonging to Beneficiary. Accordingly, this Trust is a third-party special needs trust, and no provision of this Trust requires reimbursement of any state Medicaid agency upon the termination of the Trust or the death of Beneficiary.`,
    `**6. Remainder Beneficiaries.** Upon the death of Beneficiary, or upon earlier termination of the Trust as provided herein, the Trustee shall distribute the remaining trust property, after payment of any amounts properly chargeable to the Trust, to the following remainder beneficiaries in the shares indicated: ${remainder}. If a named remainder beneficiary does not survive Beneficiary, that beneficiary's share shall pass to ${contingent}.`,
    `**7. Trustee Powers.** In addition to any powers granted by law, the Trustee shall have the power to invest and reinvest trust assets; to expend trust funds directly for goods and services for Beneficiary's benefit rather than distributing funds to Beneficiary directly; to employ agents, accountants, and attorneys as reasonably necessary; to consult with any guardian, conservator, or care manager of Beneficiary; and to take any other action reasonably necessary to carry out the purposes of this Trust consistent with preserving Beneficiary's eligibility for government benefits.`,
    notes
      ? `**8. Trustee Guidance (Optional, Non-Binding).** The following guidance is provided to assist the Trustee in exercising discretion, but is precatory only and not binding on the Trustee: ${notes}`
      : '**8. Trustee Guidance (Optional, Non-Binding).** The following guidance is provided to assist the Trustee in exercising discretion, but is precatory only and not binding on the Trustee: None specified.',
    `**9. Termination.** The Trust shall terminate upon the earlier of: (a) the death of Beneficiary; (b) the exhaustion of trust assets; or (c) a determination by the Trustee that continuation of the Trust no longer serves Beneficiary's best interests. Upon termination during Beneficiary's lifetime under clause (c), remaining trust property shall be distributed as provided in Section 6, subject to any applicable legal requirements.`,
    `**10. Governing Law.** This Trust shall be governed by and construed in accordance with the laws of the State of Texas, including the Texas Property Code and applicable Texas Trust Code provisions.`,
  ]

  if (hasExisting) {
    paragraphs.push(
      `**Alternative — pour-over to existing special needs trust.** If Beneficiary has an existing special needs trust at the time of my death, I give the share of my estate that would otherwise pass to Beneficiary under this Will to the Trustee of the ${existingName}, dated ${existingDate}, to be held and administered according to the terms of that trust instrument. If, for any reason, that trust is not then in existence or is unable to receive this gift, the gift shall instead be held under the terms of this Article (Testamentary Special Needs Trust), with ${trustee} serving as Trustee.`,
    )
  }

  return {
    heading: `SPECIAL NEEDS TRUST FOR ${beneficiary.toUpperCase()}`,
    paragraphs,
  }
}

export function buildSpecialNeedsArticles(answers: Answers): SpecialNeedsArticle[] {
  if (!wantsSpecialNeedsTrust(answers)) return []
  return [buildSntArticle(answers)]
}

export function buildSpecialNeedsTrustArticle(answers: Answers): SpecialNeedsArticle | null {
  const articles = buildSpecialNeedsArticles(answers)
  return articles[0] ?? null
}

export function specialNeedsTrustClauseText(answers: Answers): string {
  const article = buildSpecialNeedsTrustArticle(answers)
  if (!article) return ''
  return [`**ARTICLE — ${article.heading}**`, ...article.paragraphs].join('\n\n')
}

export function residuarySpecialNeedsNote(answers: Answers): string | null {
  if (!wantsSpecialNeedsTrust(answers)) return null
  const beneficiary = `**${nameOrPlaceholder(answers.snt_beneficiary_name, '[Beneficiary]')}**`
  return `Any share that would otherwise pass outright to ${beneficiary} shall instead be held and administered under the Special Needs Trust established in this Will, and shall not be distributed to ${beneficiary} free of trust.`
}
