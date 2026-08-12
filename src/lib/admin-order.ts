import { supabase } from '@/integrations/supabase/client'
import type { OrderRow } from '@/lib/admin'
import type { Json } from '@/integrations/supabase/types'
import type { WillContent } from '@/lib/will-render'

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
          'id, order_id, partner_number, document_kind, status, version, will_content, attorney_notes, draft_generated_at, pdf_storage_path, generation_error, revision_count',
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
    })),
    events: (events ?? []) as StatusEvent[],
  }
}

export async function upsertWillDocument(params: {
  orderId: string
  partnerNumber: 1 | 2
  kind: 'will' | 'rlt'
  content: WillContent
  attorneyNotes?: string
}): Promise<WillDocRow> {
  const { data: existing } = await supabase
    .from('will_documents')
    .select('id, version, revision_count')
    .eq('order_id', params.orderId)
    .eq('partner_number', params.partnerNumber)
    .eq('document_kind', params.kind)
    .maybeSingle()

  const payload = {
    order_id: params.orderId,
    partner_number: params.partnerNumber,
    document_kind: params.kind,
    will_content: params.content as unknown as Json,
    attorney_notes: params.attorneyNotes?.trim() || null,
    status: 'ready_for_review',
    draft_generated_at: new Date().toISOString(),
    version: (existing?.version ?? 0) + 1,
    revision_count: (existing?.revision_count ?? 0) + (existing ? 1 : 0),
    generation_error: null,
  }

  if (existing?.id) {
    const { data, error } = await supabase
      .from('will_documents')
      .update(payload)
      .eq('id', existing.id)
      .select(
        'id, order_id, partner_number, document_kind, status, version, will_content, attorney_notes, draft_generated_at, pdf_storage_path, generation_error, revision_count',
      )
      .single()
    if (error) throw new Error(error.message)
    return { ...data, will_content: data.will_content as unknown as WillContent }
  }

  const { data, error } = await supabase
    .from('will_documents')
    .insert(payload)
    .select(
      'id, order_id, partner_number, document_kind, status, version, will_content, attorney_notes, draft_generated_at, pdf_storage_path, generation_error, revision_count',
    )
    .single()
  if (error) throw new Error(error.message)
  return { ...data, will_content: data.will_content as unknown as WillContent }
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
