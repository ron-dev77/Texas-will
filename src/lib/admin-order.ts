import { supabase } from '@/integrations/supabase/client'
import type { OrderRow } from '@/lib/admin'
import type { Json } from '@/integrations/supabase/types'
import type { WillContent } from '@/lib/will-render'
import type { DocumentKind } from '@/lib/document-kinds'

export type AnswersRow = {
  id: string
  order_id: string
  partner_number: number
  answers: Record<string, unknown>
  current_section: number
  review_status: string
  submitted_at: string | null
  attorney_flags: Record<string, unknown>
}

export type WillDocRow = {
  id: string
  order_id: string
  partner_number: number
  document_kind: string
  status: string
  version: number
  will_content: WillContent | null
  attorney_notes: string | null
  draft_generated_at: string | null
  pdf_storage_path: string | null
  generation_error: string | null
  revision_count: number
  skeleton_body: string | null
}

export type StatusEvent = {
  id: string
  order_id: string
  status: string
  note: string | null
  partner_number: number | null
  created_at: string
  created_by: string | null
}

export type OrderDetail = {
  order: OrderRow & {
    add_ons: Record<string, unknown> | null
    amount_paid: number
    partner1_submitted_at: string | null
    partner2_submitted_at: string | null
  }
  answers: AnswersRow[]
  wills: WillDocRow[]
  events: StatusEvent[]
}

export async function getOrderDetail(orderId: string): Promise<OrderDetail> {
  const [{ data: order, error: orderError }, { data: answers }, { data: wills }, { data: events }] =
    await Promise.all([
      supabase.from('orders').select('*').eq('id', orderId).single(),
      supabase
        .from('questionnaire_answers')
        .select('*')
        .eq('order_id', orderId)
        .order('partner_number'),
      supabase
        .from('will_documents')
        .select(
          'id, order_id, partner_number, document_kind, status, version, will_content, attorney_notes, draft_generated_at, pdf_storage_path, generation_error, revision_count, skeleton_body',
        )
        .eq('order_id', orderId)
        .order('partner_number'),
      supabase
        .from('will_status_events')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: true }),
    ])

  if (orderError || !order) {
    throw new Error(orderError?.message || 'Order not found')
  }

  return {
    order: {
      ...(order as OrderRow),
      add_ons: (order.add_ons as Record<string, unknown>) ?? {},
      amount_paid: order.amount_paid,
      partner1_submitted_at: order.partner1_submitted_at,
      partner2_submitted_at: order.partner2_submitted_at,
    },
    answers: (answers ?? []).map((a) => ({
      ...a,
      answers: (a.answers ?? {}) as Record<string, unknown>,
      attorney_flags: (a.attorney_flags ?? {}) as Record<string, unknown>,
    })),
    wills: (wills ?? []).map((w) => ({
      ...w,
      will_content: (w.will_content as WillContent | null) ?? null,
      skeleton_body: (w as { skeleton_body?: string | null }).skeleton_body ?? null,
    })),
    events: (events ?? []) as StatusEvent[],
  }
}

export type WillVersionRow = {
  id: string
  will_document_id: string
  order_id: string
  partner_number: number
  document_kind: string
  version: number
  will_content: WillContent
  attorney_notes: string | null
  created_at: string
}

