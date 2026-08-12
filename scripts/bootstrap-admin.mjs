import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

/**
 * One-time bootstrap: create allowlisted admin Auth user.
 * Usage:
 *   $env:ADMIN_EMAIL="ronprynn77@outlook.com"
 *   $env:ADMIN_PASSWORD="your-password"
 *   node scripts/bootstrap-admin.mjs
 *
 * Loads VITE_SUPABASE_* from .env.local. Do not commit passwords.
 */

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

const url = process.env.VITE_SUPABASE_URL
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY
const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase()
const password = process.env.ADMIN_PASSWORD || ''

const ALLOWLIST = new Set(['ronprynn77@outlook.com', 'scott@myaiwill.com'])

if (!url || !key) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY')
  process.exit(1)
}
if (!email || !password) {
  console.error('Missing ADMIN_EMAIL or ADMIN_PASSWORD')
  process.exit(1)
}
if (!ALLOWLIST.has(email)) {
  console.error('Email is not on the admin allowlist')
  process.exit(1)
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const { data: signedIn, error: signInError } = await supabase.auth.signInWithPassword({
  email,
  password,
})

if (!signInError && signedIn.user) {
  console.log('User already exists and password works:', signedIn.user.id)
  process.exit(0)
}

const { data: signedUp, error: signUpError } = await supabase.auth.signUp({
  email,
  password,
})

if (signUpError) {
  console.error('Sign up failed:', signUpError.message)
  process.exit(1)
}

if (!signedUp.user) {
  console.error('Sign up returned no user')
  process.exit(1)
}

if (!signedUp.session) {
  console.log(
    'User created but email confirmation is required. Disable "Confirm email" in Supabase Auth settings, or confirm the email, then sign in.',
  )
  console.log('User id:', signedUp.user.id)
  process.exit(0)
}

console.log('Admin user created and signed in:', signedUp.user.id)
process.exit(0)
