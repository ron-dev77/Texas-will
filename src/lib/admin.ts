import { supabase } from '@/integrations/supabase/client'

export type AdminRole = 'admin' | 'staff' | 'attorney'

/** Emails that may self-register once via /auth (DB trigger also grants admin). */
export const ADMIN_SIGNUP_ALLOWLIST = new Set([
  'ronprynn77@outlook.com',
  'scott@myaiwill.com',
])

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
  const roles = await getUserRoles(user.id)
  const ok = hasAdminPortalAccess(roles)
  return { user, roles, ok }
}

export async function signInAdmin(email: string, password: string) {
  const normalized = email.trim().toLowerCase()

  const { data: signedIn, error: signInError } = await supabase.auth.signInWithPassword({
    email: normalized,
    password,
  })

  if (!signInError && signedIn.user) {
    const roles = await getUserRoles(signedIn.user.id)
    if (!hasAdminPortalAccess(roles)) {
      await supabase.auth.signOut()
      throw new Error('This account is not authorized for admin access.')
    }
    return { user: signedIn.user, roles }
  }

  const canBootstrap =
    ADMIN_SIGNUP_ALLOWLIST.has(normalized) &&
    (signInError?.message?.toLowerCase().includes('invalid') ||
      signInError?.message?.toLowerCase().includes('credentials'))

  if (!canBootstrap) {
    throw new Error(signInError?.message || 'Sign in failed')
  }

  const { data: signedUp, error: signUpError } = await supabase.auth.signUp({
    email: normalized,
    password,
  })

  if (signUpError) {
    throw new Error(signUpError.message)
  }

  if (!signedUp.session || !signedUp.user) {
    throw new Error(
      'Account created, but email confirmation is required. In Supabase → Authentication → Providers → Email, turn off “Confirm email”, then sign in again.',
    )
  }

  // Trigger may need a moment; re-check roles
  let roles = await getUserRoles(signedUp.user.id)
  if (!hasAdminPortalAccess(roles)) {
    await new Promise((r) => setTimeout(r, 400))
    roles = await getUserRoles(signedUp.user.id)
  }
  if (!hasAdminPortalAccess(roles)) {
    await supabase.auth.signOut()
    throw new Error(
      'Signed up, but admin role was not assigned. Ensure migrations are pushed (handle_admin_signup trigger).',
    )
  }

  return { user: signedUp.user, roles }
}

export async function listOrders(includeArchived = true): Promise<OrderRow[]> {
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
  return (data ?? []) as OrderRow[]
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
