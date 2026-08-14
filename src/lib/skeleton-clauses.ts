/**
 * Computed {{clause_*}} tokens for the default Texas will skeleton.
 * Filled values use **bold** markers for PDF rich-text rendering.
 */

type Answers = Record<string, unknown>

export type SkeletonFillOptions = {
  /** Order purchased living-trust add-on → pour-over residuary language */
  includeTrust?: boolean
}

function str(v: unknown, fallback = '') {
  return typeof v === 'string' ? v.trim() : fallback
}

function plain(text: string) {
  return text
    .replace(/[—–]/g, '-')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

function bold(s: string) {
  const t = plain(s)
  return t ? `**${t}**` : ''
}

function formatDate(value: string) {
  const v = plain(value)
  if (!v) return ''
  const iso = v.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (iso) return `${iso[2]}/${iso[3]}/${iso[1]}`
  return v
}

function firstName(full: string) {
  const t = plain(full)
  if (!t) return ''
  return t.split(/\s+/)[0] || t
}

function peopleList(v: unknown): { name: string; date_of_birth?: string }[] {
  if (!Array.isArray(v)) return []
  return v
    .map((row) => {
      if (!row || typeof row !== 'object') return null
      const r = row as Record<string, unknown>
      const name = str(r.name)
      if (!name) return null
      return { name, date_of_birth: str(r.date_of_birth) || undefined }
    })
    .filter(Boolean) as { name: string; date_of_birth?: string }[]
}

function giftList(v: unknown): { item: string; recipient: string }[] {
  if (!Array.isArray(v)) return []
  return v
    .map((row) => {
      if (!row || typeof row !== 'object') return null
      const r = row as Record<string, unknown>
      const item = str(r.item)
      const recipient = str(r.recipient)
      if (!item && !recipient) return null
      return { item, recipient }
    })
    .filter(Boolean) as { item: string; recipient: string }[]
}

function formatScalar(v: unknown): string | null {
  if (v == null || v === '') return null
  if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
    return plain(String(v))
  }
  return null
}

function formatArrayValue(v: unknown[]): string {
  return v
    .map((row) => {
      if (row && typeof row === 'object') {
        const o = row as Record<string, unknown>
        if (o.name) {
          const d = formatDate(str(o.date_of_birth))
          return d ? `${bold(str(o.name))}, born ${bold(d)}` : bold(str(o.name))
        }
        const item = str(o.item)
        const recipient = str(o.recipient)
        if (item || recipient) {
          return `${bold(item || 'the described property')} to ${bold(recipient || '[recipient]')}`
        }
        return [o.name, o.item, o.recipient].filter(Boolean).join(' — ') || JSON.stringify(row)
      }
      return String(row)
    })
    .filter(Boolean)
    .join('; ')
}

/** Resolve a single {{token}} id to replacement text (may include **bold**). */
export function resolveSkeletonToken(
  id: string,
  answers: Answers,
  options: SkeletonFillOptions = {},
): string | null {
  const key = id.toLowerCase()

  const computed = COMPUTED[key]
  if (computed) return computed(answers, options)

  const raw = answers[key] ?? answers[id]
  if (raw == null || raw === '') return null

  if (Array.isArray(raw)) return formatArrayValue(raw)

  const labeled = ANCILLARY_LABELS[key]
  if (labeled && typeof raw === 'string') {
    return labeled[raw] ?? plain(raw)
  }

  const scalar = formatScalar(raw)
  if (scalar == null) return String(raw)
  // Plain fields: skeleton should wrap as **{{field}}** when bold is desired
  return scalar
}

const ANCILLARY_LABELS: Record<string, Record<string, string>> = {
  dpoa_when_effective: {
    immediately: 'Immediately when I sign',
    incapacity: 'Only if I become incapacitated',
  },
  directive_preference: {
    no_prolong: 'Do not prolong my life with life-sustaining treatment',
    prolong: 'I want life-sustaining treatment continued',
    agent_decides: 'Let my medical agent decide',
  },
  hipaa_include_agents: {
    yes: 'Yes',
    no: 'No',
  },
  trust_residuary_plan: {
    same_as_will: "Same beneficiaries and shares as my will's residuary",
    custom: 'A custom residuary split as described below',
  },
}

