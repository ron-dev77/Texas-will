/** People named earlier in the questionnaire — for agent/rep pick lists. */

export type NamedPerson = {
  name: string
  role: string
}

export const PERSON_NAME_FIELD_IDS = new Set([
  'mpoa_agent_name',
  'mpoa_alt_agent_name',
  'mpoa_alt2_agent_name',
  'dpoa_agent_name',
  'dpoa_alt_agent_name',
  'dpoa_alt2_agent_name',
  'hipaa_rep1_name',
  'hipaa_rep2_name',
  'hipaa_rep3_name',
  'hipaa_rep4_name',
])

function addPerson(
  seen: Set<string>,
  out: NamedPerson[],
  name: unknown,
  role: string,
) {
  const n = typeof name === 'string' ? name.trim() : ''
  if (n.length < 2) return
  const key = n.toLowerCase()
  if (seen.has(key)) return
  seen.add(key)
  out.push({ name: n, role })
}

/** Collect unique names from will-related answers answered before POA / HIPAA steps. */
export function collectNamedPeople(answers: Record<string, unknown>): NamedPerson[] {
  const seen = new Set<string>()
  const out: NamedPerson[] = []

  addPerson(seen, out, answers.spouse_full_name, 'Spouse or partner')
  addPerson(seen, out, answers.executor_name, 'Executor')
  addPerson(seen, out, answers.alt_executor_name, 'Alternate executor')
  addPerson(seen, out, answers.primary_guardian_name, 'Guardian')
  addPerson(seen, out, answers.alternate_guardian_name, 'Alternate guardian')
  addPerson(seen, out, answers.spousal_trust_alternate_trustee_name, 'Spousal trust alternate trustee')
  addPerson(seen, out, answers.spousal_trust_co_trustee_name, 'Co-trustee')
  addPerson(seen, out, answers.snt_trustee_name, 'Special needs trustee')
  addPerson(seen, out, answers.snt_successor_trustee_name, 'Special needs successor trustee')

  if (Array.isArray(answers.children)) {
    for (const row of answers.children) {
      const r = row as { name?: string }
      addPerson(seen, out, r?.name, 'Child')
    }
  }

  return out
}

export function supportsPersonPicker(fieldId: string) {
  return PERSON_NAME_FIELD_IDS.has(fieldId)
}
