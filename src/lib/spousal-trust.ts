type Answers = Record<string, unknown>

function str(v: unknown) {
  return typeof v === 'string' ? v.trim() : ''
}

export type SpousalTrusteeMode = 'sole' | 'co_trustee'

/** Format remainder child names the way Scott's template lists them. */
export function formatPriorChildrenList(names: string[]): string {
  if (names.length === 0) return '[Child 1 Name] and [Child 2 Name]'
  if (names.length === 1) return names[0]!
  if (names.length === 2) return `${names[0]} and ${names[1]}`
  return `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`
}

/**
 * Scott-drafted Option 1 — surviving spouse as sole trustee.
 * Attorney language; do not paraphrase for production documents.
 */
export function buildSpousalTrustArticleSole(params: {
  testatorName: string
  spouseName: string
  alternateTrusteeName: string
  priorChildNames: string[]
}): { heading: string; paragraphs: string[] } {
  const trustName = `${params.testatorName} Family Trust`
  const childrenList = formatPriorChildrenList(params.priorChildNames)
  const alternate = params.alternateTrusteeName || '[Alternate Trustee Name]'

  return {
    heading: 'SPOUSAL TESTAMENTARY TRUST',
    paragraphs: [
      `Creation of Trust. If my spouse survives me, I give, devise, and bequeath my entire residuary estate to the Trustee named below, to be held, administered, and distributed in a separate trust for the primary benefit of my spouse, designated as the "${trustName}."`,
      `Appointment of Trustee. I appoint my spouse as the sole Trustee of the ${trustName}. If my spouse fails or ceases to serve for any reason, I appoint ${alternate} as successor Trustee. No Trustee serving under this Instrument shall be required to post bond or other security in any jurisdiction.`,
      `Lifetime Distributions to Spouse. (a) Mandatory Net Income: The Trustee shall pay to or apply for the benefit of my spouse all of the net income of the Trust, distributed at least annually or in more frequent installments. (b) Principal Discretion (HEMS Standard): The Trustee may pay to or apply for the benefit of my spouse so much of the trust principal as the Trustee deems necessary or advisable, in the Trustee's sole discretion, for my spouse's health, education, maintenance, and support in reasonable comfort (the "HEMS Standard"), taking into consideration any other financial resources known to the Trustee to be available to my spouse.`,
      `Termination and Remainder Distribution. Upon the death of my spouse, the ${trustName} shall terminate. The Trustee shall distribute the remaining trust principal and any accrued but undistributed net income in equal shares to my children from my prior relationship: ${childrenList}, per stirpes and not per capita.`,
      `Texas Statutory Administration Powers. (a) General Powers: Except as otherwise expressly provided herein, the Trustee shall have all administration powers granted to trustees under the Texas Trust Code (Texas Property Code § 111.001 et seq.), as amended, including full power to manage, invest, sell, lease, exchange, or encumber trust property. (b) Accounting: The Trustee shall render an annual accounting of trust transactions to the current income beneficiary and to any adult remainder beneficiaries who request such accounting in writing. The Trustee may fulfill this requirement by providing standard institution financial account statements in lieu of formal judicial accountings (Tex. Prop. Code § 113.151). (c) Principal and Income Allocations: The Trustee shall allocate receipts and expenses between principal and income in accordance with the Texas Uniform Principal and Income Act (Texas Property Code Chapter 116). (d) Non-Pro Rata Distributions: The Trustee may make distributions of trust assets in cash or in kind, or partly in each, and may make non-pro rata distributions among beneficiaries without obligation to make adjusted cash distributions to balance asset cost bases (Tex. Prop. Code § 113.027).`,
      `Trustee Exculpation. To the fullest extent permitted under Texas Property Code § 114.007, no Trustee shall be personally liable to any beneficiary or third party for any loss, damage, or depreciation in value of the trust estate resulting from any act, omission, or exercise of discretion made in good faith, except for losses resulting directly from such Trustee's gross negligence, willful misconduct, intentional fraud, or bad faith. The Trustee shall be entitled to full indemnification from the trust estate for all reasonable legal fees and expenses incurred in defending any action related to trust administration, provided the Trustee acted in good faith.`,
    ],
  }
}

/**
 * Scott-drafted Option 2 — spouse and child as co-trustees.
 * Attorney language; do not paraphrase for production documents.
 */
