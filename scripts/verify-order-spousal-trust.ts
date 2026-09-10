/**
 * Verify why admin shows 5 vs 6 documents for spousal-trust orders.
 *
 * Usage:
 *   npx vite-node scripts/verify-order-spousal-trust.ts
 *   npx vite-node scripts/verify-order-spousal-trust.ts ronprynn7@gmail.com
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY + VITE_SUPABASE_URL in .env.local
 */
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const PACKAGE_DOC_IDS = ['will', 'mpoa', 'dpoa', 'directive', 'hipaa'] as const
type PackageDocId = (typeof PACKAGE_DOC_IDS)[number]
type DocumentKind = PackageDocId | 'spousal_trust' | 'rlt'

const DOCUMENT_KIND_LABEL: Record<DocumentKind, string> = {
  will: 'Last Will and Testament',
  rlt: 'Revocable Living Trust',
  spousal_trust: 'Spousal Testamentary Trust',
  mpoa: 'Medical Power of Attorney',
  dpoa: 'Durable Power of Attorney',
  directive: 'Directive to Physicians',
  hipaa: 'HIPAA Release',
}

function normalizeOrderDocuments(raw: unknown): PackageDocId[] {
  const fromRaw = Array.isArray(raw)
    ? raw.filter((id): id is PackageDocId =>
        (PACKAGE_DOC_IDS as readonly string[]).includes(String(id)),
      )
    : []
  const withoutWill = fromRaw.filter((id) => id !== 'will')
  return ['will', ...withoutWill]
}

function orderHasSpousalTrust(addOns: unknown): boolean {
  const o = (addOns ?? {}) as {
    spousal_trust?: boolean
    qualifier?: { spousalTrustChoice?: string } | null
  }
  return (
    Boolean(o.spousal_trust) || o.qualifier?.spousalTrustChoice === 'spousal_trust'
  )
}

function orderedDocumentKindsForDelivery(params: {
  documents: unknown
  includeTrust: boolean
  includeSpousalTrust?: boolean
}): DocumentKind[] {
  const docs = normalizeOrderDocuments(params.documents)
  const kinds: DocumentKind[] = []
  if (docs.includes('will')) kinds.push('will')
  for (const id of docs) {
    if (id === 'will') continue
    kinds.push(id as DocumentKind)
  }
  if (params.includeSpousalTrust) kinds.push('spousal_trust')
  if (params.includeTrust) kinds.push('rlt')
  return kinds
}

