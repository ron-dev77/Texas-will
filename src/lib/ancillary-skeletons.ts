import type { AncillaryKind } from '@/lib/document-kinds'

type BlockInput = {
  id: string
  kind: 'heading' | 'paragraph' | 'signature' | 'signature_pair' | 'spacer'
  heading?: string
  body?: string
  label?: string
  leftLabel?: string
  rightLabel?: string
  align?: 'left' | 'center' | 'right'
  blankLinesAfter?: number
  pageBreakBefore?: boolean
  headingBold?: boolean
}

/** Bump when bundled ancillary copy changes so default forms auto-refresh. */
export const ANCILLARY_TEMPLATE = 'ancillary-v6'

function pack(title: string, blocks: BlockInput[]): string {
  const full = blocks.map((b) => ({
    id: b.id,
    kind: b.kind,
    heading: b.heading ?? '',
    body: b.body ?? '',
    label: b.label ?? '',
    leftLabel: b.leftLabel ?? '',
    rightLabel: b.rightLabel ?? '',
    align: b.align ?? 'left',
    blankLinesAfter: b.blankLinesAfter ?? 1,
    pageBreakBefore: b.pageBreakBefore ?? false,
    headingBold: b.headingBold === false ? false : true,
  }))
  return `<!-- texas-will-skeleton-v2 -->
${JSON.stringify(
  { version: 2, template: ANCILLARY_TEMPLATE, title, pageSize: 'A4', blocks: full },
  null,
  2,
)}
`
}

export const BUNDLED_MPOA_SKELETON = pack('MEDICAL POWER OF ATTORNEY', [
  {
    id: 'm-intro',
    kind: 'paragraph',
    body:
      'This Medical Power of Attorney is made under **Chapter 166 of the Texas Health and Safety Code**. It authorizes my agent to make health care decisions for me if my attending physician certifies in writing that I am unable to make those decisions myself.',
    blankLinesAfter: 0,
  },
  {
    id: 'm-principal',
    kind: 'paragraph',
    body:
      'I, **{{legal_full_name}}**, of sound mind and acting voluntarily, appoint the person named below as my agent to make any and all health care decisions for me, except to the extent I state otherwise in this document.',
    blankLinesAfter: 0,
  },
  {
    id: 'm-agent-h',
    kind: 'heading',
    heading: '1. APPOINTMENT OF AGENT',
    align: 'left',
    blankLinesAfter: 0,
  },
  {
    id: 'm-agent',
    kind: 'paragraph',
    body:
      '**Primary agent:** {{mpoa_agent_name}}\n**Relationship:** {{mpoa_agent_relationship}}\n**Telephone:** {{mpoa_agent_phone}}',
    blankLinesAfter: 0,
  },
  {
    id: 'm-alt',
    kind: 'paragraph',
    body:
      '**Alternate agent** (if my primary agent is unable, unwilling, or unavailable to serve):\n**Name:** {{mpoa_alt_agent_name}}\n**Telephone:** {{mpoa_alt_agent_phone}}',
    blankLinesAfter: 0,
  },
  {
    id: 'm-scope-h',
    kind: 'heading',
    heading: '2. AUTHORITY AND EFFECT',
    align: 'left',
    blankLinesAfter: 0,
  },
  {
    id: 'm-scope',
    kind: 'paragraph',
    body:
      'My agent’s authority becomes effective when my attending physician certifies that I lack capacity to make my own health care decisions. My agent shall make decisions in accordance with my known wishes, including any wishes I express in this document or in a Directive to Physicians. If my wishes are unknown, my agent shall decide in my best interest. This document does not authorize my agent to make decisions that I could not make myself under Texas law.',
    blankLinesAfter: 0,
  },
  {
    id: 'm-sig-h',
    kind: 'heading',
    heading: 'SIGNATURE OF PRINCIPAL',
    align: 'center',
    blankLinesAfter: 0,
  },
  {
    id: 'm-sig-txt',
    kind: 'paragraph',
    body:
      'I understand the purpose and effect of this Medical Power of Attorney. I sign my name on this ______ day of __________________, 20_____.',
    blankLinesAfter: 1,
  },
  {
    id: 'm-sig',
    kind: 'signature',
    label: 'Signature of Principal',
    align: 'center',
    blankLinesAfter: 1,
  },
  {
    id: 'm-notary-h',
    kind: 'heading',
    heading: 'NOTARY ACKNOWLEDGMENT',
    align: 'center',
    blankLinesAfter: 0,
  },
  {
    id: 'm-notary',
    kind: 'paragraph',
    body:
      '**STATE OF TEXAS**\n**COUNTY OF** ____________________________\n\nThis instrument was acknowledged before me on this ______ day of __________________, 20_____, by **{{legal_full_name}}**.',
    blankLinesAfter: 1,
  },
  {
    id: 'm-notary-sig',
    kind: 'signature',
    label: 'Notary Public, State of Texas',
    align: 'right',
    blankLinesAfter: 0,
  },
])

