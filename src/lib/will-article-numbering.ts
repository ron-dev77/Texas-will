/** Roman numerals and article index helpers shared across will clause builders. */

export const WILL_ARTICLE_ROMANS = [
  'I',
  'II',
  'III',
  'IV',
  'V',
  'VI',
  'VII',
  'VIII',
  'IX',
  'X',
  'XI',
  'XII',
] as const

export function romanNumeralFromIndex(n: number): string {
  return WILL_ARTICLE_ROMANS[n - 1] ?? String(n)
}

export function articleArabicFromRoman(roman: string): number {
  const idx = WILL_ARTICLE_ROMANS.indexOf(roman as (typeof WILL_ARTICLE_ROMANS)[number])
  return idx >= 0 ? idx + 1 : 6
}

export function romanIndex(roman: string): number {
  const idx = WILL_ARTICLE_ROMANS.indexOf(roman as (typeof WILL_ARTICLE_ROMANS)[number])
  return idx >= 0 ? idx + 1 : 0
}