export async function listWillVersions(params: {
  orderId: string
  partnerNumber: 1 | 2
  kind: DocumentKind
}): Promise<WillVersionRow[]> {
  const { data, error } = await supabase
    .from('will_document_versions')
    .select(
      'id, will_document_id, order_id, partner_number, document_kind, version, will_content, attorney_notes, created_at',
    )
    .eq('order_id', params.orderId)
    .eq('partner_number', params.partnerNumber)
    .eq('document_kind', params.kind)
    .order('version', { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []).map((row) => ({
    ...row,
    will_content: row.will_content as unknown as WillContent,
  }))
}

export async function upsertWillDocument(params: {
  orderId: string
  partnerNumber: 1 | 2
  kind: DocumentKind
  content: WillContent
  attorneyNotes?: string
  skeletonBody?: string | null
}): Promise<WillDocRow> {
  const { data: existing } = await supabase
    .from('will_documents')
    .select('id, version, revision_count')
    .eq('order_id', params.orderId)
    .eq('partner_number', params.partnerNumber)
    .eq('document_kind', params.kind)
    .maybeSingle()

  const nextVersion = (existing?.version ?? 0) + 1
  const payload = {
    order_id: params.orderId,
    partner_number: params.partnerNumber,
    document_kind: params.kind,
    will_content: params.content as unknown as Json,
    attorney_notes: params.attorneyNotes?.trim() || null,
    status: 'ready_for_review',
    draft_generated_at: new Date().toISOString(),
    version: nextVersion,
    revision_count: (existing?.revision_count ?? 0) + (existing ? 1 : 0),
    generation_error: null,
    ...(params.skeletonBody !== undefined
      ? { skeleton_body: params.skeletonBody }
      : {}),
  }

  const selectCols =
    'id, order_id, partner_number, document_kind, status, version, will_content, attorney_notes, draft_generated_at, pdf_storage_path, generation_error, revision_count, skeleton_body'

  let saved: WillDocRow
  if (existing?.id) {
    const { data, error } = await supabase
      .from('will_documents')
      .update(payload)
      .eq('id', existing.id)
      .select(selectCols)
      .single()
    if (error) throw new Error(error.message)
    saved = {
      ...data,
      will_content: data.will_content as unknown as WillContent,
      skeleton_body: data.skeleton_body ?? null,
    }
  } else {
    const { data, error } = await supabase
      .from('will_documents')
      .insert(payload)
      .select(selectCols)
      .single()
    if (error) throw new Error(error.message)
    saved = {
      ...data,
      will_content: data.will_content as unknown as WillContent,
      skeleton_body: data.skeleton_body ?? null,
    }
  }

  // Snapshot for version dropdown history
  const { error: snapError } = await supabase.from('will_document_versions').insert({
    will_document_id: saved.id,
    order_id: params.orderId,
    partner_number: params.partnerNumber,
    document_kind: params.kind,
    version: nextVersion,
    will_content: params.content as unknown as Json,
    attorney_notes: params.attorneyNotes?.trim() || null,
  })
  if (snapError) {
    console.error('Failed to snapshot will version', snapError)
  }

  return saved
}

export async function saveOrderSkeleton(params: {
  orderId: string
  partnerNumber: 1 | 2
  skeletonBody: string
  kind?: DocumentKind
}): Promise<void> {
  const kind = params.kind ?? 'will'
  const { data: existing } = await supabase
    .from('will_documents')
    .select('id')
    .eq('order_id', params.orderId)
    .eq('partner_number', params.partnerNumber)
    .eq('document_kind', kind)
    .maybeSingle()

  if (existing?.id) {
    const { error } = await supabase
      .from('will_documents')
      .update({ skeleton_body: params.skeletonBody, updated_at: new Date().toISOString() })
      .eq('id', existing.id)
    if (error) throw new Error(error.message)
    return
  }

  const { error } = await supabase.from('will_documents').insert({
    order_id: params.orderId,
    partner_number: params.partnerNumber,
    document_kind: kind,
    status: 'ready_for_review',
    version: 1,
    will_content: null,
    skeleton_body: params.skeletonBody,
  })
  if (error) throw new Error(error.message)
}

export async function updateOrderStatus(params: {
  orderId: string
  status: string
  note?: string
  patch?: {
    review_started_at?: string
    delivered_at?: string
    approved_at?: string
  }
}) {
  const now = new Date().toISOString()
  const patch: {
    status: string
    review_started_at?: string
    delivered_at?: string
    approved_at?: string
  } = {
    status: params.status,
    ...(params.patch ?? {}),
  }
  if (params.status === 'in_review' && !patch.review_started_at) {
    patch.review_started_at = now
  }
  if (params.status === 'delivered') {
    patch.delivered_at = now
    patch.approved_at = now
  }

  const { error } = await supabase.from('orders').update(patch).eq('id', params.orderId)
  if (error) throw new Error(error.message)

  await supabase.from('will_status_events').insert({
    order_id: params.orderId,
    status: params.status,
    note: params.note?.trim() || null,
  })
}
