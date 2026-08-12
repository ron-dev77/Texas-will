import type { AncillaryKind } from '@/lib/document-kinds'

type BlockInput = {
  id: string
  kind: 'heading' | 'paragraph' | 'signature' | 'spacer'
  heading?: string
  body?: string
  label?: string
  align?: 'left' | 'center' | 'right'
  blankLinesAfter?: number
  pageBreakBefore?: boolean
}

function pack(title: string, blocks: BlockInput[]): string {
  const full = blocks.map((b) => ({
    id: b.id,
    kind: b.kind,
    heading: b.heading ?? '',
    body: b.body ?? '',
    label: b.label ?? '',
    leftLabel: '',
    rightLabel: '',
    align: b.align ?? 'left',
    blankLinesAfter: b.blankLinesAfter ?? 1,
    pageBreakBefore: b.pageBreakBefore ?? false,
  }))
  return `<!-- texas-will-skeleton-v2 -->
${JSON.stringify({ version: 2, title, pageSize: 'A4', blocks: full }, null, 2)}
`
}

export const BUNDLED_MPOA_SKELETON = pack('MEDICAL POWER OF ATTORNEY', [
  {
    id: 'm2',
    kind: 'paragraph',
    body: 'I, **{{legal_full_name}}**, appoint the following person as my agent to make any and all health care decisions for me if I am unable to make my own health care decisions:',
  },
  {
    id: 'm3',
    kind: 'paragraph',
    body: '**Primary agent:** {{mpoa_agent_name}}\nRelationship: {{mpoa_agent_relationship}}\nPhone: {{mpoa_agent_phone}}',
  },
  {
    id: 'm4',
    kind: 'paragraph',
    body: '**Alternate agent:** {{mpoa_alt_agent_name}}\nPhone: {{mpoa_alt_agent_phone}}',
  },
  {
    id: 'm5',
    kind: 'paragraph',
    body: 'This Medical Power of Attorney takes effect if my attending physician certifies that I am unable to make my own health care decisions. This document is intended to comply with Texas Health and Safety Code Chapter 166.',
    blankLinesAfter: 2,
  },
  {
    id: 'm6',
    kind: 'heading',
    heading: 'SIGNATURE',
    align: 'center',
  },
  {
    id: 'm7',
    kind: 'paragraph',
    body: 'I sign my name to this Medical Power of Attorney on this ______ day of __________________, 20_____.',
  },
  {
    id: 'm8',
    kind: 'signature',
    label: 'Signature of Principal',
    align: 'center',
  },
  {
    id: 'm9',
    kind: 'heading',
    heading: 'WITNESSES / NOTARY',
    align: 'center',
    pageBreakBefore: false,
  },
  {
    id: 'm10',
    kind: 'paragraph',
    body: '**STATE OF TEXAS**\n**COUNTY OF** ____________________________\n\nThis instrument was acknowledged before me on this ______ day of __________________, 20_____, by **{{legal_full_name}}**.',
  },
  {
    id: 'm11',
    kind: 'signature',
    label: 'Notary Public, State of Texas',
    align: 'right',
    blankLinesAfter: 0,
  },
])

export const BUNDLED_DPOA_SKELETON = pack('STATUTORY DURABLE POWER OF ATTORNEY', [
  {
    id: 'd2',
    kind: 'paragraph',
    body: 'I, **{{legal_full_name}}**, appoint **{{dpoa_agent_name}}** as my agent to act for me in any lawful way with respect to the powers listed in this document.',
  },
  {
    id: 'd3',
    kind: 'paragraph',
    body: 'Relationship to me: {{dpoa_agent_relationship}}\nAgent phone: {{dpoa_agent_phone}}',
  },
  {
    id: 'd4',
    kind: 'paragraph',
    body: '**Alternate agent:** {{dpoa_alt_agent_name}}',
  },
  {
    id: 'd5',
    kind: 'paragraph',
    body: '**When effective:** {{dpoa_when_effective}}\n\nThis power of attorney is not affected by my subsequent disability or incapacity (it is durable). This document is intended for use under the Texas Estates Code.',
    blankLinesAfter: 2,
  },
  {
    id: 'd6',
    kind: 'heading',
    heading: 'SIGNATURE',
    align: 'center',
  },
  {
    id: 'd7',
    kind: 'paragraph',
    body: 'I sign my name to this Durable Power of Attorney on this ______ day of __________________, 20_____.',
  },
  {
    id: 'd8',
    kind: 'signature',
    label: 'Signature of Principal',
    align: 'center',
  },
  {
    id: 'd9',
    kind: 'heading',
    heading: 'NOTARY ACKNOWLEDGMENT',
    align: 'center',
  },
  {
    id: 'd10',
    kind: 'paragraph',
    body: '**STATE OF TEXAS**\n**COUNTY OF** ____________________________\n\nThis instrument was acknowledged before me on this ______ day of __________________, 20_____, by **{{legal_full_name}}**.',
  },
  {
    id: 'd11',
    kind: 'signature',
    label: 'Notary Public, State of Texas',
    align: 'right',
    blankLinesAfter: 0,
  },
])

