/**
 * Set Auth password for an existing user by UID (service role required).
 *
 * Usage (PowerShell):
 *   $env:SUPABASE_SERVICE_ROLE_KEY="eyJ..."
 *   $env:USER_ID="261a1f5c-2158-4b08-8131-e1bea298ef01"
 *   $env:NEW_PASSWORD="your-password"
 *   node scripts/set-user-password.mjs
 *
 * Loads VITE_SUPABASE_URL from .env.local if present.
 * Do not commit passwords or the service role key.
 */

import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

function loadEnvFile(file) {
  const path = resolve(process.cwd(), file)
  if (!existsSync(path)) return
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const i = trimmed.indexOf('=')
    if (i < 0) continue
    const key = trimmed.slice(0, i).trim()
    let val = trimmed.slice(i + 1).trim()
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1)
    }
    if (!process.env[key]) process.env[key] = val
  }
}

loadEnvFile('.env.local')
loadEnvFile('.env')

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const serviceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY
const userId = (process.env.USER_ID || '').trim()
const password = process.env.NEW_PASSWORD || ''

if (!url) {
  console.error('Missing VITE_SUPABASE_URL / SUPABASE_URL')
  process.exit(1)
}
if (!serviceKey) {
  console.error(
    'Missing SUPABASE_SERVICE_ROLE_KEY (Dashboard → Project Settings → API → service_role)',
  )
  process.exit(1)
}
if (!userId) {
  console.error('Missing USER_ID')
  process.exit(1)
}
if (!password || password.length < 6) {
  console.error('NEW_PASSWORD must be at least 6 characters')
  process.exit(1)
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const { data, error } = await supabase.auth.admin.updateUserById(userId, {
  password,
  email_confirm: true,
})

if (error) {
  console.error('Failed to update password:', error.message)
  process.exit(1)
}

console.log('Password updated for user:', data.user?.id)
console.log('Email:', data.user?.email)
process.exit(0)