export const BUNDLED_DPOA_SKELETON = pack('STATUTORY DURABLE POWER OF ATTORNEY', [
  {
    id: 'd-intro',
    kind: 'paragraph',
    body:
      'This Statutory Durable Power of Attorney is intended for use under the **Texas Estates Code**. It grants my agent authority to act for me in property and financial matters. Unless I limit the powers below, my agent may exercise any authority a principal may grant an agent under Texas law.',
    blankLinesAfter: 1,
  },
  {
    id: 'd-principal',
    kind: 'paragraph',
    body:
      'I, **{{legal_full_name}}**, appoint **{{dpoa_agent_name}}** as my agent to act for me in any lawful way with respect to the subjects listed in this document.',
    blankLinesAfter: 1,
  },
  {
    id: 'd-agent-h',
    kind: 'heading',
    heading: '1. AGENT INFORMATION',
    align: 'left',
    blankLinesAfter: 1,
  },
  {
    id: 'd-agent',
    kind: 'paragraph',
    body:
      '**Relationship to me:** {{dpoa_agent_relationship}}\n**Agent telephone:** {{dpoa_agent_phone}}\n\n**Alternate agent:** {{dpoa_alt_agent_name}}',
    blankLinesAfter: 1,
  },
  {
    id: 'd-effect-h',
    kind: 'heading',
    heading: '2. EFFECTIVENESS AND DURABILITY',
    align: 'left',
    blankLinesAfter: 1,
  },
  {
    id: 'd-effect',
    kind: 'paragraph',
    body:
      '**When this power becomes effective:** {{dpoa_when_effective}}\n\nThis power of attorney is **durable**. It is not affected by my subsequent disability or incapacity. My agent shall act in my best interest, keep accurate records, and avoid conflicts of interest to the extent required by law.',
    blankLinesAfter: 2,
  },
  {
    id: 'd-sig-h',
    kind: 'heading',
    heading: 'SIGNATURE OF PRINCIPAL',
    align: 'center',
    blankLinesAfter: 1,
  },
  {
    id: 'd-sig-txt',
    kind: 'paragraph',
    body:
      'I understand that this document gives my agent broad powers over my property. I sign my name on this ______ day of __________________, 20_____.',
    blankLinesAfter: 1,
  },
  {
    id: 'd-sig',
    kind: 'signature',
    label: 'Signature of Principal',
    align: 'center',
    blankLinesAfter: 1,
  },
  {
    id: 'd-notary-h',
    kind: 'heading',
    heading: 'NOTARY ACKNOWLEDGMENT',
    align: 'center',
    blankLinesAfter: 0,
  },
  {
    id: 'd-notary',
    kind: 'paragraph',
    body:
      '**STATE OF TEXAS**\n**COUNTY OF** ____________________________\n\nThis instrument was acknowledged before me on this ______ day of __________________, 20_____, by **{{legal_full_name}}**.',
    blankLinesAfter: 1,
  },
  {
    id: 'd-notary-sig',
    kind: 'signature',
    label: 'Notary Public, State of Texas',
    align: 'right',
    blankLinesAfter: 0,
  },
])

export const BUNDLED_DIRECTIVE_SKELETON = pack(
  'DIRECTIVE TO PHYSICIANS AND FAMILY OR SURROGATES',
  [
    {
      id: 'dir-intro',
      kind: 'paragraph',
      body:
        'This Directive is made under **Chapter 166 of the Texas Health and Safety Code**. It states my wishes about life-sustaining treatment if I am in a terminal or irreversible condition and cannot make my own medical decisions. It is intended to guide my physicians, family, and any surrogate or medical agent.',
      blankLinesAfter: 1,
    },
    {
      id: 'dir-declarant',
      kind: 'paragraph',
      body:
        'I, **{{legal_full_name}}**, being of sound mind, willfully and voluntarily make this Directive to provide health care instructions if I can no longer decide for myself.',
      blankLinesAfter: 1,
    },
    {
      id: 'dir-pref-h',
      kind: 'heading',
      heading: '1. TREATMENT PREFERENCE',
      align: 'left',
      blankLinesAfter: 1,
    },
    {
      id: 'dir-pref',
      kind: 'paragraph',
      body: '**My treatment preference:** {{directive_preference}}',
      blankLinesAfter: 1,
    },
    {
      id: 'dir-notes-h',
      kind: 'heading',
      heading: '2. ADDITIONAL WISHES',
      align: 'left',
      blankLinesAfter: 1,
    },
    {
      id: 'dir-notes',
      kind: 'paragraph',
      body:
        '{{directive_notes}}\n\nI direct my attending physician and other health care providers to follow this Directive. If any part of this Directive is held invalid, the remaining parts shall continue in effect.',
      blankLinesAfter: 2,
    },
    {
      id: 'dir-sig-h',
      kind: 'heading',
      heading: 'SIGNATURE OF DECLARANT',
      align: 'center',
      blankLinesAfter: 1,
    },
    {
      id: 'dir-sig-txt',
      kind: 'paragraph',
      body:
        'I understand the full importance of this Directive and I am emotionally and mentally competent to make this Directive. Signed on this ______ day of __________________, 20_____.',
      blankLinesAfter: 1,
    },
    {
      id: 'dir-sig',
      kind: 'signature',
      label: 'Signature of Declarant',
      align: 'center',
      blankLinesAfter: 1,
    },
    {
      id: 'dir-wit-h',
      kind: 'heading',
      heading: 'WITNESSES',
      align: 'center',
      blankLinesAfter: 0,
    },
    {
      id: 'dir-wit-txt',
      kind: 'paragraph',
      body:
        'We, the undersigned witnesses, declare that the Declarant signed this Directive in our presence, that the Declarant appears to be of sound mind and under no duress, fraud, or undue influence, and that we meet the qualifications required by Texas law for witnesses to a Directive to Physicians.',
      blankLinesAfter: 1,
    },
    {
      id: 'dir-wits',
      kind: 'signature_pair',
      leftLabel: 'Witness 1',
      rightLabel: 'Witness 2',
      blankLinesAfter: 0,
    },
  ],
)

