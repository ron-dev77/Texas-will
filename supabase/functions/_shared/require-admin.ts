import { createClient, type SupabaseClient, type User } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

export function adminClient(): SupabaseClient {
  const url = Deno.env.get('SUPABASE_URL')
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !key) throw new Error('Missing Supabase service credentials')
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export async function requireAdmin(
  req: Request,
): Promise<{ user: User; sb: SupabaseClient } | { error: string; status: 401 | 403 }> {
  const auth = req.headers.get('Authorization')
  if (!auth?.startsWith('Bearer ')) {
    return { error: 'Missing authorization', status: 401 }
  }
  const url = Deno.env.get('SUPABASE_URL')
  const anon = Deno.env.get('SUPABASE_ANON_KEY')
  if (!url || !anon) throw new Error('Missing Supabase anon credentials')

  const userClient = createClient(url, anon, {
    global: { headers: { Authorization: auth } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: userData, error: userErr } = await userClient.auth.getUser()
  if (userErr || !userData.user) {
    return { error: 'Invalid session', status: 401 }
  }

  const sb = adminClient()
  const { data: roles } = await sb
    .from('user_roles')
    .select('role')
    .eq('user_id', userData.user.id)

  const ok = (roles ?? []).some((r) => r.role === 'admin' || r.role === 'staff')
  if (!ok) return { error: 'Admin access required', status: 403 }

  return { user: userData.user, sb }
}
