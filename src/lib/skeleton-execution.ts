import type { DocumentKind } from '@/lib/document-kinds'
import type { SkeletonDoc } from '@/lib/skeleton-doc'

export type ExecutionValidationResult =
  | { ok: true }
  | { ok: false; missing: string[] }

const WILL_EXECUTION_SECTIONS = [
  {
    label: 'SIGNATURE OF TESTATOR',
    test: (heading: string) => /signature of testator/i.test(heading),
  },
  {
    label: 'WITNESSES',
    test: (heading: string) => /^witnesses$/i.test(heading.trim()),
  },
  {
    label: 'SELF-PROVING AFFIDAVIT or NOTARY ACKNOWLEDGMENT',
    test: (heading: string) =>
      /self[-\s]?proving affidavit|notary acknowledgment/i.test(heading),
  },
] as const

/** Will layouts must include Texas execution blocks before save/send — fail loudly if missing. */
export function validateSkeletonExecutionBlocks(
  skeleton: SkeletonDoc | null | undefined,
  kind: DocumentKind,
): ExecutionValidationResult {
  if (kind !== 'will') return { ok: true }
  if (!skeleton?.blocks?.length) {
    return { ok: false, missing: ['Will skeleton layout (no blocks)'] }
  }

  const missing: string[] = []
  for (const section of WILL_EXECUTION_SECTIONS) {
    const found = skeleton.blocks.some(
      (b) =>
        (b.kind === 'heading' || b.kind === 'section') &&
        section.test(b.heading),
    )
    if (!found) missing.push(section.label)
  }

  const hasSignatureLine = skeleton.blocks.some(
    (b) => b.kind === 'signature' || b.kind === 'signature_pair',
  )
  if (!hasSignatureLine) {
    missing.push('At least one signature line block')
  }

  return missing.length === 0 ? { ok: true } : { ok: false, missing }
}

export function executionValidationError(
  result: Extract<ExecutionValidationResult, { ok: false }>,
): string {
  return (
    `Cannot save an incomplete will: missing execution block (${result.missing.join(', ')}). ` +
    'Add SIGNATURE OF TESTATOR, WITNESSES, SELF-PROVING AFFIDAVIT / NOTARY ACKNOWLEDGMENT, and signature lines to the layout before saving.'
  )
}

export function assertSkeletonExecutionBlocks(
  skeleton: SkeletonDoc | null | undefined,
  kind: DocumentKind,
): void {
  const result = validateSkeletonExecutionBlocks(skeleton, kind)
  if (!result.ok) throw new Error(executionValidationError(result))
}