export const BUNDLED_DIRECTIVE_SKELETON = pack('DIRECTIVE TO PHYSICIANS AND FAMILY OR SURROGATES', [
  {
    id: 'dir2',
    kind: 'paragraph',
    body: 'I, **{{legal_full_name}}**, make this Directive under Texas Health and Safety Code Chapter 166 to state my wishes about medical treatment if I am in a terminal or irreversible condition and cannot make my own decisions.',
  },
  {
    id: 'dir3',
    kind: 'paragraph',
    body: '**My treatment preference:** {{directive_preference}}',
  },
  {
    id: 'dir4',
    kind: 'paragraph',
    body: '**Additional wishes:** {{directive_notes}}',
    blankLinesAfter: 2,
  },
  {
    id: 'dir5',
    kind: 'heading',
    heading: 'SIGNATURE',
    align: 'center',
  },
  {
    id: 'dir6',
    kind: 'paragraph',
    body: 'I understand the full importance of this Directive and I am emotionally and mentally competent to make this Directive. Signed on this ______ day of __________________, 20_____.',
  },
  {
    id: 'dir7',
    kind: 'signature',
    label: 'Signature of Declarant',
    align: 'center',
  },
  {
    id: 'dir8',
    kind: 'heading',
    heading: 'WITNESSES',
    align: 'center',
  },
  {
    id: 'dir9',
    kind: 'paragraph',
    body: 'Two qualified witnesses (or a notary) should sign according to Texas law.',
  },
  {
    id: 'dir10',
    kind: 'signature',
    label: 'Witness 1',
    align: 'right',
  },
  {
    id: 'dir11',
    kind: 'signature',
    label: 'Witness 2',
    align: 'right',
    blankLinesAfter: 0,
  },
])

export const BUNDLED_HIPAA_SKELETON = pack(
  'AUTHORIZATION FOR RELEASE OF\nPROTECTED HEALTH INFORMATION',
  [
  {
    id: 'h2',
    kind: 'paragraph',
    body: 'I, **{{legal_full_name}}**, authorize my health care providers to disclose my protected health information to the persons named below for purposes of coordinating my care and assisting with health care decisions.',
  },
  {
    id: 'h3',
    kind: 'paragraph',
    body: '**Authorized recipients:** {{hipaa_recipients}}',
  },
  {
    id: 'h4',
    kind: 'paragraph',
    body: '**Also authorize my Medical POA agent(s):** {{hipaa_include_agents}}\n\nThis authorization is effective immediately and continues until I revoke it in writing, unless a shorter period is required by law.',
    blankLinesAfter: 2,
  },
  {
    id: 'h5',
    kind: 'heading',
    heading: 'SIGNATURE',
    align: 'center',
  },
  {
    id: 'h6',
    kind: 'paragraph',
    body: 'Signed on this ______ day of __________________, 20_____.',
  },
  {
    id: 'h7',
    kind: 'signature',
    label: 'Signature of Individual',
    align: 'center',
    blankLinesAfter: 0,
  },
])

export const BUNDLED_ANCILLARY_SKELETONS: Record<AncillaryKind, string> = {
  mpoa: BUNDLED_MPOA_SKELETON,
  dpoa: BUNDLED_DPOA_SKELETON,
  directive: BUNDLED_DIRECTIVE_SKELETON,
  hipaa: BUNDLED_HIPAA_SKELETON,
}

export function bundledSkeletonForAncillary(kind: AncillaryKind): string {
  return BUNDLED_ANCILLARY_SKELETONS[kind]
}
