import { resolveSkeletonForOrder } from '@/lib/admin-forms'
import { buildDocumentFromAnswers } from '@/lib/will-content'
import { renderDocumentPdf, type WillContent } from '@/lib/will-render'
import { parseSkeletonBody, type SkeletonDoc } from '@/lib/skeleton-doc'
import { renderSkeletonLayoutPdf } from '@/lib/skeleton-layout-pdf'
import type { DocumentKind } from '@/lib/document-kinds'
import type { AnswersRow, OrderDetail, WillDocRow } from '@/lib/admin-order'

export type SkeletonMeta = {
  source: 'order' | 'form' | 'bundled'
  formName: string | null
}

export async function loadSkeletonsForPartner(
  detail: OrderDetail,
  partnerNumber: 1 | 2,
  kinds: DocumentKind[],
): Promise<{
  docs: Partial<Record<DocumentKind, SkeletonDoc>>
  meta: Partial<Record<DocumentKind, SkeletonMeta>>
}> {
  const results = await Promise.all(
    kinds.map(async (kind) => {
      const doc = detail.wills.find(
        (w) => w.partner_number === partnerNumber && w.document_kind === kind,
      )
      const res = await resolveSkeletonForOrder({
        orderFormId: detail.order.questionnaire_form_id,
        orderSkeletonBody: doc?.skeleton_body,
        kind,
      })
      return { kind, res }
    }),
  )

  const docs: Partial<Record<DocumentKind, SkeletonDoc>> = {}
  const meta: Partial<Record<DocumentKind, SkeletonMeta>> = {}
  for (const { kind, res } of results) {
    docs[kind] = parseSkeletonBody(res.body)
    meta[kind] = { source: res.source, formName: res.formName }
  }
  return { docs, meta }
}

export async function renderOrderDocumentPdf(params: {
  kind: DocumentKind
  answers: Record<string, unknown>
  skeleton?: SkeletonDoc | null
  includeTrust: boolean
  includeSpousalTrust?: boolean
  fallbackContent?: WillContent | null
}): Promise<Uint8Array> {
  if (params.skeleton) {
    return renderSkeletonLayoutPdf(
      params.skeleton,
      params.answers,
      params.kind === 'will'
        ? {
            includeTrust: params.includeTrust,
            includeSpousalTrust: params.includeSpousalTrust,
          }
        : {},
    )
  }
  const content =
    params.fallbackContent ??
    buildDocumentFromAnswers(params.kind, params.answers, {
      includeTrust: params.includeTrust,
      includeSpousalTrust: params.includeSpousalTrust,
    })
  return renderDocumentPdf(content, params.kind)
}

export async function buildPdfForOrderKind(params: {
  detail: OrderDetail
  kind: DocumentKind
  partnerNumber: 1 | 2
  skeletonByKind?: Partial<Record<DocumentKind, SkeletonDoc>>
}): Promise<Uint8Array | null> {
  const answersForPartner = params.detail.answers.find(
    (a) => a.partner_number === params.partnerNumber,
  ) as AnswersRow | undefined
  if (!answersForPartner) return null

  const trustOn = Boolean((params.detail.order.add_ons as { trust?: boolean } | null)?.trust)
  const spousalOn = Boolean(
    (params.detail.order.add_ons as { spousal_trust?: boolean } | null)?.spousal_trust,
  )
  let skel = params.skeletonByKind?.[params.kind]
  if (!skel) {
    const doc = params.detail.wills.find(
      (w) => w.partner_number === params.partnerNumber && w.document_kind === params.kind,
    ) as WillDocRow | undefined
    const resolved = await resolveSkeletonForOrder({
      orderFormId: params.detail.order.questionnaire_form_id,
      orderSkeletonBody: doc?.skeleton_body,
      kind: params.kind,
    })
    skel = parseSkeletonBody(resolved.body)
  }

  return renderOrderDocumentPdf({
    kind: params.kind,
    answers: answersForPartner.answers,
    skeleton: skel,
    includeTrust: trustOn,
    includeSpousalTrust: spousalOn,
  })
}

export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', bytes.slice())
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('')
}
