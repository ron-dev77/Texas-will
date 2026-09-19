import {
  parseSkeletonBody,
  serializeSkeletonDoc,
  type SkeletonBlock,
  type SkeletonDoc,
} from '@/lib/skeleton-doc'
import {
  RON_ARTICLE_II_TAX_ELECTIONS,
  RON_ARTICLE_III_DEBTS_TAXES,
} from '@/lib/spousal-residuary-article-v'

/**
 * Production-ready Texas Last Will skeleton.
 * Placeholders use {{field_id}} / {{clause_*}}; filled names render bold in PDF.
 * Attorneys should only need minor edits after questionnaire fill.
 */
export function buildDefaultWillSkeletonDoc(): SkeletonDoc {
  let n = 0
  const blk = (
    partial: Partial<SkeletonBlock> & { kind: SkeletonBlock['kind'] },
  ): SkeletonBlock => ({
    id: `will_${++n}`,
    kind: partial.kind,
    heading: partial.heading ?? '',
    body: partial.body ?? '',
    label: partial.label ?? 'Signature',
    leftLabel: partial.leftLabel ?? 'Signature of Witness 1',
    rightLabel: partial.rightLabel ?? 'Signature of Witness 2',
    align: partial.align ?? 'left',
    blankLinesAfter: partial.blankLinesAfter ?? 0,
    pageBreakBefore: partial.pageBreakBefore ?? false,
    headingBold: partial.headingBold === false ? false : true,
  })

  return {
    title: 'LAST WILL OF {{legal_full_name}}',
    pageSize: 'A4',
    blocks: [
      blk({
        kind: 'paragraph',
        body: '{{clause_will_opening}}',
        blankLinesAfter: 2,
      }),

      blk({
        kind: 'heading',
        heading: 'ARTICLE I — IDENTIFICATION AND FAMILY',
        align: 'center',
        blankLinesAfter: 1,
      }),
      blk({
        kind: 'paragraph',
        body: '**1.1 Marital Status.** {{clause_marital}}',
        blankLinesAfter: 1,
      }),
      blk({
        kind: 'paragraph',
        body: '**1.2 Children.** {{clause_children}}',
        blankLinesAfter: 1,
      }),
      blk({
        kind: 'paragraph',
        body: '**1.3 After-Born Children.** Any child born to or legally adopted by me after the execution of this Will shall share in my estate as provided herein.',
        blankLinesAfter: 1,
      }),

      blk({
        kind: 'heading',
        heading: 'ARTICLE II — EXECUTOR',
        align: 'center',
        blankLinesAfter: 1,
      }),
      blk({
        kind: 'paragraph',
        body: '**2.1 Appointment of Executor.** {{clause_executor_appointment}}',
        blankLinesAfter: 1,
      }),
      blk({
        kind: 'paragraph',
        body: '**2.2 Independent Administration.** I direct that no action shall be had in any court in the administration of my estate other than the probating and recording of this Will and the return of any required inventory, appraisement, and list of claims. My Executor shall serve without bond.',
        blankLinesAfter: 1,
      }),
      blk({
        kind: 'paragraph',
        body: '**2.3 Executor Powers.** My Executor shall have full power to sell, lease, mortgage, invest, and reinvest assets of my estate; to pay debts, taxes, and expenses of administration; to compromise claims; and to do all acts necessary for the proper settlement of my estate without court approval, as permitted under the **Texas Estates Code**.',
        blankLinesAfter: 1,
      }),
      blk({
        kind: 'paragraph',
        body: RON_ARTICLE_II_TAX_ELECTIONS,
        blankLinesAfter: 1,
      }),

      blk({
        kind: 'heading',
        heading: 'ARTICLE III — PAYMENT OF DEBTS, EXPENSES, AND TAXES',
        align: 'center',
        blankLinesAfter: 1,
      }),
      blk({
        kind: 'paragraph',
        body: RON_ARTICLE_III_DEBTS_TAXES,
        blankLinesAfter: 1,
      }),

      blk({
        kind: 'heading',
        heading: 'ARTICLE IV — SPECIFIC BEQUESTS',
        align: 'center',
        blankLinesAfter: 1,
      }),
      blk({
        kind: 'paragraph',
        body: '**4.1 Specific Bequests.** {{clause_specific_bequests}}',
        blankLinesAfter: 1,
      }),
      blk({
        kind: 'paragraph',
        body: '**4.2 Lapse.** If any beneficiary of a specific bequest predeceases me, that bequest shall lapse and become part of the residuary estate unless otherwise stated herein.',
        blankLinesAfter: 1,
      }),
      blk({
        kind: 'paragraph',
        body: '**4.3 Charitable Gifts.** {{clause_charitable}}',
        blankLinesAfter: 1,
      }),
      blk({
        kind: 'paragraph',
        body: '**4.4 Charitable Lapse.** If any charitable organization named herein is not in existence or is not a qualified charitable organization at my death, that gift shall lapse and become part of the residuary estate unless otherwise stated herein.',
        blankLinesAfter: 1,
      }),

      blk({
        kind: 'heading',
        heading: '{{clause_residuary_article_heading}}',
        align: 'center',
        blankLinesAfter: 1,
      }),
      blk({
        kind: 'paragraph',
        body: '{{clause_residuary}}',
        blankLinesAfter: 1,
      }),
      blk({
        kind: 'paragraph',
        body: '{{clause_children_residuary_trust}}',
        blankLinesAfter: 1,
      }),
      blk({
        kind: 'paragraph',
        body: '{{clause_special_needs_trust}}',
        blankLinesAfter: 1,
      }),

      blk({
        kind: 'paragraph',
        body: '{{clause_guardian}}',
        blankLinesAfter: 1,
      }),

      blk({
        kind: 'heading',
        heading: '{{clause_article_vii_simultaneous_death_heading}}',
        align: 'center',
        blankLinesAfter: 1,
      }),
      blk({
        kind: 'paragraph',
        body: 'If any beneficiary and I die simultaneously, or if it cannot be established by clear and convincing evidence that the beneficiary survived me, I shall be deemed to have survived that beneficiary for purposes of this Will.',
        blankLinesAfter: 1,
      }),

      blk({
        kind: 'heading',
        heading: '{{clause_article_viii_no_contest_heading}}',
        align: 'center',
        blankLinesAfter: 1,
      }),
      blk({
        kind: 'paragraph',
        body: 'If any beneficiary under this Will contests this Will or any of its provisions, any share or interest in my estate given to that contesting beneficiary under this Will is revoked and shall be disposed of as if that contesting beneficiary had predeceased me without descendants.',
        blankLinesAfter: 1,
      }),

      blk({
        kind: 'heading',
        heading: '{{clause_article_ix_final_wishes_heading}}',
        align: 'center',
        blankLinesAfter: 1,
      }),
      blk({
        kind: 'paragraph',
        body: '{{clause_final_wishes}}',
        blankLinesAfter: 1,
      }),

      blk({
        kind: 'heading',
        heading: '{{clause_article_x_general_provisions_heading}}',
        align: 'center',
        blankLinesAfter: 1,
        pageBreakBefore: true,
      }),
      blk({
        kind: 'paragraph',
        body: '**10.1 Governing Law.** This Will shall be governed by and construed in accordance with the laws of the **State of Texas**.',
        blankLinesAfter: 1,
      }),
      blk({
        kind: 'paragraph',
        body: '**10.2 Severability.** If any provision of this Will is held invalid or unenforceable, the remaining provisions shall continue in full force and effect.',
        blankLinesAfter: 1,
      }),
      blk({
        kind: 'paragraph',
        body: '**10.3 Gender and Number.** As used in this Will, the masculine, feminine, and neuter genders, and the singular and plural numbers, shall each include the others whenever the context so indicates.',
        blankLinesAfter: 1,
      }),

      blk({ kind: 'page_break', blankLinesAfter: 0 }),
      blk({
        kind: 'heading',
        heading: 'SIGNATURE OF TESTATOR',
        align: 'center',
        blankLinesAfter: 1,
      }),
      blk({
        kind: 'paragraph',
        body: 'I, **{{legal_full_name}}**, the Testator, sign my name to this instrument, this ______ day of __________________, 20_____, and being first duly sworn, do declare to the undersigned authority that I sign and execute this instrument as my Last Will and that I sign it willingly, that I execute it as my free and voluntary act for the purposes therein expressed, and that I am eighteen years of age or older, of sound mind, and under no constraint or undue influence.',
        blankLinesAfter: 1,
      }),
      blk({
        kind: 'signature',
        label: 'Signature of Testator',
        align: 'center',
        blankLinesAfter: 1,
      }),
      blk({
        kind: 'signature',
        label: 'Printed Name',
        align: 'center',
        blankLinesAfter: 2,
      }),

      blk({
        kind: 'heading',
        heading: 'WITNESSES',
        align: 'center',
        blankLinesAfter: 1,
      }),
      blk({
        kind: 'paragraph',
        body: "We, the undersigned witnesses, each being competent to be a witness and sign our names to this instrument, being first duly sworn, do declare to the undersigned authority that the Testator signs and executes this instrument as the Testator's Last Will and that the Testator signs it willingly, and that each of us, in the presence and hearing of the Testator and in the presence of each other, hereby signs this Will as witness to the Testator's signing, and that to the best of our knowledge the Testator is eighteen years of age or older, of sound mind, and under no constraint or undue influence.",
        blankLinesAfter: 1,
      }),
      blk({
        kind: 'paragraph',
        body: '**IMPORTANT:** Neither witness may be a beneficiary named in this Will. Both witnesses must be present at the same time when the Testator signs.',
        blankLinesAfter: 0,
      }),
      blk({
        kind: 'signature_pair',
        leftLabel: 'Signature of Witness 1',
        rightLabel: 'Signature of Witness 2',
        blankLinesAfter: 0,
      }),
      blk({
        kind: 'signature_pair',
        leftLabel: 'Printed Name',
        rightLabel: 'Printed Name',
        blankLinesAfter: 0,
      }),
      blk({
        kind: 'signature_pair',
        leftLabel: 'Address',
        rightLabel: 'Address',
        blankLinesAfter: 1,
      }),

      blk({
        kind: 'heading',
        heading: 'SELF-PROVING AFFIDAVIT',
        align: 'center',
        blankLinesAfter: 0,
        pageBreakBefore: true,
      }),
      blk({
        kind: 'paragraph',
        body: '(Texas Estates Code Section **251.104**)',
        align: 'center',
        blankLinesAfter: 1,
      }),
      blk({
        kind: 'paragraph',
        body: '**STATE OF TEXAS**\n**COUNTY OF** ____________________________',
        blankLinesAfter: 1,
      }),
      blk({
        kind: 'paragraph',
        body: "Before me, the undersigned authority, on this day personally appeared **{{legal_full_name}}**, the Testator, and ____________________________ and ____________________________, Witnesses, known to me to be the Testator and the witnesses whose names are signed to the foregoing instrument, and all being duly sworn, the Testator declared to me and to the witnesses that the foregoing instrument is the Testator's Last Will and Testament and that the Testator had willingly signed and executed it as the Testator's free and voluntary act for the purposes therein expressed. Each of the witnesses stated that the witness signed the Will as witness in the presence and hearing of the Testator and that to the best of the witness's knowledge, the Testator was eighteen years of age or older, of sound mind, and under no constraint or undue influence.",
        blankLinesAfter: 1,
      }),
      blk({
        kind: 'signature',
        label: 'Signature of Testator',
        align: 'left',
        blankLinesAfter: 1,
      }),
      blk({
        kind: 'signature_pair',
        leftLabel: 'Signature of Witness 1',
        rightLabel: 'Signature of Witness 2',
        blankLinesAfter: 2,
      }),

      blk({
        kind: 'heading',
        heading: 'NOTARY ACKNOWLEDGMENT',
        align: 'center',
        blankLinesAfter: 1,
      }),
      blk({
        kind: 'paragraph',
        body: 'Subscribed and sworn to before me by the said __________________, Testator, and by the said __________________ and __________________, witnesses, this ______ day of __________________, 20_____.',
        blankLinesAfter: 1,
      }),
      blk({
        kind: 'signature',
        label: 'Notary Public, State of Texas',
        align: 'right',
        blankLinesAfter: 1,
      }),
      blk({
        kind: 'signature',
        label: 'My Commission Expires',
        align: 'right',
        blankLinesAfter: 1,
      }),
      blk({
        kind: 'paragraph',
        body: '[NOTARY SEAL]',
        blankLinesAfter: 0,
      }),
    ],
  }
}