function loadEnvFile(file: string) {
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

type OrderRow = {
  id: string
  user_email: string | null
  plan_type: string | null
  amount_paid: number | null
  status: string | null
  add_ons: unknown
  created_at: string | null
}

function analyzeOrder(order: OrderRow) {
  const addOns = (order.add_ons ?? {}) as Record<string, unknown>
  const includeTrust = Boolean(addOns.trust)
  const includeSpousal = orderHasSpousalTrust(addOns)
  const kinds = orderedDocumentKindsForDelivery({
    documents: addOns.documents,
    includeTrust,
    includeSpousalTrust: includeSpousal,
  })
  const amountDollars = Math.round(Number(order.amount_paid ?? 0) / 100)
  const spousalCents = Number(addOns.spousal_trust_cents ?? 0)
  const qualifier = addOns.qualifier as { spousalTrustChoice?: string } | null | undefined

  const issues: string[] = []
  if (amountDollars >= 649 && !includeSpousal) {
    issues.push('Paid $649+ but orderHasSpousalTrust is false — admin will show 5 tabs, not 6')
  }
  if (amountDollars === 249 && !includeSpousal) {
    issues.push('Paid $249 only — spousal trust was not included at checkout')
  }
  if (includeSpousal && !kinds.includes('spousal_trust')) {
    issues.push('Spousal flag true but spousal_trust kind missing from delivery list (bug)')
  }
  if (spousalCents >= 40000 && !Boolean(addOns.spousal_trust)) {
    issues.push('spousal_trust_cents set but spousal_trust boolean is false')
  }
  if (qualifier?.spousalTrustChoice === 'spousal_trust' && !Boolean(addOns.spousal_trust)) {
    issues.push('qualifier says spousal_trust but add_ons.spousal_trust is false')
  }

  return {
    amountDollars,
    includeSpousal,
    spousalCents,
    spousalTrustFlag: Boolean(addOns.spousal_trust),
    qualifierChoice: qualifier?.spousalTrustChoice ?? null,
    documents: addOns.documents,
    adminDocCount: kinds.length,
    adminDocLabels: kinds.map((k) => DOCUMENT_KIND_LABEL[k]),
    issues,
  }
}

function printOrderReport(order: OrderRow) {
  const report = analyzeOrder(order)
  console.log('---')
  console.log(`Order ID:     ${order.id}`)
  console.log(`Email:        ${order.user_email}`)
  console.log(`Plan:         ${order.plan_type}`)
  console.log(`Status:       ${order.status}`)
  console.log(`Created:      ${order.created_at}`)
  console.log(`Amount paid:  $${report.amountDollars}`)
  console.log(`spousal_trust flag:     ${report.spousalTrustFlag}`)
  console.log(`spousal_trust_cents:  ${report.spousalCents}`)
  console.log(`qualifier choice:     ${report.qualifierChoice ?? '—'}`)
  console.log(`orderHasSpousalTrust: ${report.includeSpousal}`)
  console.log(`Admin doc count:      ${report.adminDocCount}`)
  console.log(`Admin documents:`)
  for (const label of report.adminDocLabels) {
    console.log(`  - ${label}`)
  }
  if (report.issues.length === 0) {
    console.log('Result: OK — admin document list matches order flags')
  } else {
    console.log('Issues:')
    for (const issue of report.issues) {
      console.log(`  ! ${issue}`)
    }
  }
}

function runLocalFixtures() {
  console.log('\n=== Local fixture checks ===\n')

  const fullPackage = {
    trust: false,
    spousal_trust: true,
    spousal_trust_cents: 40000,
    documents: ['will', 'mpoa', 'dpoa', 'directive', 'hipaa'],
    qualifier: { spousalTrustChoice: 'spousal_trust' },
  }
  const r1 = analyzeOrder({
    id: 'fixture-full',
    user_email: 'test@example.com',
    plan_type: 'individual',
    amount_paid: 64900,
    status: 'submitted',
    add_ons: fullPackage,
    created_at: null,
  })
  console.log(
    r1.adminDocCount === 6 && r1.includeSpousal
      ? 'OK: full spousal + all docs → 6 admin tabs'
      : `FAIL: expected 6 tabs, got ${r1.adminDocCount}`,
  )

  const missingFlag = {
    trust: false,
    spousal_trust: false,
    spousal_trust_cents: 40000,
    documents: ['will', 'mpoa', 'dpoa', 'directive', 'hipaa'],
    qualifier: { spousalTrustChoice: 'spousal_trust' },
  }
  const r2 = analyzeOrder({
    id: 'fixture-qualifier-only',
    user_email: 'test@example.com',
    plan_type: 'individual',
    amount_paid: 64900,
    status: 'submitted',
    add_ons: missingFlag,
    created_at: null,
  })
  console.log(
    r2.adminDocCount === 6 && r2.includeSpousal
      ? 'OK: qualifier fallback → 6 tabs even if spousal_trust flag false'
      : `FAIL: qualifier fallback broken (${r2.adminDocCount} tabs)`,
  )

  const willOnly = {
    trust: false,
    spousal_trust: false,
    documents: ['will'],
  }
  const r3 = analyzeOrder({
    id: 'fixture-will-only',
    user_email: 'test@example.com',
    plan_type: 'individual',
    amount_paid: 24900,
    status: 'submitted',
    add_ons: willOnly,
    created_at: null,
  })
  console.log(
    r3.adminDocCount === 1
      ? 'OK: will-only order → 1 admin tab'
      : `FAIL: expected 1 tab, got ${r3.adminDocCount}`,
  )
}

async function main() {
  runLocalFixtures()

  const email = (process.argv[2] || 'ronprynn7@gmail.com').trim().toLowerCase()
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY

  console.log(`\n=== Live orders for ${email} ===\n`)

  if (!url || !serviceKey) {
    console.log(
      'SKIP: Set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local to check live orders.',
    )
    process.exit(0)
  }

  const sb = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data, error } = await sb
    .from('orders')
    .select('id, user_email, plan_type, amount_paid, status, add_ons, created_at')
    .eq('user_email', email)
    .order('created_at', { ascending: false })
    .limit(5)

  if (error) {
    console.error('Supabase error:', error.message)
    process.exit(1)
  }

  if (!data?.length) {
    console.log('No orders found for that email.')
    process.exit(0)
  }

  for (const order of data as OrderRow[]) {
    printOrderReport(order)
  }

  const latest = data[0] as OrderRow
  const latestReport = analyzeOrder(latest)
  if (latestReport.issues.length > 0) {
    process.exit(1)
  }
}

void main()
