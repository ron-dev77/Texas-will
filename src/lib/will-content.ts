import type { WillContent } from '@/lib/will-render'

type Answers = Record<string, unknown>

function str(v: unknown, fallback = '') {
  return typeof v === 'string' ? v.trim() : fallback
}

/** Strip fancy punctuation that reads as AI-generated. */
function plain(text: string) {
  return text
    .replace(/[—–]/g, ', ')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

function formatDate(value: string) {
  const v = plain(value)
  if (!v) return ''
  const iso = v.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (iso) return `${iso[2]}/${iso[3]}/${iso[1]}`
  return v
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

function roman(n: number) {
  const map = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X']
  return map[n - 1] ?? String(n)
}

function residuaryText(answers: Answers, spouse: string): string[] {
  const plan = str(answers.residuary_plan)
  const custom = plain(str(answers.residuary_custom))
  const intro =
    'I give, devise, and bequeath all of the rest, residue, and remainder of my estate, of every kind and character, real, personal, or mixed, wheresoever situated, including all property over which I may have a power of appointment (to the extent I may exercise such power by will), as follows:'

  switch (plan) {
    case 'spouse_then_children':
      return [
        intro,
        spouse
          ? `To my spouse, **${spouse}**, if my spouse survives me.`
          : 'To my spouse, if my spouse survives me.',
        'If my spouse does not survive me, then in equal shares to my children who survive me, **per stirpes**. If a child of mine predeceases me leaving issue who survive me, such issue shall take, **per stirpes**, the share such deceased child would have taken if living.',
      ]
    case 'children_equally':
      return [
        intro,
        'In equal shares to my children who survive me, **per stirpes**. If a child of mine predeceases me leaving issue who survive me, such issue shall take, **per stirpes**, the share such deceased child would have taken if living.',
      ]
    case 'spouse_only':
      return [
        intro,
        spouse
          ? `To my spouse, **${spouse}**, if my spouse survives me. If my spouse does not survive me, then to my heirs at law under the laws of the **State of Texas**.`
          : 'To my spouse, if my spouse survives me. If my spouse does not survive me, then to my heirs at law under the laws of the **State of Texas**.',
      ]
    case 'custom':
      return [
        intro,
        custom
          ? custom
          : 'According to the written instructions provided with this Will, which are incorporated herein by reference to the extent permitted by law.',
      ]
    default:
      return [
        intro,
        'To my heirs at law under the laws of the **State of Texas**, as those laws provide for the distribution of an intestate estate.',
      ]
  }
}

function dispositionText(value: string) {
  switch (value) {
    case 'burial':
      return 'It is my wish that my remains be **buried** in a dignified manner consistent with my faith and family traditions, if practicable.'
    case 'cremation':
      return 'It is my wish that my remains be **cremated**, and that my ashes be disposed of as my family deems appropriate.'
    case 'donation':
      return 'It is my wish that my remains be **donated** for medical education or scientific research, if practicable, with any remaining remains handled as my family deems appropriate.'
    case 'unsure':
      return 'I leave all decisions concerning the disposition of my remains to my family and **Independent Executor**, trusting their judgment.'
    default:
      return ''
  }
}

/** Build will JSON from questionnaire answers. Use **word** for bold emphasis in the PDF. */
export function buildWillFromAnswers(answers: Answers): WillContent {
  const name = plain(str(answers.legal_full_name, '[Testator]'))
  const aka = plain(str(answers.also_known_as))
  const dob = formatDate(str(answers.date_of_birth))
  const phone = plain(str(answers.phone))
  const street = plain(str(answers.address_street))
  const city = plain(str(answers.address_city))
  const county = plain(str(answers.address_county))
  const zip = plain(str(answers.address_zip))
  const marital = str(answers.marital_status)
  const spouse = plain(str(answers.spouse_full_name))
  const marriageDate = formatDate(str(answers.marriage_date))
  const children = peopleList(answers.children)
  const hasChildren = answers.has_children === 'yes'
  const gifts = giftList(answers.specific_gifts)
  const charity = giftList(answers.charitable_gifts)
  const executor = plain(str(answers.executor_name, '[Executor]'))
  const executorRel = plain(str(answers.executor_relationship))
  const executorEmail = plain(str(answers.executor_email))
  const altExecutor = plain(str(answers.alt_executor_name))
  const altRel = plain(str(answers.alt_executor_relationship))
  const guardian = plain(str(answers.primary_guardian_name))
  const guardianRel = plain(str(answers.primary_guardian_relationship))
  const altGuardian = plain(str(answers.alternate_guardian_name))
  const guardianNotes = plain(str(answers.guardian_notes))
  const disposition = str(answers.disposition)
  const serviceWishes = plain(str(answers.service_wishes))

  const residence =
    [street, city, county ? `${county} County` : '', zip ? `Texas ${zip}` : 'Texas']
      .filter(Boolean)
      .join(', ') || 'the State of Texas'

  const identityBits: string[] = []
  let opening = `I, **${name}**`
  if (aka) opening += `, also known as **${aka}**`
  if (dob) opening += `, born **${dob}**`
  opening += `, a resident of **${residence}**, being of sound and disposing mind and memory, and not acting under duress, menace, fraud, or undue influence, do hereby make, publish, and declare this instrument to be my **Last Will and Testament**, and I hereby revoke all wills and codicils heretofore made by me.`
  identityBits.push(opening)

  identityBits.push(
    'I declare that I am eighteen (18) years of age or older, and that I understand the nature and extent of my property and the natural objects of my bounty.',
  )

  if (phone) {
    identityBits.push(
      `For purposes of notice and administration, my telephone number is **${phone}**.`,
    )
  }

  if (marital === 'married' && spouse) {
    identityBits.push(
      marriageDate
        ? `I am lawfully married to **${spouse}**. We were married on **${marriageDate}**, and we remain married as of the date of this Will.`
        : `I am lawfully married to **${spouse}**, and we remain married as of the date of this Will.`,
    )
  } else if (marital === 'domestic_partnership' && spouse) {
    identityBits.push(
      `I am in a domestic partnership with **${spouse}** as of the date of this Will.`,
    )
  } else if (marital) {
    const label =
      marital === 'divorced'
        ? 'divorced and unmarried'
        : marital === 'widowed'
          ? 'widowed and unmarried'
          : marital === 'single'
            ? 'single and unmarried'
            : marital.replace(/_/g, ' ')
    identityBits.push(`I am presently **${label}**.`)
  }

  if (hasChildren && children.length > 0) {
    identityBits.push(
      `I have the following living child${children.length > 1 ? 'ren' : ''}: ${children
        .map((c) => {
          const n = plain(c.name)
          const d = formatDate(c.date_of_birth || '')
          return d ? `**${n}**, born **${d}**` : `**${n}**`
        })
        .join('; ')}. All references in this Will to my "children" shall include the above-named persons and any child hereafter born to or adopted by me.`,
    )
  } else {
    identityBits.push(
      'I have **no children** living at the time of the execution of this Will. All references herein to my children shall include any child hereafter born to or adopted by me.',
    )
  }

  const sections: WillContent['sections'] = []
  let article = 1

  sections.push({
    heading: `ARTICLE ${roman(article++)}. IDENTIFICATION AND REVOCATION`,
    paragraphs: identityBits,
  })

  const executorParas: string[] = [
    executorRel
      ? `I nominate and appoint **${executor}**, my ${executorRel.toLowerCase()}, as **Independent Executor** of this Will, to serve **without bond** and without the need for court-supervised administration to the fullest extent permitted by the **Texas Estates Code**.`
      : `I nominate and appoint **${executor}** as **Independent Executor** of this Will, to serve **without bond** and without the need for court-supervised administration to the fullest extent permitted by the **Texas Estates Code**.`,
  ]
  if (executorEmail) {
    executorParas.push(
      `My Independent Executor may be contacted at **${executorEmail}** for purposes of notice and administration.`,
    )
  }
  if (altExecutor) {
    executorParas.push(
      altRel
        ? `If **${executor}** is unable or unwilling to serve, fails to qualify, resigns, dies, or otherwise ceases to serve, I nominate and appoint **${altExecutor}**, my ${altRel.toLowerCase()}, as successor **Independent Executor**, likewise to serve **without bond**.`
        : `If **${executor}** is unable or unwilling to serve, fails to qualify, resigns, dies, or otherwise ceases to serve, I nominate and appoint **${altExecutor}** as successor **Independent Executor**, likewise to serve **without bond**.`,
    )
  } else {
    executorParas.push(
      'If my named Independent Executor is unable or unwilling to serve, fails to qualify, resigns, dies, or otherwise ceases to serve, I authorize the court having jurisdiction to appoint a suitable successor Independent Executor to serve **without bond**.',
    )
  }
  executorParas.push(
    'My Independent Executor shall have all powers conferred by the **Texas Estates Code** and by common law, including without limitation the power to sell, lease, encumber, manage, invest, and distribute property; to compromise claims; to employ professionals; and to administer my estate independently and without court supervision except as may be required by law.',
  )
  sections.push({
    heading: `ARTICLE ${roman(article++)}. APPOINTMENT OF EXECUTOR`,
    paragraphs: executorParas,
  })

  if (hasChildren && guardian) {
    const guardianParas: string[] = [
      guardianRel
        ? `If at my death any child of mine is a minor and a guardian of the person is required, I nominate **${guardian}**, my ${guardianRel.toLowerCase()}, to serve as **guardian of the person** of each such minor child, and I respectfully request that the court having jurisdiction confirm such nomination.`
        : `If at my death any child of mine is a minor and a guardian of the person is required, I nominate **${guardian}** to serve as **guardian of the person** of each such minor child, and I respectfully request that the court having jurisdiction confirm such nomination.`,
    ]
    if (altGuardian) {
      guardianParas.push(
        `If **${guardian}** is unable or unwilling to serve, or ceases to serve, I nominate **${altGuardian}** as alternate guardian of the person of each such minor child.`,
      )
    } else {
      guardianParas.push(
        'If my named guardian is unable or unwilling to serve, or ceases to serve, I request the court to appoint a suitable guardian of the person, giving due regard to the best interests of the child.',
      )
    }
    if (guardianNotes) {
      guardianParas.push(
        `In selecting and confirming a guardian, I ask that the following considerations be weighed: ${guardianNotes}`,
      )
    }
    sections.push({
      heading: `ARTICLE ${roman(article++)}. GUARDIAN OF MINOR CHILDREN`,
      paragraphs: guardianParas,
    })
  }

  if (answers.has_specific_gifts === 'yes' && gifts.length > 0) {
    const giftParagraphs: string[] = [
      'I make the following **specific bequests**. If a named beneficiary of a specific bequest does not survive me, such bequest shall lapse and the property shall become part of my **residuary estate**, unless otherwise provided.',
    ]
    for (const g of gifts) {
      giftParagraphs.push(
        `I give **${plain(g.item) || 'the described property'}** to **${plain(g.recipient) || '[recipient]'}**, if living at my death.`,
      )
    }
    sections.push({
      heading: `ARTICLE ${roman(article++)}. SPECIFIC GIFTS`,
      paragraphs: giftParagraphs,
    })
  } else if (answers.has_specific_gifts === 'yes' || answers.has_specific_gifts === 'no') {
    sections.push({
      heading: `ARTICLE ${roman(article++)}. SPECIFIC GIFTS`,
      paragraphs: [
        'I make **no specific bequests** of particular items of property under this Will. **None.**',
      ],
    })
  }

  if (answers.has_charitable_gifts === 'yes' && charity.length > 0) {
    const charityParas: string[] = [
      'I make the following **charitable gifts**. If a named organization is not then in existence or is not a qualified charitable organization, such gift shall lapse and become part of my **residuary estate**.',
    ]
    for (const g of charity) {
      charityParas.push(
        `I give **${plain(g.item) || 'the described gift'}** to **${plain(g.recipient) || '[charity]'}**, for its general charitable purposes.`,
      )
    }
    sections.push({
      heading: `ARTICLE ${roman(article++)}. CHARITABLE GIFTS`,
      paragraphs: charityParas,
    })
  } else if (answers.has_charitable_gifts === 'yes' || answers.has_charitable_gifts === 'no') {
    sections.push({
      heading: `ARTICLE ${roman(article++)}. CHARITABLE GIFTS`,
      paragraphs: ['I make **no charitable gifts** under this Will. **None.**'],
    })
  }

  sections.push({
    heading: `ARTICLE ${roman(article++)}. RESIDUARY ESTATE`,
    paragraphs: residuaryText(answers, spouse),
  })

  const finalParas: string[] = []
  const dispositionLine = dispositionText(disposition)
  if (dispositionLine) finalParas.push(dispositionLine)
  else if (disposition) {
    finalParas.push('I leave decisions concerning the disposition of my remains to my family. **None** specified beyond that selection.')
  }
  if (serviceWishes) {
    finalParas.push(
      `Concerning any funeral, memorial, or related arrangements, it is my wish that: ${serviceWishes}`,
    )
  } else {
    finalParas.push(
      'Concerning any funeral, memorial, or related arrangements: **None** specified. I leave those decisions to my family and Independent Executor.',
    )
  }
  finalParas.push(
    'These wishes are expressed as **guidance** for my family and Independent Executor and are not intended as a binding directive under Texas law, except to the extent a separate advance directive or other instrument so provides.',
  )
  sections.push({
    heading: `ARTICLE ${roman(article++)}. FINAL WISHES`,
    paragraphs: finalParas,
  })

  sections.push({
    heading: `ARTICLE ${roman(article++)}. GENERAL PROVISIONS`,
    paragraphs: [
      '**Survival.** If any beneficiary under this Will fails to survive me by thirty (30) days, that beneficiary shall be deemed to have predeceased me for all purposes of this Will, and any gift to that beneficiary shall pass as though that beneficiary had died before me.',
      '**Severability.** If any provision of this Will is held invalid, illegal, or unenforceable, the remaining provisions shall continue in full force and effect as if the invalid provision had not been included.',
      '**Governing Law.** This Will shall be governed by, and construed in accordance with, the laws of the **State of Texas**, without regard to conflicts-of-law principles.',
      '**Headings.** Article headings are for convenience of reference only and shall not affect the interpretation of this Will.',
      '**Gender and Number.** Words of any gender include all genders, and the singular includes the plural and vice versa, as the context may require.',
    ],
  })

  return {
    title: 'LAST WILL AND TESTAMENT',
    testatorName: name,
    sections,
  }
}

export function buildTrustFromAnswers(answers: Answers): WillContent {
  const name = plain(str(answers.legal_full_name, '[Grantor]'))
  const trustName = plain(str(answers.trust_name, `The ${name} Revocable Living Trust`))
  const successor = plain(str(answers.trust_successor_trustee_name, '[Successor Trustee]'))
  const successorRel = plain(str(answers.trust_successor_trustee_relationship))
  const successorAddress = plain(str(answers.trust_successor_trustee_address))
  const alt = plain(str(answers.trust_alternate_successor_trustee_name))
  const altAddress = plain(str(answers.trust_alternate_successor_trustee_address))
  const assets = plain(str(answers.trust_assets))
  const gifts = plain(str(answers.trust_specific_gifts))
  const residuary =
    str(answers.trust_residuary_plan) === 'custom'
      ? plain(str(answers.trust_residuary_custom)) || 'as described by the Grantor'
      : "to the same beneficiaries and in the same shares as the residuary estate under the Grantor's Last Will and Testament"
  const age = str(answers.trust_distribution_age, '25')
  const street = plain(str(answers.address_street))
  const city = plain(str(answers.address_city))
  const county = plain(str(answers.address_county))
  const zip = plain(str(answers.address_zip))
  const residence =
    [street, city, county ? `${county} County` : '', zip ? `Texas ${zip}` : 'Texas']
      .filter(Boolean)
      .join(', ') || 'the State of Texas'

  const trusteeParas: string[] = [
    successorRel
      ? `**${name}** shall serve as initial **Trustee**. Upon the death or incapacity of the Grantor, **${successor}**, the Grantor's ${successorRel.toLowerCase()}, shall serve as **Successor Trustee**.`
      : `**${name}** shall serve as initial **Trustee**. Upon the death or incapacity of the Grantor, **${successor}** shall serve as **Successor Trustee**.`,
  ]
  if (successorAddress) {
    trusteeParas.push(`The Successor Trustee's mailing address is **${successorAddress}**.`)
  }
  if (alt) {
    trusteeParas.push(
      `If **${successor}** is unable or unwilling to serve, or ceases to serve, **${alt}** shall serve as **Alternate Successor Trustee**.`,
    )
    if (altAddress) {
      trusteeParas.push(
        `The Alternate Successor Trustee's mailing address is **${altAddress}**.`,
      )
    }
  } else {
    trusteeParas.push(
      'If the Successor Trustee is unable or unwilling to serve, or ceases to serve, a successor may be appointed as provided by Texas law and the terms of this Trust.',
    )
  }

  return {
    title: 'REVOCABLE LIVING TRUST',
    testatorName: name,
    sections: [
      {
        heading: 'ARTICLE I. CREATION OF TRUST',
        paragraphs: [
          `This **Revocable Living Trust Agreement** is made by **${name}**, of **${residence}**, as Grantor and initial Trustee, and creates the trust known as **${trustName}**.`,
          "The Grantor reserves the right to amend or revoke this Trust in whole or in part during the Grantor's lifetime while competent, by a writing signed by the Grantor and delivered to the Trustee.",
          'This Trust is intended to be governed by the laws of the **State of Texas**.',
        ],
      },
      {
        heading: 'ARTICLE II. TRUSTEES',
        paragraphs: trusteeParas,
      },
      {
        heading: 'ARTICLE III. TRUST PROPERTY',
        paragraphs: [
          assets
            ? `The Grantor intends to fund this Trust with the following property: **${assets}**. Additional property may be added from time to time.`
            : 'The Grantor may transfer property to the Trustee from time to time to be held as part of this Trust estate.',
        ],
      },
      {
        heading: 'ARTICLE IV. DISTRIBUTIONS ON DEATH',
        paragraphs: [
          gifts
            ? `Upon the Grantor's death, the Trustee shall make the following specific distributions: **${gifts}**`
            : "Upon the Grantor's death, the Trustee shall first pay debts, expenses of administration, and taxes as appropriate from trust property.",
          `The remaining trust property shall pass **${residuary}**.`,
          `Any share for a beneficiary under age **${age}** shall be held in further trust until the beneficiary attains that age; provided that the Trustee may distribute income or principal earlier for the beneficiary's health, education, maintenance, and support.`,
        ],
      },
    ],
  }
}