/** Serialized v2 body for DB / bundled default. */
export const DEFAULT_WILL_SKELETON_BODY = serializeSkeletonDoc(buildDefaultWillSkeletonDoc())

/** Insert Scott 2.4 Tax Elections after 2.3 when an saved skeleton predates the bundled block. */
export function mergeArticleIITaxElectionsSkeletonBody(body: string): string {
  if (!body.trim() || /2\.4 Tax Elections/i.test(body)) return body
  let doc: SkeletonDoc
  try {
    doc = parseSkeletonBody(body)
  } catch {
    return body
  }
  const idx = doc.blocks.findIndex(
    (b) => b.kind === 'paragraph' && /\*\*2\.3 Executor Powers\.\*\*/i.test(b.body),
  )
  if (idx < 0) return body
  const taxBlock: SkeletonBlock = {
    id: `will_ii_tax_${idx + 1}`,
    kind: 'paragraph',
    heading: '',
    body: RON_ARTICLE_II_TAX_ELECTIONS,
    label: 'Signature',
    leftLabel: 'Signature of Witness 1',
    rightLabel: 'Signature of Witness 2',
    align: 'left',
    blankLinesAfter: 1,
    pageBreakBefore: false,
    headingBold: true,
  }
  doc.blocks.splice(idx + 1, 0, taxBlock)
  return serializeSkeletonDoc(doc)
}

