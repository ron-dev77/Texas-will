/** Edge copy of notary Maps helpers (keep in sync with src/lib/notary.ts). */

const ZIP_RE = /^\d{5}$/

export function isValidUsZip(zip: string): boolean {
  return ZIP_RE.test(zip.trim())
}

export function notaryMapsSearchUrl(zip?: string | null): string {
  const z = (zip ?? '').trim()
  const query = isValidUsZip(z) ? `notary near ${z}` : 'notary near me'
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
}

export function notaryFinderPageUrl(origin: string, zip?: string | null): string {
  const base = origin.replace(/\/$/, '')
  const z = (zip ?? '').trim()
  if (isValidUsZip(z)) return `${base}/notary?zip=${encodeURIComponent(z)}`
  return `${base}/notary`
}
