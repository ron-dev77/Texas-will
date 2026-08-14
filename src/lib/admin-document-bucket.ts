import { supabase } from '@/integrations/supabase/client'
import type { DocumentKind } from '@/lib/document-kinds'
import type { Json } from '@/integrations/supabase/types'

export type DocumentBucketItem = {
  kind: DocumentKind
  partnerNumber: 1 | 2
  versionId: string
  version: number
  addedAt: string
  /** Exact layout snapshot from Layouts preview (skeleton PDF). */
  skeletonBody?: string | null
}

export type DocumentBucket = {
  items: DocumentBucketItem[]
}

const BUCKET_KEY = 'document_bucket'

export function readDocumentBucket(addOns: Record<string, unknown> | null | undefined): DocumentBucket {
  const raw = addOns?.[BUCKET_KEY]
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { items: [] }
  const items = (raw as { items?: unknown }).items
  if (!Array.isArray(items)) return { items: [] }
  return {
    items: items
      .filter((x): x is DocumentBucketItem => {
        if (!x || typeof x !== 'object') return false
        const row = x as DocumentBucketItem
        return (
          typeof row.kind === 'string' &&
          (row.partnerNumber === 1 || row.partnerNumber === 2) &&
          typeof row.versionId === 'string' &&
          typeof row.version === 'number'
        )
      })
      .map((row) => ({
        kind: row.kind,
        partnerNumber: row.partnerNumber,
        versionId: row.versionId,
        version: row.version,
        addedAt: typeof row.addedAt === 'string' ? row.addedAt : new Date().toISOString(),
        skeletonBody:
          typeof row.skeletonBody === 'string' && row.skeletonBody.trim()
            ? row.skeletonBody
            : null,
      })),
  }
}

export function upsertBucketItem(
  bucket: DocumentBucket,
  item: Omit<DocumentBucketItem, 'addedAt'> & { addedAt?: string },
): DocumentBucket {
  const next = bucket.items.filter(
    (x) => !(x.kind === item.kind && x.partnerNumber === item.partnerNumber),
  )
  next.push({
    ...item,
    skeletonBody: item.skeletonBody?.trim() ? item.skeletonBody : null,
    addedAt: item.addedAt ?? new Date().toISOString(),
  })
  next.sort((a, b) => {
    if (a.partnerNumber !== b.partnerNumber) return a.partnerNumber - b.partnerNumber
    return a.kind.localeCompare(b.kind)
  })
  return { items: next }
}

export function removeBucketItem(
  bucket: DocumentBucket,
  kind: DocumentKind,
  partnerNumber: 1 | 2,
): DocumentBucket {
  return {
    items: bucket.items.filter(
      (x) => !(x.kind === kind && x.partnerNumber === partnerNumber),
    ),
  }
}

/** Persist bucket inside orders.add_ons without wiping package fields. */
export async function saveDocumentBucket(params: {
  orderId: string
  addOns: Record<string, unknown> | null | undefined
  bucket: DocumentBucket
}): Promise<Record<string, unknown>> {
  const nextAddOns: Record<string, unknown> = {
    ...(params.addOns ?? {}),
    [BUCKET_KEY]: params.bucket,
  }
  const { error } = await supabase
    .from('orders')
    .update({ add_ons: nextAddOns as Json })
    .eq('id', params.orderId)
  if (error) throw new Error(error.message)
  return nextAddOns
}