/** True when stored body is still the old bracket / plain-text AI skeleton. */
export function isLegacyWillSkeleton(body: string | null | undefined): boolean {
  const t = (body ?? '').trim()
  if (!t) return true
  if (t.includes('[FULL LEGAL NAME]') || t.includes('[SELECT ONE:')) return true
  if (!t.includes('texas-will-skeleton-v2')) return true
  return false
}

/** Default form still has stacked (one-column) witness signature lines. */
export function needsWitnessTwoColumnUpgrade(body: string | null | undefined): boolean {
  const t = body ?? ''
  return /"kind":\s*"signature"[\s\S]{0,220}"label":\s*"Signature of Witness 1"/.test(t)
}

/** Notary / commission lines still left-aligned on will skeleton. */
export function needsWillNotaryRightAlign(body: string | null | undefined): boolean {
  const t = body ?? ''
  if (!/"label":\s*"Notary Public, State of Texas"/.test(t)) return false
  if (!/"label":\s*"Notary Public, State of Texas"[\s\S]{0,120}"align":\s*"right"/.test(t)) return true
  if (
    /"label":\s*"My Commission Expires"/.test(t) &&
    !/"label":\s*"My Commission Expires"[\s\S]{0,120}"align":\s*"right"/.test(t)
  ) {
    return true
  }
  return false
}