export const BUNDLED_HIPAA_SKELETON = pack(
  'AUTHORIZATION FOR RELEASE OF\nPROTECTED HEALTH INFORMATION',
  [
    {
      id: 'h-intro',
      kind: 'paragraph',
      body:
        'This Authorization is given under the Health Insurance Portability and Accountability Act (**HIPAA**) and applicable Texas law. It permits my health care providers to disclose my protected health information to the persons I name below so they may assist with my care and health care decisions.',
      blankLinesAfter: 1,
    },
    {
      id: 'h-principal',
      kind: 'paragraph',
      body:
        'I, **{{legal_full_name}}**, authorize each of my health care providers to use and disclose my protected health information to the recipients described in this Authorization.',
      blankLinesAfter: 1,
    },
    {
      id: 'h-recip-h',
      kind: 'heading',
      heading: '1. AUTHORIZED RECIPIENTS',
      align: 'left',
      blankLinesAfter: 1,
    },
    {
      id: 'h-recip',
      kind: 'paragraph',
      body: '**Authorized recipients:** {{hipaa_recipients}}',
      blankLinesAfter: 1,
    },
    {
      id: 'h-agents-h',
      kind: 'heading',
      heading: '2. MEDICAL POWER OF ATTORNEY AGENTS',
      align: 'left',
      blankLinesAfter: 1,
    },
    {
      id: 'h-agents',
      kind: 'paragraph',
      body:
        '**Also authorize my Medical Power of Attorney agent(s):** {{hipaa_include_agents}}\n\nI understand that information used or disclosed under this Authorization may be subject to redisclosure by the recipient and may no longer be protected by HIPAA in some circumstances. I may revoke this Authorization in writing at any time, except to the extent a provider has already acted in reliance on it.',
      blankLinesAfter: 1,
    },
    {
      id: 'h-term',
      kind: 'paragraph',
      body:
        'This Authorization is effective immediately and continues until I revoke it in writing, unless a shorter period is required by law.',
      blankLinesAfter: 2,
    },
    {
      id: 'h-sig-h',
      kind: 'heading',
      heading: 'SIGNATURE',
      align: 'center',
      blankLinesAfter: 1,
    },
    {
      id: 'h-sig-txt',
      kind: 'paragraph',
      body: 'Signed on this ______ day of __________________, 20_____.',
      blankLinesAfter: 1,
    },
    {
      id: 'h-sig',
      kind: 'signature',
      label: 'Signature of Individual',
      align: 'center',
      blankLinesAfter: 0,
    },
  ],
)

export const BUNDLED_ANCILLARY_SKELETONS: Record<AncillaryKind, string> = {
  mpoa: BUNDLED_MPOA_SKELETON,
  dpoa: BUNDLED_DPOA_SKELETON,
  directive: BUNDLED_DIRECTIVE_SKELETON,
  hipaa: BUNDLED_HIPAA_SKELETON,
}

export function bundledSkeletonForAncillary(kind: AncillaryKind): string {
  return BUNDLED_ANCILLARY_SKELETONS[kind]
}

export function needsAncillaryTemplateRefresh(body: string | null | undefined): boolean {
  const text = body?.trim() ?? ''
  if (!text) return true
  return !new RegExp(`"template"\\s*:\\s*"${ANCILLARY_TEMPLATE}"`).test(text)
}
