/**
 * Remove an admin Auth user and related admin_users / user_roles rows.
 *
 * Usage (PowerShell):
 *   $env:ADMIN_EMAIL="scott@myaiwill.com"
 *   node scripts/remove-admin.mjs
 *
 * Needs SUPABASE_SERVICE_ROLE_KEY (Dashboard → Project Settings → API → service_role).
 * Loads VITE_SUPABASE_URL from .env.local if present. Do not commit the service role key.
 */

import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const loaded = { envLocal: false, env: false, serviceRoleChars: 0 }

function loadEnvFile(file) {
  const path = resolve(process.cwd(), file)
  if (!existsSync(path)) return false
  let text = readFileSync(path)
  if (text[0] === 0xff && text[1] === 0xfe) {
    text = text.toString('utf16le')
  } else if (text[0] === 0xfe && text[1] === 0xff) {
    text = Buffer.from(text.subarray(2)).swap16().toString('utf16le')
  } else {
    text = text.toString('utf8').replace(/^\uFEFF/, '')
  }
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim().replace(/^\uFEFF/, '')
    if (!trimmed || trimmed.startsWith('#')) continue
    const i = trimmed.indexOf('=')
    if (i < 0) continue
    const key = trimmed.slice(0, i).trim().replace(/[^\w]/g, '')
    let val = trimmed.slice(i + 1).trim()
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1)
    }
    if (key === 'SUPABASE_SERVICE_ROLE_KEY' || key === 'SERVICE_ROLE_KEY') {
      loaded.serviceRoleChars = val.length
      if (val) process.env[key] = val
      continue
    }
    if (!process.env[key]) process.env[key] = val
  }
  return true
}

loaded.envLocal = loadEnvFile('.env.local')
loaded.env = loadEnvFile('.env')

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const serviceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY
const email = (process.env.ADMIN_EMAIL || 'scott@myaiwill.com').trim().toLowerCase()

if (!url) {
  console.error('Missing VITE_SUPABASE_URL / SUPABASE_URL')
  process.exit(1)
}
if (!serviceKey) {
  console.error(
    'Missing SUPABASE_SERVICE_ROLE_KEY (Dashboard → Project Settings → API → service_role)',
  )
  console.error(
    `cwd=${process.cwd()} .env.local=${loaded.envLocal} .env=${loaded.env} serviceRoleChars=${loaded.serviceRoleChars}`,
  )
  process.exit(1)
}
if (!email) {
  console.error('Missing ADMIN_EMAIL')
  process.exit(1)
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

async function findAuthUserId(targetEmail) {
  const { data: adminRow, error: adminErr } = await supabase
    .from('admin_users')
    .select('user_id, email')
    .ilike('email', targetEmail)
    .maybeSingle()
  if (adminErr) {
    console.error('admin_users lookup failed:', adminErr.message)
  }

  let page = 1
  const perPage = 200
  for (;;) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage })
    if (error) {
      console.error('Auth listUsers failed:', error.message)
      process.exit(1)
    }
    const users = data?.users ?? []
    const match = users.find((u) => (u.email || '').toLowerCase() === targetEmail)
    if (match) return { userId: match.id, inAuth: true, adminUserId: adminRow?.user_id ?? null }
    if (users.length < perPage) {
      return {
        userId: adminRow?.user_id ?? null,
        inAuth: false,
        adminUserId: adminRow?.user_id ?? null,
      }
    }
    page += 1
  }
}

const found = await findAuthUserId(email)
const userId = found.userId

if (!userId) {
  const { error: leftoverErr } = await supabase.from('admin_users').delete().ilike('email', email)
  if (leftoverErr) {
    console.error('No Auth user found; leftover admin_users cleanup failed:', leftoverErr.message)
    process.exit(1)
  }
  console.log('No Auth user found for', email, '— cleaned leftover admin_users rows if any.')
  process.exit(0)
}

console.log('Found user', userId, 'for', email, found.inAuth ? '(in Auth)' : '(admin_users only, not in Auth)')

const { error: rolesErr } = await supabase.from('user_roles').delete().eq('user_id', userId)
if (rolesErr) {
  console.error('Failed to delete user_roles:', rolesErr.message)
  process.exit(1)
}

const { error: adminErr } = await supabase.from('admin_users').delete().eq('user_id', userId)
if (adminErr) {
  console.error('Failed to delete admin_users by user_id:', adminErr.message)
  process.exit(1)
}
const { error: adminEmailErr } = await supabase.from('admin_users').delete().ilike('email', email)
if (adminEmailErr) {
  console.error('Failed to delete admin_users by email:', adminEmailErr.message)
  process.exit(1)
}

const { error: approvedErr } = await supabase
  .from('will_documents')
  .update({ approved_by: null })
  .eq('approved_by', userId)
if (approvedErr) {
  console.warn('Could not clear will_documents.approved_by:', approvedErr.message)
}

if (found.inAuth) {
  const { error: deleteErr } = await supabase.auth.admin.deleteUser(userId)
  if (deleteErr) {
    console.error('Failed to delete Auth user:', deleteErr.message)
    process.exit(1)
  }
} else {
  console.log('Auth user already absent; removed leftover admin_users / user_roles rows.')
}

const { data: remainingAdmins, error: listErr } = await supabase.from('admin_users').select('email')
if (listErr) {
  console.warn('Could not list remaining admin_users:', listErr.message)
} else {
  console.log(
    'Remaining admin_users:',
    (remainingAdmins ?? []).map((r) => r.email).join(', ') || '(none)',
  )
}

console.log('Removed admin user:', email)
process.exit(0)