/** General provisions article still starts mid-page (orphans the heading). */
export function needsArticleXPageBreak(body: string | null | undefined): boolean {
  const t = body ?? ''
  const articleMatch = t.match(/ARTICLE (X|XI)\s*[—\-]\s*GENERAL PROVISIONS/i)
  if (!articleMatch) return false
  const num = articleMatch[1]!.toUpperCase()
  return !new RegExp(
    `"heading":\\s*"ARTICLE ${num}[^"]*"[\\s\\S]{0,160}"pageBreakBefore":\\s*true`,
  ).test(t)
}

/** Notary Public / Commission Expires lines were too tight for signing. */
export function needsNotarySignatureSpacing(body: string | null | undefined): boolean {
  const t = body ?? ''
  if (!/"label":\s*"Notary Public, State of Texas"/.test(t)) return false
  if (!/"label":\s*"My Commission Expires"/.test(t)) return false
  return /"label":\s*"Notary Public, State of Texas"[\s\S]{0,120}"blankLinesAfter":\s*0/.test(t)
}

/** Refresh bundled default will skeleton when outdated. */
export function needsDefaultWillSkeletonRefresh(body: string | null | undefined): boolean {
  const t = body ?? ''
  return (
    isLegacyWillSkeleton(body) ||
    needsWitnessTwoColumnUpgrade(body) ||
    needsWillNotaryRightAlign(body) ||
    needsArticleXPageBreak(body) ||
    needsNotarySignatureSpacing(body) ||
    !t.includes('{{clause_special_needs_trust}}') ||
    !t.includes('{{clause_charitable}}') ||
    !t.includes('{{clause_will_opening}}') ||
    !t.includes('{{clause_residuary_article_heading}}') ||
    !t.includes('{{clause_children_residuary_trust}}') ||
    !t.includes('{{clause_article_vii_simultaneous_death_heading}}') ||
    !/LAST WILL OF/i.test(t) ||
    /ARTICLE VI\s*[—\-]\s*RESIDUARY/i.test(t) ||
    /ARTICLE V\s*[—\-]\s*CHARITABLE/i.test(t) ||
    (/ARTICLE III\s*[—\-]\s*PAYMENT OF DEBTS, EXPENSES, AND TAXES/i.test(t) &&
      !/3\.1 Death Tax/i.test(t)) ||
    /"heading"\s*:\s*"PREAMBLE"/i.test(t) ||
    !/2\.4 Tax Elections/i.test(t)
  )
}
