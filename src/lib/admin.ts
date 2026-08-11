import { supabase } from '@/integrations/supabase/client'

const DEMO_ADMIN_KEY = 'myaiwill.admin.demo'

export type AdminRole = 'admin' | 'staff' | 'attorney'

export type OrderRow = {
  id: string
  status: string
  plan_type: string
  user_email: string
  partner_email: string | null
  customer_name: string | null
  partner_name: string | null
  promo_code: string | null
  created_at: string
  submitted_at: string | null
  approved_at: string | null
  delivered_at: string | null
  archived_at: string | null
}

/** Temporary open login — any email/password. Remove when real auth is wired. */
export function isDemoAdmin() {
  return Boolean(localStorage.getItem(DEMO_ADMIN_KEY))
}

export function setDemoAdmin(email: string) {
  localStorage.setItem(DEMO_ADMIN_KEY, email)
}

export function clearDemoAdmin() {
  localStorage.removeItem(DEMO_ADMIN_KEY)
}

export function getDemoAdminEmail() {
  return localStorage.getItem(DEMO_ADMIN_KEY)
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

export async function requireAdminAccess() {
  // Temporary: demo login unlocks admin UI
  if (isDemoAdmin()) {
    return {
      user: { email: getDemoAdminEmail() ?? 'demo@admin.local' },
      roles: ['admin'] as AdminRole[],
      ok: true,
    }
  }

  const user = await getSessionUser()
  if (!user) return { user: null, roles: [] as AdminRole[], ok: false }
  const roles = await getUserRoles(user.id)
  const ok = roles.some((r) => r === 'admin' || r === 'staff')
  return { user, roles, ok }
}

export async function listOrders(includeArchived = true): Promise<OrderRow[]> {
  try {
    let q = supabase
      .from('orders')
      .select(
        'id, status, plan_type, user_email, partner_email, customer_name, partner_name, promo_code, created_at, submitted_at, approved_at, delivered_at, archived_at',
      )
      .order('created_at', { ascending: false })
      .limit(300)

    if (!includeArchived) {
      q = q.is('archived_at', null)
    }

    const { data, error } = await q
    if (error) throw error
    if (data && data.length > 0) return data as OrderRow[]
    // Demo login with empty DB → sample rows so the UI isn’t blank
    if (isDemoAdmin()) return getDemoOrders()
    return []
  } catch {
    if (isDemoAdmin()) return getDemoOrders()
    throw new Error('Could not load orders')
  }
}

/** Sample rows for temporary demo admin (no Supabase session / RLS). */
export function getDemoOrders(): OrderRow[] {
  const now = Date.now()
  const hoursAgo = (h: number) => new Date(now - h * 36e5).toISOString()
  return [
    {
      id: 'demo-order-1',
      status: 'submitted',
      plan_type: 'individual',
      user_email: 'darby@dda.digital',
      partner_email: null,
      customer_name: 'Test',
      partner_name: null,
      promo_code: null,
      created_at: hoursAgo(30),
      submitted_at: hoursAgo(28.7),
      approved_at: null,
      delivered_at: null,
      archived_at: null,
    },
    {
      id: 'demo-order-2',
      status: 'delivered',
      plan_type: 'individual',
      user_email: 'w4e@example.com',
      partner_email: null,
      customer_name: 'w4e',
      partner_name: null,
      promo_code: null,
      created_at: hoursAgo(80),
      submitted_at: hoursAgo(72),
      approved_at: hoursAgo(50),
      delivered_at: hoursAgo(48),
      archived_at: null,
    },
    {
      id: 'demo-order-3',
      status: 'in_review',
      plan_type: 'couples',
      user_email: 'alex@email.com',
      partner_email: 'jordan@email.com',
      customer_name: 'Alex Rivera',
      partner_name: 'Jordan Lee',
      promo_code: 'TEXAS10',
      created_at: hoursAgo(10),
      submitted_at: hoursAgo(8),
      approved_at: null,
      delivered_at: null,
      archived_at: null,
    },
  ]
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