export function buildSpousalTrustArticleCoTrustee(params: {
  testatorName: string
  spouseName: string
  coTrusteeChildName: string
  successorCoTrusteeName: string
  remainderChildNames: string[]
}): { heading: string; paragraphs: string[] } {
  const trustName = `${params.testatorName} Family Trust`
  const childrenList = formatPriorChildrenList(params.remainderChildNames)
  const coChild = params.coTrusteeChildName || '[Child Name]'
  const successor = params.successorCoTrusteeName || '[Secondary Child/Alternate Name]'

  return {
    heading: 'SPOUSAL TESTAMENTARY TRUST (CO-TRUSTEE)',
    paragraphs: [
      `Creation of Trust. If my spouse survives me, I give, devise, and bequeath my entire residuary estate to the Co-Trustees named below, to be held, administered, and distributed in a separate trust for the primary benefit of my spouse, designated as the "${trustName}."`,
      `Appointment of Co-Trustees. I appoint my spouse and my child, ${coChild}, as Co-Trustees of the ${trustName}. (a) Unanimous Decision-Making: Except as otherwise expressly provided herein, all powers, duties, and discretionary authority granted to the Trustees shall be exercised only by the unanimous agreement of both Co-Trustees. (b) Successor Co-Trustee: If either Co-Trustee ceases or refuses to serve, ${successor} shall serve as successor Co-Trustee in their place. (c) Waiver of Bond: No Co-Trustee serving under this Instrument shall be required to post bond or other security in any jurisdiction (Tex. Prop. Code § 113.058).`,
      `Lifetime Distributions to Spouse. (a) Mandatory Net Income: The Co-Trustees shall pay to or apply for the benefit of my spouse all of the net income of the Trust, distributed at least annually or in more frequent installments. (b) Principal Discretion (HEMS Standard): The Co-Trustees may pay to or apply for the benefit of my spouse so much of the trust principal as is reasonably necessary for my spouse's health, education, maintenance, and support in reasonable comfort (HEMS Standard). In exercising this discretion, the Co-Trustees shall balance my primary intent to support my spouse during their lifetime with my secondary intent to preserve the principal for my surviving children from my prior relationship.`,
      `Termination and Remainder Distribution. Upon the death of my spouse, the ${trustName} shall terminate. The Co-Trustees shall distribute the remaining trust principal and any accrued but undistributed net income in equal shares to my children: ${childrenList}, per stirpes and not per capita.`,
      `Texas Statutory Administration Powers. (a) General Powers: The Co-Trustees shall possess all administration powers granted to trustees under the Texas Trust Code (Texas Property Code § 111.001 et seq.), including full power to manage, invest, sell, lease, exchange, or encumber trust property. (b) Duty to Account: The Co-Trustees shall render an annual accounting of trust transactions to my spouse and to the adult remainder beneficiaries (Tex. Prop. Code § 113.151). Providing financial account statements from financial institutions shall satisfy this requirement. (c) Principal and Income Allocations: Receipts and expenses shall be allocated between principal and income pursuant to the Texas Uniform Principal and Income Act (Texas Property Code Chapter 116). (d) In-Kind / Non-Pro Rata Distributions: The Co-Trustees may make distributions of trust assets in cash or in kind, or partly in each, and make non-pro rata distributions among beneficiaries without cash adjustments for tax cost bases (Tex. Prop. Code § 113.027).`,
      `Co-Trustee Exculpation and Discretionary Protection. Pursuant to Texas Property Code § 114.007, no Co-Trustee shall be held individually liable for any action taken, decision made, or failure to act in connection with the administration of this Trust—including discretionary principal distributions under the HEMS standard—except in instances of gross negligence, intentional fraud, or bad faith. In exercising discretion regarding principal distributions to my spouse, the Co-Trustees shall be fully protected so long as such decision was made in good faith under the HEMS standard, notwithstanding any resulting reduction in the remaining corpus available to remainder beneficiaries.`,
    ],
  }
}

export function priorChildNamesFromAnswers(answers: Answers): string[] {
  const named = str(answers.spousal_trust_remainder_children)
  if (named) {
    return named
      .split(/[,;\n]+/)
      .map((s) => s.trim())
      .filter(Boolean)
  }
  const children = answers.children
  if (!Array.isArray(children)) return []
  return children
    .map((row) => {
      if (!row || typeof row !== 'object') return ''
      return str((row as { name?: string }).name)
    })
    .filter(Boolean)
}

export function spousalTrusteeMode(answers: Answers): SpousalTrusteeMode {
  return str(answers.spousal_trust_trustee_mode) === 'co_trustee' ? 'co_trustee' : 'sole'
}

export function buildSpousalTrustFromAnswers(answers: Answers) {
  const testatorName = str(answers.legal_full_name) || '[Testator Name]'
  const spouseName = str(answers.spouse_full_name) || '[Spouse Name]'
  const priorChildren = priorChildNamesFromAnswers(answers)
  const mode = spousalTrusteeMode(answers)

  if (mode === 'co_trustee') {
    return buildSpousalTrustArticleCoTrustee({
      testatorName,
      spouseName,
      coTrusteeChildName: str(answers.spousal_trust_co_trustee_name),
      successorCoTrusteeName: str(answers.spousal_trust_successor_trustee_name),
      remainderChildNames: priorChildren,
    })
  }

  return buildSpousalTrustArticleSole({
    testatorName,
    spouseName,
    alternateTrusteeName: str(answers.spousal_trust_alternate_trustee_name),
    priorChildNames: priorChildren,
  })
}

/** Residuary pour-over when spousal testamentary trust is ordered. */
export function spousalTrustResiduaryText(answers: Answers, testatorName: string): string {
  const trustName = `${testatorName} Family Trust`
  const spouse = str(answers.spouse_full_name) || 'my spouse'
  return (
    `If ${spouse} survives me, I give, devise, and bequeath my entire residuary estate to the Trustee named in the Spousal Testamentary Trust article of this Will, to be held, administered, and distributed under the "${trustName}" as provided in that article. ` +
    `If my spouse does not survive me, my residuary estate shall pass as otherwise provided in this Will.`
  )
}

export function orderHasSpousalTrust(addOns: unknown): boolean {
  const o = (addOns ?? {}) as { spousal_trust?: boolean }
  return Boolean(o.spousal_trust)
}
