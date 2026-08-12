import { serializeSkeletonDoc, type SkeletonBlock, type SkeletonDoc } from '@/lib/skeleton-doc'

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
  })

  return {
    title: 'LAST WILL AND TESTAMENT',
    pageSize: 'A4',
    blocks: [
      blk({
        kind: 'heading',
        heading: 'PREAMBLE',
        align: 'center',
        blankLinesAfter: 1,
      }),
      blk({
        kind: 'paragraph',
        body: 'I, **{{legal_full_name}}**, a resident of **{{address_county}}** County, Texas, being of sound and disposing mind and memory, and being eighteen (18) years of age or older, do hereby make, publish, and declare this to be my Last Will and Testament, hereby revoking any and all former wills and codicils made by me at any time heretofore.',
        blankLinesAfter: 1,
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
        kind: 'heading',
        heading: 'ARTICLE III — PAYMENT OF DEBTS AND EXPENSES',
        align: 'center',
        blankLinesAfter: 1,
      }),
      blk({
        kind: 'paragraph',
        body: 'I direct my Executor to pay all of my just debts, funeral expenses, and costs of administering my estate as soon as reasonably practicable after my death, to the extent my estate has sufficient assets.',
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
        kind: 'heading',
        heading: 'ARTICLE V — RESIDUARY ESTATE',
        align: 'center',
        blankLinesAfter: 1,
      }),
      blk({
        kind: 'paragraph',
        body: '**5.1 Disposition of Residuary Estate.** {{clause_residuary}}',
        blankLinesAfter: 1,
      }),
      blk({
        kind: 'paragraph',
        body: '**5.2 Survival.** If any beneficiary under this Will fails to survive me by thirty (30) days, that beneficiary shall be deemed to have predeceased me for all purposes of this Will.',
        blankLinesAfter: 1,
      }),

      blk({
        kind: 'paragraph',
        body: '{{clause_guardian}}',
        blankLinesAfter: 1,
      }),

      blk({
        kind: 'heading',
        heading: 'ARTICLE VII — SIMULTANEOUS DEATH',
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
        heading: 'ARTICLE VIII — NO CONTEST',
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
        heading: 'ARTICLE IX — FINAL WISHES',
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
        heading: 'ARTICLE X — GENERAL PROVISIONS',
        align: 'center',
        blankLinesAfter: 1,
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
        blankLinesAfter: 1,
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
        blankLinesAfter: 2,
      }),

      blk({
        kind: 'heading',
        heading: 'SELF-PROVING AFFIDAVIT',
        align: 'center',
        blankLinesAfter: 0,
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
        blankLinesAfter: 0,
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

/** Refresh bundled default will skeleton when outdated. */
export function needsDefaultWillSkeletonRefresh(body: string | null | undefined): boolean {
  return (
    isLegacyWillSkeleton(body) ||
    needsWitnessTwoColumnUpgrade(body) ||
    needsWillNotaryRightAlign(body)
  )
}
