/**
 * Verifies spousal trust remainder wording for Ron's PDF requirement:
 * remainder beneficiaries must read "my children" — not "our children" or prior-relationship-only phrasing.
 * Also renders a sample Will PDF through the same skeleton pipeline admin preview uses.
 */
import { buildDefaultWillSkeletonDoc } from '../src/lib/content-defaults/default-will-skeleton.ts'
import { fillSkeletonTokens, type SkeletonDoc } from '../src/lib/skeleton-doc.ts'
import { renderSkeletonLayoutPdf } from '../src/lib/skeleton-layout-pdf.ts'
import { buildWillFromAnswers } from '../src/lib/will-content.ts'
import {
  assertSpousalTrustRemainderWording,
  buildSpousalTrustArticleCoTrustee,
  buildSpousalTrustArticleSole,
  spousalTrustArticlePlainText,
} from '../src/lib/spousal-trust.ts'

const sampleAnswers: Record<string, unknown> = {
  legal_full_name: 'Jane Marie Doe',
  spouse_full_name: 'Robert Doe',
  marital_status: 'married',
  has_children: 'yes',
  children: [{ name: 'Emma Grace Doe' }, { name: 'Noah James Doe' }],
  spousal_trust_trustee_mode: 'sole',
  spousal_trust_alternate_trustee_name: 'Mary Ann Smith',
  spousal_trust_remainder_children: 'Emma Grace Doe, Noah James Doe',
  residuary_plan: 'spouse_then_children',
  has_specific_gifts: 'no',
  has_charitable_gifts: 'no',
}

function check(label: string, text: string) {
  assertSpousalTrustRemainderWording(text)
  console.log(`OK: ${label}`)
}

function filledSkeletonPlainText(
  doc: SkeletonDoc,
  answers: Record<string, unknown>,
  options: { includeSpousalTrust?: boolean },
) {
  return doc.blocks
    .map(
      (b) =>
        `${fillSkeletonTokens(b.heading, answers, options)}\n${fillSkeletonTokens(b.body, answers, options)}`,
    )
    .join('\n\n')
}

const sole = buildSpousalTrustArticleSole({
  testatorName: 'Jane Marie Doe',
  spouseName: 'Robert Doe',
  alternateTrusteeName: 'Mary Ann Smith',
  priorChildNames: ['Emma Grace Doe', 'Noah James Doe'],
})
check('sole-trustee article', sole.paragraphs.join('\n\n'))

const co = buildSpousalTrustArticleCoTrustee({
  testatorName: 'Jane Marie Doe',
  spouseName: 'Robert Doe',
  coTrusteeChildName: 'Emma Grace Doe',
  successorCoTrusteeName: 'Noah James Doe',
  remainderChildNames: ['Emma Grace Doe', 'Noah James Doe'],
})
check('co-trustee article', co.paragraphs.join('\n\n'))

check('buildSpousalTrustFromAnswers', spousalTrustArticlePlainText(sampleAnswers))

const will = buildWillFromAnswers(sampleAnswers, { includeSpousalTrust: true })
const willText = will.sections.flatMap((s) => s.paragraphs).join('\n\n')
check('buildWillFromAnswers (will PDF source)', willText)

const skeleton = buildDefaultWillSkeletonDoc()
const skeletonText = filledSkeletonPlainText(skeleton, sampleAnswers, { includeSpousalTrust: true })
check('default will skeleton fill (admin PDF source)', skeletonText)

const pdfBytes = await renderSkeletonLayoutPdf(skeleton, sampleAnswers, {
  includeSpousalTrust: true,
})
if (pdfBytes.byteLength < 500) {
  throw new Error('Generated Will PDF was unexpectedly small')
}
console.log(`OK: rendered Will PDF (${pdfBytes.byteLength} bytes)`)
console.log('Spousal trust remainder wording verified for PDF generation.')
