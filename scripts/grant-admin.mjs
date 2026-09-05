/**
 * Grant admin portal access to an existing Supabase Auth user.
 *
 * Usage (PowerShell):
 *   $env:ADMIN_EMAIL="scott@myaiwill.com"
 *   $env:ADMIN_PASSWORD="their-password"   # required if Auth user does not exist yet
 *   $env:ADMIN_ROLE="admin"                # optional: admin | staff (default admin)
 *   node scripts/grant-admin.mjs
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY in .env.local (Dashboard → API → service_role).
 * Creates Auth user when missing (email pre-confirmed), else confirms email, then grants roles.
 */

import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

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
    if (!process.env[key]) process.env[key] = val
  }
  return true
}

loadEnvFile('.env.local')
loadEnvFile('.env')

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const serviceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY
const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase()
const password = process.env.ADMIN_PASSWORD || ''
const role = (process.env.ADMIN_ROLE || 'admin').trim().toLowerCase()

if (!url) {
  console.error('Missing VITE_SUPABASE_URL / SUPABASE_URL')
  process.exit(1)
}
if (!serviceKey) {
  console.error(
    'Missing SUPABASE_SERVICE_ROLE_KEY — add it to .env.local from Supabase Dashboard → Project Settings → API → service_role',
  )
  process.exit(1)
}
if (!email) {
  console.error('Missing ADMIN_EMAIL')
  process.exit(1)
}
if (role !== 'admin' && role !== 'staff') {
  console.error('ADMIN_ROLE must be admin or staff')
  process.exit(1)
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

async function findAuthUser(targetEmail) {
  let page = 1
  const perPage = 200
  for (;;) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage })
    if (error) throw new Error(`Auth listUsers failed: ${error.message}`)
    const users = data?.users ?? []
    const match = users.find((u) => (u.email || '').toLowerCase() === targetEmail)
    if (match) return match
    if (users.length < perPage) return null
    page += 1
  }
}

async function grantRoles(userId) {
  const { error: roleErr } = await supabase.from('user_roles').upsert(
    { user_id: userId, role },
    { onConflict: 'user_id,role' },
  )
  if (roleErr) throw new Error(`user_roles insert failed: ${roleErr.message}`)
  console.log(`Granted role "${role}" in user_roles`)

  const { error: adminErr } = await supabase.from('admin_users').upsert(
    { user_id: userId, email },
    { onConflict: 'user_id' },
  )
  if (adminErr) throw new Error(`admin_users insert failed: ${adminErr.message}`)
  console.log('Added to admin_users')
}

try {
  let user = await findAuthUser(email)
  if (!user) {
    if (!password) {
      console.error(
        `No Auth user found for ${email}. Set ADMIN_PASSWORD and re-run to create the account.`,
      )
      process.exit(1)
    }
    const { data: created, error: createErr } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })
    if (createErr || !created.user) {
      throw new Error(createErr?.message || 'createUser returned no user')
    }
    user = created.user
    console.log('Created Auth user (email confirmed):', user.id)
  }

  if (!user.email_confirmed_at) {
    const { data: updated, error: confirmErr } = await supabase.auth.admin.updateUserById(
      user.id,
      { email_confirm: true },
    )
    if (confirmErr) throw new Error(`Email confirm failed: ${confirmErr.message}`)
    console.log('Email confirmed for', email)
    if (updated.user?.email_confirmed_at) {
      console.log('  confirmed_at:', updated.user.email_confirmed_at)
    }
  } else {
    console.log('Email already confirmed for', email)
  }

  if (password) {
    const { error: pwErr } = await supabase.auth.admin.updateUserById(user.id, {
      password,
    })
    if (pwErr) throw new Error(`Password update failed: ${pwErr.message}`)
    console.log('Password updated for', email)
  }

  await grantRoles(user.id)

  console.log('Done. User can sign in at /auth with', email)
} catch (err) {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
}
