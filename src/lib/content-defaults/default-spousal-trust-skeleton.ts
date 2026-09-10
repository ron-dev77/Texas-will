/**
 * Bundled spousal trust skeleton — v2 layout blocks (same PDF pipeline as MPOA / Will).
 * Body uses {{clause_spousal_trust}} so sole vs co-trustee follows questionnaire answers.
 */
export const SPOUSAL_TRUST_TEMPLATE = 'spousal-trust-v3-layout'

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
  { version: 2, template: SPOUSAL_TRUST_TEMPLATE, title, pageSize: 'A4', blocks: full },
  null,
  2,
)}
`
}

export const BUNDLED_SPOUSAL_TRUST_SKELETON = pack('SPOUSAL TESTAMENTARY TRUST', [
  {
    id: 'st-ident-h',
    kind: 'heading',
    heading: 'IDENTIFICATION',
    align: 'center',
    blankLinesAfter: 1,
  },
  {
    id: 'st-ident-p',
    kind: 'paragraph',
    body:
      'I, **{{legal_full_name}}**, a resident of **{{address_county}}** County, Texas, establish the following Spousal Testamentary Trust for the benefit of my spouse, **{{spouse_full_name}}**, to be incorporated by reference into my Last Will and Testament.',
    blankLinesAfter: 1,
  },
  {
    id: 'st-trust-body',
    kind: 'paragraph',
    body: '{{clause_spousal_trust}}',
    blankLinesAfter: 1,
  },
])

/** True when stored skeleton is legacy markdown or an older bundled template. */
export function needsSpousalTrustTemplateRefresh(body: string | null | undefined): boolean {
  const text = body?.trim() ?? ''
  if (!text) return true
  if (text.includes('<!-- texas-will-spousal-trust-v2-scott -->')) return true
  if (/^#\s/m.test(text)) return true
  if (!text.includes('<!-- texas-will-skeleton-v2 -->')) return true
  return !new RegExp(`"template"\\s*:\\s*"${SPOUSAL_TRUST_TEMPLATE}"`).test(text)
}
