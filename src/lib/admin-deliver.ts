import { supabase } from '@/integrations/supabase/client'
import type { DocumentKind } from '@/lib/document-kinds'
import { DOCUMENT_KIND_LABEL } from '@/lib/document-kinds'
import type { PackageDocId } from '@/lib/order'
import { normalizeOrderDocuments } from '@/lib/order'

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
}): DocumentKind[] {
  const docs = normalizeOrderDocuments(params.documents)
  const kinds: DocumentKind[] = []
  if (docs.includes('will')) kinds.push('will')
  for (const id of docs) {
    if (id === 'will') continue
    kinds.push(id as DocumentKind)
  }
  if (params.includeTrust) kinds.push('rlt')
  return kinds
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
  emails: unknown
}> {
  const { data, error } = await supabase.functions.invoke('deliver-documents', {
    body: {
      orderId: params.orderId,
      attachments: params.attachments,
      markDelivered: params.markDelivered !== false,
    },
  })

  if (error) {
    throw new Error(error.message || 'Deliver documents failed')
  }
  if (data && typeof data === 'object' && 'error' in data && data.error) {
    throw new Error(String((data as { error: string }).error))
  }
  return data as {
    ok: true
    sentCount: number
    status: string
    emails: unknown
  }
}
