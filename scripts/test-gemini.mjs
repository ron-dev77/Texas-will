import { readFileSync } from 'node:fs'

function loadEnvLocal() {
  const out = {}
  for (const line of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue
    const i = trimmed.indexOf('=')
    const key = trimmed.slice(0, i).trim()
    let val = trimmed.slice(i + 1).trim()
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1)
    }
    out[key] = val
  }
  return out
}

const env = loadEnvLocal()
const key = env.GOOGLE_AI_API_KEY
const preferred = env.GEMINI_MODEL || 'gemini-2.5-flash'
const candidates = [
  preferred,
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-flash-latest',
].filter((m, i, arr) => arr.indexOf(m) === i)

if (!key) {
  console.log('STATUS=fail')
  console.log('REASON=GOOGLE_AI_API_KEY missing in .env.local')
  process.exit(1)
}

for (const model of candidates) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: 'Reply with exactly: OK' }] }],
      generationConfig: { maxOutputTokens: 16, temperature: 0 },
    }),
  })
  const json = await res.json()
  if (res.ok) {
    const text =
      json.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || ''
    console.log('STATUS=ok')
    console.log(`MODEL=${model}`)
    console.log(`REPLY=${text.trim()}`)
    console.log(`KEY_LEN=${key.length}`)
    process.exit(0)
  }
  console.log(
    `TRY=${model} HTTP=${res.status} ${(json.error?.message || '').slice(0, 160)}`,
  )
}

console.log('STATUS=fail')
process.exit(1)