const COMPUTED: Record<
  string,
  (answers: Answers, options: SkeletonFillOptions) => string
> = {
  executor_first_name(answers) {
    const n = plain(str(answers.executor_name))
    return n ? bold(firstName(n)) : '{{executor_first_name}}'
  },
  guardian_first_name(answers) {
    const n = plain(str(answers.primary_guardian_name))
    return n ? bold(firstName(n)) : '{{guardian_first_name}}'
  },
  clause_marital(answers) {
    const marital = str(answers.marital_status)
    const spouse = plain(str(answers.spouse_full_name))
    const marriageDate = formatDate(str(answers.marriage_date))
    if ((marital === 'married' || marital === 'domestic_partnership') && spouse) {
      if (marital === 'domestic_partnership') {
        return `I am in a domestic partnership with ${bold(spouse)} as of the date of this Will.`
      }
      return marriageDate
        ? `I am married to ${bold(spouse)}. We were married on ${bold(marriageDate)}.`
        : `I am married to ${bold(spouse)}.`
    }
    if (marital === 'divorced') return 'I am divorced and not currently married.'
    if (marital === 'widowed') return 'I am widowed and not currently married.'
    if (marital === 'single' || marital) return 'I am not currently married.'
    return 'I am not currently married.'
  },
  clause_children(answers) {
    const hasChildren = answers.has_children === 'yes'
    const children = peopleList(answers.children)
    if (hasChildren && children.length > 0) {
      const list = children
        .map((c) => {
          const n = plain(c.name)
          const d = formatDate(c.date_of_birth || '')
          return d ? `${bold(n)}, born ${bold(d)}` : bold(n)
        })
        .join('; ')
      return `I have the following children: ${list}.`
    }
    return 'I have no children.'
  },
  clause_executor_appointment(answers) {
    const executor = plain(str(answers.executor_name))
    const alt = plain(str(answers.alt_executor_name))
    const rel = plain(str(answers.executor_relationship))
    const altRel = plain(str(answers.alt_executor_relationship))
    if (!executor) {
      return 'I appoint {{executor_name}} as Independent Executor of this Will. If {{executor_first_name}} is unable or unwilling to serve, I appoint {{alt_executor_name}} as successor Independent Executor.'
    }
    const primary = rel
      ? `I appoint ${bold(executor)}, my ${rel.toLowerCase()}, as Independent Executor of this Will.`
      : `I appoint ${bold(executor)} as Independent Executor of this Will.`
    if (alt) {
      const succ = altRel
        ? `If ${bold(firstName(executor))} is unable or unwilling to serve, I appoint ${bold(alt)}, my ${altRel.toLowerCase()}, as successor Independent Executor.`
        : `If ${bold(firstName(executor))} is unable or unwilling to serve, I appoint ${bold(alt)} as successor Independent Executor.`
      return `${primary} ${succ}`
    }
    return `${primary} If ${bold(firstName(executor))} is unable or unwilling to serve, I authorize the court having jurisdiction to appoint a suitable successor Independent Executor.`
  },
  clause_specific_bequests(answers) {
    const gifts = giftList(answers.specific_gifts)
    if (answers.has_specific_gifts === 'yes' && gifts.length > 0) {
      const lines = gifts.map(
        (g) =>
          `${bold(plain(g.item) || 'the described property')} to ${bold(plain(g.recipient) || '[beneficiary]')}, if living at the time of my death.`,
      )
      return `I make the following specific bequests:\n${lines.join('\n')}`
    }
    return 'I make no specific bequests.'
  },
  clause_charitable(answers) {
    const gifts = giftList(answers.charitable_gifts)
    if (answers.has_charitable_gifts === 'yes' && gifts.length > 0) {
      const lines = gifts.map(
        (g) =>
          `${bold(plain(g.item) || 'the described gift')} to ${bold(plain(g.recipient) || '[charity]')}, for its general charitable purposes.`,
      )
      return `I make the following charitable gifts:\n${lines.join('\n')}`
    }
    return 'I make no charitable gifts under this Will.'
  },
  clause_residuary(answers, options) {
    const name = plain(str(answers.legal_full_name, '[Testator]'))
    const spouse = plain(str(answers.spouse_full_name))
    if (options.includeTrust) {
      const trustName = plain(str(answers.trust_name, `The ${name} Revocable Living Trust`))
      return `I give, devise, and bequeath all of the rest, residue, and remainder of my estate, both real and personal, of whatever kind and wherever situated, to the then-acting Trustee of ${bold(trustName)}, to be added to the principal of that trust and held, administered, and distributed under its terms as then in effect. If for any reason that trust is not in existence at my death, then I give my residuary estate to the beneficiaries who would have received the residuary trust estate under that trust as if it had terminated on my death.`
    }
    const plan = str(answers.residuary_plan)
    const custom = plain(str(answers.residuary_custom))
    const intro =
      'I give, devise, and bequeath all of the rest, residue, and remainder of my estate, both real and personal, of whatever kind and wherever situated,'
    switch (plan) {
      case 'spouse_then_children':
        return spouse
          ? `${intro} to my spouse, ${bold(spouse)}, if my spouse survives me. If my spouse does not survive me, then in equal shares to my children who survive me, **per stirpes**.`
          : `${intro} to my spouse if my spouse survives me, and if not, in equal shares to my children who survive me, **per stirpes**.`
      case 'children_equally':
        return `${intro} in equal shares to my children who survive me, **per stirpes**.`
      case 'spouse_only':
        return spouse
          ? `${intro} to my spouse, ${bold(spouse)}, if my spouse survives me. If my spouse does not survive me, then to my heirs at law under the laws of the **State of Texas**.`
          : `${intro} to my spouse if my spouse survives me, and if not, to my heirs at law under the laws of the **State of Texas**.`
      case 'custom':
        return custom
          ? `${intro} as follows: ${custom}`
          : `${intro} according to the written instructions provided with this Will.`
      default:
        return `${intro} to my heirs at law under the laws of the **State of Texas**.`
    }
  },
  clause_guardian(answers) {
    const guardian = plain(str(answers.primary_guardian_name))
    if (answers.has_children !== 'yes' || !guardian) return ''
    const rel = plain(str(answers.primary_guardian_relationship))
    const alt = plain(str(answers.alternate_guardian_name))
    const notes = plain(str(answers.guardian_notes))
    const appoint = rel
      ? `If my spouse does not survive me, or if I am not married at the time of my death, I appoint ${bold(guardian)}, my ${rel.toLowerCase()}, as guardian of the person and estate of each of my minor children.`
      : `If my spouse does not survive me, or if I am not married at the time of my death, I appoint ${bold(guardian)} as guardian of the person and estate of each of my minor children.`
    const succ = alt
      ? ` If ${bold(firstName(guardian))} is unable or unwilling to serve, I appoint ${bold(alt)} as successor guardian.`
      : ` If ${bold(firstName(guardian))} is unable or unwilling to serve, I request the court to appoint a suitable guardian.`
    const noteLine = notes ? ` In selecting a guardian, I ask that the following be considered: ${notes}` : ''
    return [
      '**ARTICLE VI — GUARDIAN OF MINOR CHILDREN**',
      '',
      `**6.1 Appointment of Guardian.** ${appoint}${succ}${noteLine}`,
      '',
      '**6.2 Bond Waived.** I request that no bond be required of any guardian named herein.',
    ].join('\n')
  },
  clause_final_wishes(answers) {
    const disposition = str(answers.disposition)
    const serviceWishes = plain(str(answers.service_wishes))
    const parts: string[] = []
    if (disposition === 'cremation') {
      parts.push('It is my wish that my remains be cremated.')
    } else if (disposition === 'burial') {
      parts.push('It is my wish that my remains be buried.')
    } else if (disposition) {
      parts.push('I leave decisions concerning the disposition of my remains to my family.')
    }
    if (serviceWishes) {
      parts.push(`Concerning any funeral, memorial, or related arrangements, it is my wish that: ${serviceWishes}`)
    } else {
      parts.push(
        'Concerning any funeral, memorial, or related arrangements: **None** specified. I leave those decisions to my family and Independent Executor.',
      )
    }
    parts.push(
      'These wishes are expressed as **guidance** for my family and Independent Executor and are not intended as a binding directive under Texas law, except to the extent a separate advance directive or other instrument so provides.',
    )
    return parts.join('\n\n')
  },
}
