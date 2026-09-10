import type { SntTrustRow } from '@/lib/questionnaire'
import { emptySntTrustRow } from '@/lib/questionnaire'

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

function firstName(full: string) {
  const t = plain(full)
  return t.split(/\s+/)[0] || t
}

export type SpecialNeedsArticle = {
  heading: string
  paragraphs: string[]
}

/** Bracket markers that must never appear in a delivered PDF. */
export const SNT_PDF_PLACEHOLDER_MARKERS = [
  '[Beneficiary Full Legal Name]',
  '[Trustee Full Legal Name]',
  '[Successor Trustee Full Legal Name]',
  '[Remainder Beneficiary Name(s), Relationship(s), and Share(s)]',
  '[Contingent Remainder Provision]',
  '[Beneficiary]',
] as const

export class SntPdfNotReadyError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SntPdfNotReadyError'
  }
}

/** Legacy flat fields cleared when the client says no to special-needs planning. */
export const SPECIAL_NEEDS_LEGACY_FIELD_IDS = [
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

export const SPECIAL_NEEDS_FOLLOW_UP_IDS = ['snt_trusts', ...SPECIAL_NEEDS_LEGACY_FIELD_IDS] as const

function normalizeSntTrustRow(raw: unknown): SntTrustRow | null {
  if (!raw || typeof raw !== 'object') return null
  const row = raw as Partial<SntTrustRow>
  const beneficiary_name = str(row.beneficiary_name)
  const trustee_name = str(row.trustee_name)
  const successor_trustee_name = str(row.successor_trustee_name)
  const remainder = str(row.remainder)
  const contingent_remainder = str(row.contingent_remainder)
  const trustee_notes = str(row.trustee_notes)
  if (
    !beneficiary_name &&
    !trustee_name &&
    !successor_trustee_name &&
    !remainder &&
    !contingent_remainder
  ) {
    return null
  }
  return {
    beneficiary_name,
    trustee_name,
    successor_trustee_name,
    remainder,
    contingent_remainder,
    trustee_notes,
  }
}

/** All required SNT row fields for PDF generation. */
export function isCompleteSntRow(row: SntTrustRow): boolean {
  return (
    Boolean(row.beneficiary_name?.trim()) &&
    Boolean(row.trustee_name?.trim()) &&
    Boolean(row.successor_trustee_name?.trim()) &&
    Boolean(row.remainder?.trim()) &&
    Boolean(row.contingent_remainder?.trim())
  )
}

/** Read SNT rows from answers, including legacy single-beneficiary flat fields. */
export function parseSntTrustRows(answers: Answers): SntTrustRow[] {
  const fromArray = answers.snt_trusts
  if (Array.isArray(fromArray) && fromArray.length > 0) {
    return fromArray
      .map((row) => normalizeSntTrustRow(row))
      .filter((row): row is SntTrustRow => row !== null)
  }

  const legacyBeneficiary = str(answers.snt_beneficiary_name)
  if (!legacyBeneficiary) return []

  return [
    {
      beneficiary_name: legacyBeneficiary,
      trustee_name: str(answers.snt_trustee_name),
      successor_trustee_name: str(answers.snt_successor_trustee_name),
      remainder: str(answers.snt_remainder),
      contingent_remainder: str(answers.snt_contingent_remainder),
      trustee_notes: str(answers.snt_trustee_notes),
    },
  ]
}

/** Migrate legacy flat SNT fields into `snt_trusts` when needed. */
export function migrateLegacySntAnswers(answers: Answers): Answers | null {
  if (str(answers.wants_snt) !== 'yes') return null
  if (Array.isArray(answers.snt_trusts) && answers.snt_trusts.length > 0) return null
  const rows = parseSntTrustRows(answers)
  if (rows.length === 0) return { ...answers, snt_trusts: [emptySntTrustRow()] }
  const next = { ...answers, snt_trusts: rows }
  for (const id of SPECIAL_NEEDS_LEGACY_FIELD_IDS) {
    delete (next as Record<string, unknown>)[id]
  }
  return next
}

/** Normalize answers before PDF / admin checks (legacy migration, no mutation of source). */
export function hydrateSntAnswers(answers: Answers): Answers {
  return migrateLegacySntAnswers(answers) ?? answers
}

/** Rows with every required field — used for PDF output only. */
export function parseCompleteSntTrustRows(answers: Answers): SntTrustRow[] {
  return parseSntTrustRows(hydrateSntAnswers(answers)).filter(isCompleteSntRow)
}

export function wantsSpecialNeedsTrust(answers: Answers) {
  return str(answers.wants_snt) === 'yes'
}

export function sntClauseHasPlaceholderMarkers(text: string): boolean {
  return SNT_PDF_PLACEHOLDER_MARKERS.some((marker) => text.includes(marker))
}

/** Throws when SNT is enabled but PDF-ready rows or clause text are missing. */
export function assertSntAnswersReadyForPdf(answers: Answers): void {
  if (!wantsSpecialNeedsTrust(answers)) return

  const hydrated = hydrateSntAnswers(answers)
  const allRows = parseSntTrustRows(hydrated)
  const completeRows = allRows.filter(isCompleteSntRow)

  if (completeRows.length === 0) {
    throw new SntPdfNotReadyError(
      'Special needs trust is enabled, but beneficiary, trustee, successor trustee, remainder, and contingent remainder must all be completed before generating the will.',
    )
  }

  if (completeRows.length < allRows.length) {
    throw new SntPdfNotReadyError(
      'One or more special needs trust beneficiaries have incomplete information. Complete every trust card or remove empty beneficiaries.',
    )
  }

  const clause = specialNeedsTrustClauseText(hydrated)
  if (!clause.trim()) {
    throw new SntPdfNotReadyError(
      'Special needs trust is enabled, but no trust article could be generated from the saved answers.',
    )
  }

  if (sntClauseHasPlaceholderMarkers(clause)) {
    throw new SntPdfNotReadyError(
      'Special needs trust language still contains placeholder text. Regenerate the will from current answers before sending.',
    )
  }
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

/** Testamentary SNT — one trust article per complete beneficiary row. */
function buildSntArticleFromRow(row: SntTrustRow): SpecialNeedsArticle {
  if (!isCompleteSntRow(row)) {
    throw new SntPdfNotReadyError(
      'Cannot build a special needs trust article until beneficiary, trustee, successor trustee, remainder, and contingent remainder are all filled in.',
    )
  }

  const beneficiary = plain(str(row.beneficiary_name))
  const first = firstName(beneficiary) || 'Beneficiary'
  const trustee = plain(str(row.trustee_name))
  const successor = plain(str(row.successor_trustee_name))
  const remainder = plain(str(row.remainder))
  const contingent = plain(str(row.contingent_remainder))
  const notes = plain(str(row.trustee_notes))

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

  return {
    heading: `SPECIAL NEEDS TRUST FOR ${beneficiary.toUpperCase()}`,
    paragraphs,
  }
}

export function buildSpecialNeedsArticles(answers: Answers): SpecialNeedsArticle[] {
  if (!wantsSpecialNeedsTrust(answers)) return []
  return parseCompleteSntTrustRows(answers).map((row) => buildSntArticleFromRow(row))
}

export function buildSpecialNeedsTrustArticle(answers: Answers): SpecialNeedsArticle | null {
  const articles = buildSpecialNeedsArticles(answers)
  return articles[0] ?? null
}

export function specialNeedsTrustClauseText(answers: Answers): string {
  const articles = buildSpecialNeedsArticles(hydrateSntAnswers(answers))
  if (articles.length === 0) return ''
  return articles
    .map((article) => `**ARTICLE — ${article.heading}**\n\n${article.paragraphs.join('\n\n')}`)
    .join('\n\n')
}

export function residuarySpecialNeedsNote(answers: Answers): string | null {
  if (!wantsSpecialNeedsTrust(answers)) return null
  const rows = parseCompleteSntTrustRows(answers)
  if (rows.length === 0) return null
  return rows
    .map((row) => {
      const beneficiary = `**${plain(str(row.beneficiary_name))}**`
      return `Any share that would otherwise pass outright to ${beneficiary} shall instead be held and administered under the Special Needs Trust established in this Will for ${beneficiary}, and shall not be distributed to ${beneficiary} free of trust.`
    })
    .join('\n\n')
}
