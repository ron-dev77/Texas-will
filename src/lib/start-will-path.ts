import { loadQualifierDraft, qualifierComplete } from '@/lib/qualifier'

/** Smart entry: summary if qualify done, otherwise qualify wizard. */
export function startWillPath(): string {
  const draft = loadQualifierDraft()
  return qualifierComplete(draft) ? '/summary' : '/qualify'
}

/** Always start qualify with the chosen plan — do not skip to summary from marketing cards. */
export function qualifyPathForPlan(plan: 'individual' | 'couples'): string {
  return `/qualify?plan=${plan}`
}
