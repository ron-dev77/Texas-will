import { supabase } from '@/integrations/supabase/client'

export type AdminRole = 'admin' | 'staff' | 'attorney'

/**
 * Bootstrap allowlist for scripts/bootstrap-admin.mjs only.
 * Admin login never creates users — accounts must already exist in Auth
 * and have a row in user_roles / admin_users.
 */
export const ADMIN_SIGNUP_ALLOWLIST = new Set(['ronprynn77@outlook.com'])

export type OrderRow = {
  id: string
  status: string
  plan_type: string
  user_email: string
  partner_email: string | null
  customer_name: string | null
  partner_name: string | null
  promo_code: string | null
  questionnaire_form_id?: string | null
  created_at: string
  submitted_at: string | null
  approved_at: string | null
  delivered_at: string | null
  archived_at: string | null
}

export async function getSessionUser() {
  const { data, error } = await supabase.auth.getUser()
  if (error) throw error
  return data.user
}

export async function getUserRoles(userId: string): Promise<AdminRole[]> {
  const { data, error } = await supabase.from('user_roles').select('role').eq('user_id', userId)
  if (error) throw error
  return (data ?? []).map((r) => r.role as AdminRole)
}

export function hasAdminPortalAccess(roles: AdminRole[]) {
  return roles.some((r) => r === 'admin' || r === 'staff')
}

export async function requireAdminAccess() {
  const user = await getSessionUser()
  if (!user) return { user: null, roles: [] as AdminRole[], ok: false }
  if (!user.email_confirmed_at) {
    await supabase.auth.signOut().catch(() => undefined)
    return { user: null, roles: [] as AdminRole[], ok: false }
  }
  const roles = await getUserRoles(user.id)
  const ok = hasAdminPortalAccess(roles)
  if (!ok) {
    await supabase.auth.signOut().catch(() => undefined)
    return { user, roles, ok: false }
  }
  return { user, roles, ok }
}

/**
 * Admin portal login only — never creates a user.
 * Requires an existing Auth user that is email-verified and has admin/staff role.
 */
export async function signInAdmin(email: string, password: string) {
  const normalized = email.trim().toLowerCase()

  const { data, error } = await supabase.auth.signInWithPassword({
    email: normalized,
    password,
  })

  if (error || !data.user) {
    const msg = (error?.message || '').toLowerCase()
    if (msg.includes('invalid') || msg.includes('credentials') || msg.includes('email not confirmed')) {
      if (msg.includes('email not confirmed')) {
        throw new Error(
          'This account is not verified yet. Confirm the email in Supabase Auth, then sign in.',
        )
      }
      throw new Error('Invalid email or password.')
    }
    throw new Error(error?.message || 'Sign in failed')
  }

  if (!data.user.email_confirmed_at) {
    await supabase.auth.signOut()
    throw new Error(
      'This account is not verified yet. Confirm the email in Supabase Auth, then sign in.',
    )
  }

  const roles = await getUserRoles(data.user.id)
  if (!hasAdminPortalAccess(roles)) {
    await supabase.auth.signOut()
    throw new Error('This account is not authorized for admin access.')
  }

  return { user: data.user, roles }
}

export async function listOrders(includeArchived = true): Promise<OrderRow[]> {
  const withFormId =
    'id, status, plan_type, user_email, partner_email, customer_name, partner_name, promo_code, questionnaire_form_id, created_at, submitted_at, approved_at, delivered_at, archived_at'
  const withoutFormId =
    'id, status, plan_type, user_email, partner_email, customer_name, partner_name, promo_code, created_at, submitted_at, approved_at, delivered_at, archived_at'

  async function run(select: string) {
    let q = supabase
      .from('orders')
      .select(select)
      .order('created_at', { ascending: false })
      .limit(300)
    if (!includeArchived) q = q.is('archived_at', null)
    return q
  }

  const first = await run(withFormId)
  if (!first.error) return (first.data ?? []) as unknown as OrderRow[]

  // Column missing until migration is applied — fall back so the queue still loads.
  const msg = first.error.message?.toLowerCase() ?? ''
  if (msg.includes('questionnaire_form_id') || first.error.code === '42703') {
    const second = await run(withoutFormId)
    if (second.error) throw second.error
    return ((second.data ?? []) as unknown as OrderRow[]).map((row) => ({
      ...row,
      questionnaire_form_id: null,
    }))
  }

  throw first.error
}

export function canDeleteOrder(_order: Pick<OrderRow, 'status' | 'archived_at'>) {
  return true
}

export async function archiveOrder(orderId: string, archived: boolean): Promise<void> {
  const { error } = await supabase
    .from('orders')
    .update({ archived_at: archived ? new Date().toISOString() : null })
    .eq('id', orderId)
  if (error) throw new Error(error.message)

  const {
    data: { user },
  } = await supabase.auth.getUser()
  const { error: eventError } = await supabase.from('will_status_events').insert({
    order_id: orderId,
    partner_number: null,
    status: archived ? 'archived' : 'unarchived',
    created_by: user?.id ?? null,
  })
  if (eventError) {
    console.error('Failed to log archive event', eventError)
  }
}

export async function deleteOrder(orderId: string): Promise<void> {
  const { data: order, error: oErr } = await supabase
    .from('orders')
    .select('id')
    .eq('id', orderId)
    .single()
  if (oErr || !order) throw new Error(oErr?.message ?? 'Order not found')

  // Best-effort child cleanup (most FKs cascade, but grants/RLS may still require explicit deletes)
  await supabase.from('will_status_events').delete().eq('order_id', orderId)
  await supabase.from('will_documents').delete().eq('order_id', orderId)
  await supabase.from('questionnaire_answers').delete().eq('order_id', orderId)
  const { error: dErr } = await supabase.from('orders').delete().eq('id', orderId)
  if (dErr) throw new Error(dErr.message)
}

export const STATUS_LABEL: Record<string, string> = {
  pending_payment: 'Pending payment',
  paid: 'Paid',
  submitted: 'Pending Review',
  in_review: 'In Review',
  ready_for_review: 'Pending Review',
  reviewed: 'Reviewed',
  approved: 'Approved',
  delivered: 'Delivered',
  needs_revision: 'Needs Revision',
  failed: 'Failed',
}

export const STATUS_TONE: Record<string, string> = {
  submitted: 'bg-amber-100 text-amber-900',
  ready_for_review: 'bg-amber-100 text-amber-900',
  in_review: 'bg-sky-100 text-sky-900',
  approved: 'bg-emerald-100 text-emerald-900',
  delivered: 'bg-emerald-600 text-white',
  needs_revision: 'bg-red-100 text-red-900',
  paid: 'bg-secondary text-muted-foreground',
  pending_payment: 'bg-secondary text-muted-foreground',
  reviewed: 'bg-violet-100 text-violet-900',
  failed: 'bg-red-100 text-red-900',
}
