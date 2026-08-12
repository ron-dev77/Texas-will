import type { WillContent } from '@/lib/will-render'

type Answers = Record<string, unknown>

function str(v: unknown, fallback = '') {
  return typeof v === 'string' ? v.trim() : fallback
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

function residuaryText(answers: Answers, name: string): string {
  const plan = str(answers.residuary_plan)
  const custom = str(answers.residuary_custom)
  switch (plan) {
    case 'spouse_then_children':
      return `I give, devise, and bequeath all of the rest, residue, and remainder of my estate to my spouse, if my spouse survives me. If my spouse does not survive me, I give such residue equally to my children who survive me, share and share alike, per stirpes.`
    case 'children_equally':
      return `I give, devise, and bequeath all of the rest, residue, and remainder of my estate equally to my children who survive me, share and share alike, per stirpes.`
    case 'spouse_only':
      return `I give, devise, and bequeath all of the rest, residue, and remainder of my estate to my spouse, if my spouse survives me.`
    case 'custom':
      return custom
        ? `I give, devise, and bequeath all of the rest, residue, and remainder of my estate as follows: ${custom}`
        : `I give, devise, and bequeath all of the rest, residue, and remainder of my estate according to the residuary plan described in my questionnaire answers.`
    default:
      return `I give, devise, and bequeath all of the rest, residue, and remainder of my estate according to the wishes of ${name} as reflected in this Will.`
  }
}

/** Build will JSON from questionnaire answers (same legal wording structure as whisper). */
export function buildWillFromAnswers(answers: Answers): WillContent {
  const name = str(answers.legal_full_name, '[Testator]')
  const aka = str(answers.also_known_as)
  const city = str(answers.address_city)
  const county = str(answers.address_county)
  const street = str(answers.address_street)
  const zip = str(answers.address_zip)
  const marital = str(answers.marital_status)
  const spouse = str(answers.spouse_full_name)
  const children = peopleList(answers.children)
  const hasChildren = answers.has_children === 'yes'
  const gifts = giftList(answers.specific_gifts)
  const charity = giftList(answers.charitable_gifts)
  const executor = str(answers.executor_name, '[Executor]')
  const executorRel = str(answers.executor_relationship)
  const altExecutor = str(answers.alt_executor_name)
  const altRel = str(answers.alt_executor_relationship)
  const guardian = str(answers.primary_guardian_name)
  const guardianRel = str(answers.primary_guardian_relationship)
  const altGuardian = str(answers.alternate_guardian_name)

  const residence =
    [street, city, county ? `${county} County` : '', zip ? `Texas ${zip}` : 'Texas']
      .filter(Boolean)
      .join(', ') || 'the State of Texas'

  const identityBits = [
    `I, ${name}${aka ? `, also known as ${aka}` : ''}, a resident of ${residence}, being of sound mind and disposing memory, do hereby make, publish, and declare this to be my Last Will and Testament, hereby revoking all wills and codicils previously made by me.`,
  ]

  if (marital === 'married' && spouse) {
    identityBits.push(`I am married to ${spouse}.`)
  } else if (marital) {
    identityBits.push(`My marital status is ${marital.replace(/_/g, ' ')}.`)
  }

  if (hasChildren && children.length > 0) {
    identityBits.push(
      `I have the following child${children.length > 1 ? 'ren' : ''}: ${children
        .map((c) => (c.date_of_birth ? `${c.name} (born ${c.date_of_birth})` : c.name))
        .join('; ')}.`,
    )
  } else {
    identityBits.push('I have no children.')
  }

  const sections: WillContent['sections'] = [
    {
      heading: 'ARTICLE I — IDENTIFICATION AND REVOCATION',
      paragraphs: identityBits,
    },
    {
      heading: 'ARTICLE II — APPOINTMENT OF EXECUTOR',
      paragraphs: [
        `I nominate and appoint ${executor}${executorRel ? ` (${executorRel})` : ''} as Independent Executor of this Will, to serve without bond.`,
        altExecutor
          ? `If ${executor} is unable or unwilling to serve, I nominate and appoint ${altExecutor}${altRel ? ` (${altRel})` : ''} as Independent Executor, to serve without bond.`
          : 'If my named Executor is unable or unwilling to serve, I authorize the court to appoint a successor Independent Executor to serve without bond.',
        'My Independent Executor shall have all powers conferred by the Texas Estates Code and may administer my estate independently, without court supervision, to the fullest extent permitted by law.',
      ],
    },
  ]

  if (hasChildren && guardian) {
    sections.push({
      heading: 'ARTICLE III — GUARDIAN OF MINOR CHILDREN',
      paragraphs: [
        `If a guardian of the person is needed for any minor child of mine, I nominate ${guardian}${guardianRel ? ` (${guardianRel})` : ''} to serve as guardian of the person.`,
        altGuardian
          ? `If ${guardian} is unable or unwilling to serve, I nominate ${altGuardian} as alternate guardian of the person.`
          : 'If my named guardian is unable or unwilling to serve, I request the court to appoint a suitable guardian.',
      ],
    })
  }

  const giftParagraphs: string[] = []
  if (answers.has_specific_gifts === 'yes' && gifts.length > 0) {
    for (const g of gifts) {
      giftParagraphs.push(
        `I give ${g.item || 'the described property'} to ${g.recipient || '[recipient]'}, if living at my death; otherwise this gift shall lapse and become part of my residuary estate.`,
      )
    }
  }
  if (answers.has_charitable_gifts === 'yes' && charity.length > 0) {
    for (const g of charity) {
      giftParagraphs.push(
        `I give ${g.item || 'the described gift'} to ${g.recipient || '[charity]'}, for its general purposes, if then in existence; otherwise this gift shall lapse and become part of my residuary estate.`,
      )
    }
  }
  if (giftParagraphs.length > 0) {
    sections.push({
      heading: 'ARTICLE IV — SPECIFIC AND CHARITABLE GIFTS',
      paragraphs: giftParagraphs,
    })
  }

  sections.push({
    heading: 'ARTICLE V — RESIDUARY ESTATE',
    paragraphs: [residuaryText(answers, name)],
  })

  sections.push({
    heading: 'ARTICLE VI — MISCELLANEOUS',
    paragraphs: [
      'If any beneficiary fails to survive me by thirty (30) days, such beneficiary shall be deemed to have predeceased me for purposes of this Will.',
      'If any provision of this Will is held invalid, the remaining provisions shall continue in full force and effect.',
      'This Will shall be governed by the laws of the State of Texas.',
    ],
  })

  return {
    title: 'LAST WILL AND TESTAMENT',
    testatorName: name,
    sections,
  }
}

export function buildTrustFromAnswers(answers: Answers): WillContent {
  const name = str(answers.legal_full_name, '[Grantor]')
  const trustName = str(answers.trust_name, `The ${name} Revocable Living Trust`)
  const successor = str(answers.trust_successor_trustee_name, '[Successor Trustee]')
  const successorRel = str(answers.trust_successor_trustee_relationship)
  const alt = str(answers.trust_alternate_successor_trustee_name)
  const assets = str(answers.trust_assets)
  const gifts = str(answers.trust_specific_gifts)
  const residuary =
    str(answers.trust_residuary_plan) === 'custom'
      ? str(answers.trust_residuary_custom) || 'as described by the Grantor'
      : 'to the same beneficiaries and in the same shares as the residuary of the Grantor’s Last Will and Testament'
  const age = str(answers.trust_distribution_age, '25')

  return {
    title: 'REVOCABLE LIVING TRUST',
    testatorName: name,
    sections: [
      {
        heading: 'ARTICLE I — CREATION OF TRUST',
        paragraphs: [
          `This Revocable Living Trust Agreement is made by ${name} (the “Grantor” and initial “Trustee”) and creates the trust known as ${trustName}.`,
          'The Grantor reserves the right to amend or revoke this Trust in whole or in part during the Grantor’s lifetime while competent.',
        ],
      },
      {
        heading: 'ARTICLE II — TRUSTEES',
        paragraphs: [
          `${name} shall serve as Trustee. Upon the death or incapacity of the Grantor, ${successor}${successorRel ? ` (${successorRel})` : ''} shall serve as Successor Trustee.`,
          alt
            ? `If ${successor} is unable or unwilling to serve, ${alt} shall serve as Alternate Successor Trustee.`
            : 'If the named Successor Trustee is unable or unwilling to serve, a successor may be appointed as provided by Texas law.',
        ],
      },
      {
        heading: 'ARTICLE III — TRUST PROPERTY',
        paragraphs: [
          assets
            ? `The Grantor intends to fund this Trust with the following property: ${assets}`
            : 'The Grantor intends to fund this Trust with such property as the Grantor may hereafter transfer to the Trustee.',
        ],
      },
      {
        heading: 'ARTICLE IV — DISTRIBUTIONS ON DEATH',
        paragraphs: [
          gifts
            ? `Upon the Grantor’s death, the Trustee shall make the following specific distributions: ${gifts}`
            : 'Upon the Grantor’s death, the Trustee shall first pay debts, expenses, and taxes as appropriate from trust property.',
          `The remaining trust property shall pass ${residuary}.`,
          `Any share for a beneficiary under age ${age} shall be held in further trust and distributed when the beneficiary attains that age, or earlier for health, education, maintenance, and support in the Trustee’s discretion.`,
        ],
      },
    ],
  }
}
