import { supabase } from '@/integrations/supabase/client'
import { readEdgeFunctionError } from '@/lib/edge-function-error'
import type { DocumentKind } from '@/lib/document-kinds'
import { DOCUMENT_KIND_LABEL } from '@/lib/document-kinds'
import type { PackageDocId } from '@/lib/order'
import { normalizeOrderDocuments } from '@/lib/order'
import { orderHasSpousalTrust } from '@/lib/spousal-trust'

export type DeliverAttachmentPayload = {
  kind: DocumentKind
  partnerNumber: 1 | 2
  filename: string
  label: string
  contentBase64: string
}

/** Map order package selection + trust flag → document kinds admin can send. */
export function orderedDocumentKindsForDelivery(params: {
  documents: unknown
  includeTrust: boolean
  includeSpousalTrust?: boolean
}): DocumentKind[] {
  const docs = normalizeOrderDocuments(params.documents)
  const kinds: DocumentKind[] = []
  if (docs.includes('will')) kinds.push('will')
  for (const id of docs) {
    if (id === 'will') continue
    kinds.push(id as DocumentKind)
  }
  if (params.includeSpousalTrust) kinds.push('spousal_trust')
  if (params.includeTrust) kinds.push('rlt')
  return kinds
}

/** Every document type shown in admin pickers (ordered + not ordered). */
export const ADMIN_DOCUMENT_PICKER_KINDS: DocumentKind[] = [
  'will',
  'mpoa',
  'dpoa',
  'directive',
  'hipaa',
  'spousal_trust',
  'rlt',
]

export function isDocumentKindOrdered(
  kind: DocumentKind,
  addOns: Record<string, unknown> | null | undefined,
): boolean {
  return orderedDocumentKindsForDelivery({
    documents: addOns?.documents,
    includeTrust: Boolean(addOns?.trust),
    includeSpousalTrust: orderHasSpousalTrust(addOns),
  }).includes(kind)
}

export type AdminDocumentKindStatus = {
  ordered: boolean
  label: string
}

function partnerQuestionnaireSubmitted(answersRow?: {
  submitted_at: string | null
  review_status?: string
} | null): boolean {
  if (!answersRow) return false
  if (answersRow.submitted_at) return true
  const status = answersRow.review_status?.toLowerCase() ?? ''
  return status === 'submitted' || status === 'complete'
}

/** Subtitle for admin document picker buttons. */
export function adminDocumentKindStatus(params: {
  kind: DocumentKind
  addOns: Record<string, unknown> | null | undefined
  answersRow?: { submitted_at: string | null; review_status?: string } | null
  liveDoc?: { version: number } | null
}): AdminDocumentKindStatus {
  const ordered = isDocumentKindOrdered(params.kind, params.addOns)
  if (!ordered) {
    return { ordered: false, label: 'Not selected at checkout' }
  }
  if (!partnerQuestionnaireSubmitted(params.answersRow)) {
    return { ordered: true, label: 'Questionnaire not submitted' }
  }
  if (!params.liveDoc) {
    return { ordered: true, label: 'No live version yet' }
  }
  return { ordered: true, label: `Live v${params.liveDoc.version}` }
}

export function packageDocsFromAddOns(addOns: Record<string, unknown> | null | undefined): PackageDocId[] {
  return normalizeOrderDocuments(addOns?.documents)
}

export function pdfFilenameFor(kind: DocumentKind, partnerNumber: 1 | 2, couples: boolean): string {
  const base = DOCUMENT_KIND_LABEL[kind].replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '')
  const suffix = couples ? `-partner${partnerNumber}` : ''
  return `${base}${suffix}.pdf`
}

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}

export async function pdfBytesToBase64(bytes: Uint8Array): Promise<string> {
  return uint8ToBase64(bytes)
}

export async function deliverDocumentsToClient(params: {
  orderId: string
  attachments: DeliverAttachmentPayload[]
  markDelivered?: boolean
}): Promise<{
  ok: true
  sentCount: number
  status: string
  emails: {
    primary?: { ok: boolean; id?: string; error?: string; skipped?: boolean } | null
    partner?: { ok: boolean; id?: string; error?: string; skipped?: boolean } | null
  }
}> {
  const { data, error } = await supabase.functions.invoke('deliver-documents', {
    body: {
      orderId: params.orderId,
      attachments: params.attachments,
      markDelivered: params.markDelivered !== false,
    },
  })

  if (error) {
    throw new Error(
      await readEdgeFunctionError(
        error,
        data,
        'Deliver failed. Sign in as admin, deploy the deliver-documents edge function, and set RESEND_API_KEY + EMAIL_FROM in Supabase secrets.',
      ),
    )
  }
  if (data && typeof data === 'object' && 'error' in data && data.error) {
    throw new Error(String((data as { error: string }).error))
  }
  return data as {
    ok: true
    sentCount: number
    status: string
    emails: {
      primary?: { ok: boolean; id?: string; error?: string; skipped?: boolean } | null
      partner?: { ok: boolean; id?: string; error?: string; skipped?: boolean } | null
    }
  }
}
