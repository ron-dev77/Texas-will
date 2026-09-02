/** All PDF / skeleton document kinds stored on will_documents.document_kind */
export const DOCUMENT_KINDS = [
  'will',
  'rlt',
  'mpoa',
  'dpoa',
  'directive',
  'hipaa',
] as const

export type DocumentKind = (typeof DOCUMENT_KINDS)[number]

export const ANCILLARY_KINDS = ['mpoa', 'dpoa', 'directive', 'hipaa'] as const
export type AncillaryKind = (typeof ANCILLARY_KINDS)[number]

export const DOCUMENT_KIND_LABEL: Record<DocumentKind, string> = {
  will: 'Last Will and Testament',
  rlt: 'Revocable Living Trust',
  mpoa: 'Medical Power of Attorney',
  dpoa: 'Durable Power of Attorney',
  directive: 'Directive to Physicians',
  hipaa: 'HIPAA Release',
}

/** One-line meaning shown on admin DocCards / kind pickers. */
export const DOCUMENT_KIND_BLURB: Record<DocumentKind, string> = {
  will: 'Who gets your property after death',
  rlt: 'Living trust (older orders only)',
  mpoa: 'Who decides healthcare if you cannot',
  dpoa: 'Who handles money/property if incapacitated',
  directive: 'End-of-life / life-support wishes',
  hipaa: 'Who may see your medical information',
}

export function isDocumentKind(value: string): value is DocumentKind {
  return (DOCUMENT_KINDS as readonly string[]).includes(value)
}

export function isAncillaryKind(value: string): value is AncillaryKind {
  return (ANCILLARY_KINDS as readonly string[]).includes(value)
}

export function parseDocumentKindParam(raw: string | null | undefined): DocumentKind {
  if (raw && isDocumentKind(raw)) return raw
  return 'will'
}
