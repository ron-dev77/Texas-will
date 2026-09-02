import type { WillContent } from '@/lib/will-render'
import type { DocumentKind } from '@/lib/document-kinds'
import {
  buildSpecialNeedsArticles,
  residuarySpecialNeedsNote,
} from '@/lib/special-needs-trust'

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

function withSpecialNeedsResiduaryNote(answers: Answers, paragraphs: string[]): string[] {
  const note = residuarySpecialNeedsNote(answers)
  return note ? [...paragraphs, note] : paragraphs
}

/** When the customer also bought a living trust, the will pours residue into that trust. */
function pourOverResiduaryText(answers: Answers, name: string): string[] {
  const trustName = plain(
    str(answers.trust_name, `The ${name} Revocable Living Trust`),
  )
  return [
    'I give, devise, and bequeath all of the rest, residue, and remainder of my estate, of every kind and character, real, personal, or mixed, wheresoever situated (including all property over which I may have a power of appointment to the extent I may exercise such power by will), to the then-acting **Trustee** of the trust known as **' +
      trustName +
      '**, created by me as Grantor, to be added to the principal of that trust and held, administered, and distributed under its terms as then in effect.',
    'If for any reason that trust is not in existence at my death, or if this pour-over gift is ineffective, then I give my residuary estate to the beneficiaries and in the shares that would have received the residuary trust estate under that trust as if it had terminated on my death.',
    'This Will is intended to operate as a **pour-over will** in coordination with my Revocable Living Trust. Specific bequests in this Will, if any, are given outright; the residuary estate is governed by the Trust.',
  ]
}

function trustResiduaryDistribution(answers: Answers, spouse: string): string[] {
  const plan = str(answers.trust_residuary_plan)
  if (plan === 'custom') {
    const custom = plain(str(answers.trust_residuary_custom))
    return [
      custom
        ? `The Trustee shall distribute the remaining trust property (the **Residuary Trust Estate**) as follows: ${custom}`
        : 'The Trustee shall distribute the remaining trust property (the **Residuary Trust Estate**) according to the Grantor\'s written instructions provided with this Trust.',
    ]
  }

  // same_as_will (default): mirror the will residuary plan as trust distribution language
  const willPlan = str(answers.residuary_plan)
  const customWill = plain(str(answers.residuary_custom))
  switch (willPlan) {
    case 'spouse_then_children':
      return [
        spouse
          ? `The Trustee shall distribute the Residuary Trust Estate to the Grantor's spouse, **${spouse}**, if living. If the Grantor's spouse is not then living, the Trustee shall distribute the Residuary Trust Estate in equal shares to the Grantor's children who are then living, **per stirpes**.`
          : 'The Trustee shall distribute the Residuary Trust Estate to the Grantor\'s spouse if living, and if not, in equal shares to the Grantor\'s children who are then living, **per stirpes**.',
      ]
    case 'children_equally':
      return [
        'The Trustee shall distribute the Residuary Trust Estate in equal shares to the Grantor\'s children who are then living, **per stirpes**.',
      ]
    case 'spouse_only':
      return [
        spouse
          ? `The Trustee shall distribute the Residuary Trust Estate to the Grantor's spouse, **${spouse}**, if living, and if not, to the Grantor's heirs at law under Texas law.`
          : 'The Trustee shall distribute the Residuary Trust Estate to the Grantor\'s spouse if living, and if not, to the Grantor\'s heirs at law under Texas law.',
      ]
    case 'custom':
      return [
        customWill
          ? `The Trustee shall distribute the Residuary Trust Estate as follows: ${customWill}`
          : 'The Trustee shall distribute the Residuary Trust Estate according to the written instructions accompanying the Grantor\'s estate plan.',
      ]
    default:
      return [
        'The Trustee shall distribute the Residuary Trust Estate to the Grantor\'s heirs at law under the laws of the **State of Texas**.',
      ]
  }
}

function scheduleAParagraphs(assetsRaw: string): string[] {
  const lines = assetsRaw
    .split(/\n/)
    .map((l) => l.trim())
    .filter(Boolean)
  if (lines.length === 0) {
    return [
      'The Grantor intends to fund this Trust with property to be assigned by separate instruments of transfer (deed, assignment, beneficiary designation, or account retitling). **None** listed on this Schedule at signing.',
    ]
  }
  return [
    'The following property is transferred to and held by this Trust (or is intended to be funded by separate transfer instruments):',
    ...lines.map((line) => `• ${line}`),
    'Additional property may be added at any time by the Grantor or any other person, subject to the Trustee\'s acceptance. Where a deed, assignment, or beneficiary designation is required to complete funding, the Grantor shall execute such instruments promptly.',
  ]
}

export type BuildDocOptions = {
  /** When true, will residuary pours into the living trust. */
  includeTrust?: boolean
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
export function buildWillFromAnswers(
  answers: Answers,
  options: BuildDocOptions = {},
): WillContent {
  const includeTrust = Boolean(options.includeTrust)
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
    paragraphs: withSpecialNeedsResiduaryNote(
      answers,
      includeTrust ? pourOverResiduaryText(answers, name) : residuaryText(answers, spouse),
    ),
  })

  for (const snt of buildSpecialNeedsArticles(answers)) {
    sections.push({
      heading: `ARTICLE ${roman(article++)}. ${snt.heading}`,
      paragraphs: snt.paragraphs,
    })
  }

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
  const year = new Date().getFullYear()
  const trustName = plain(
    str(answers.trust_name, `The ${name} Revocable Living Trust dated ${year}`),
  )
  const successor = plain(str(answers.trust_successor_trustee_name, '[Successor Trustee]'))
  const successorRel = plain(str(answers.trust_successor_trustee_relationship))
  const successorAddress = plain(str(answers.trust_successor_trustee_address))
  const alt = plain(str(answers.trust_alternate_successor_trustee_name))
  const altAddress = plain(str(answers.trust_alternate_successor_trustee_address))
  const assets = plain(str(answers.trust_assets))
  const gifts = plain(str(answers.trust_specific_gifts))
  const spouse = plain(str(answers.spouse_full_name))
  const age = str(answers.trust_distribution_age, '25')
  const street = plain(str(answers.address_street))
  const city = plain(str(answers.address_city))
  const county = plain(str(answers.address_county))
  const zip = plain(str(answers.address_zip))
  const countyLine = county ? `${county} County` : '[County] County'
  const residence =
    [street, city, county ? `${county} County` : '', zip ? `Texas ${zip}` : 'Texas']
      .filter(Boolean)
      .join(', ') || 'the State of Texas'

  const successorLine = successorRel
    ? `**${successor}**, the Grantor's ${successorRel.toLowerCase()}${successorAddress ? `, of **${successorAddress}**` : ''}`
    : `**${successor}**${successorAddress ? `, of **${successorAddress}**` : ''}`

  const altLine = alt
    ? altAddress
      ? `**${alt}**, of **${altAddress}**`
      : `**${alt}**`
    : null

  return {
    title: 'REVOCABLE LIVING TRUST',
    testatorName: name,
    sections: [
      {
        heading: 'ARTICLE I. DECLARATION OF TRUST',
        paragraphs: [
          `**Establishment.** I, **${name}**, a resident of **${countyLine}, Texas** (the "Grantor"), hereby establish this Revocable Living Trust (the "Trust"). The Trust shall be known as **${trustName}**.`,
          '**Governing Law.** This Trust is created under and shall be governed by the laws of the **State of Texas**, including the Texas Trust Code (Chapter 111 et seq. of the Texas Property Code), except as otherwise expressly stated herein.',
          '**Transfer of Property.** The Grantor transfers to the Trust the property described in **Schedule A**, attached hereto and incorporated by reference. Additional property may be added to the Trust at any time by the Grantor or by any other person, subject to the Trustee\'s acceptance.',
        ],
      },
      {
        heading: 'ARTICLE II. TRUSTEE',
        paragraphs: [
          `**Initial Trustee.** The Grantor, **${name}**, shall serve as the initial Trustee.`,
          `**Successor Trustee.** Upon the Grantor's death, resignation, or incapacity, ${successorLine} shall serve as **Successor Trustee**.`,
          altLine
            ? `**Alternate Successor Trustee.** If the Successor Trustee is unable or unwilling to serve, or ceases to serve, ${altLine} shall serve as **Alternate Successor Trustee**.`
            : '**Alternate Successor Trustee.** If the Successor Trustee is unable or unwilling to serve, or ceases to serve, a successor may be appointed as provided by Texas law and the terms of this Trust.',
          '**Trustee Compensation.** Any Trustee (other than the Grantor while serving) shall be entitled to reasonable compensation for services rendered.',
          '**No Bond.** No Trustee shall be required to post bond or other security.',
        ],
      },
      {
        heading: 'ARTICLE III. REVOCATION AND AMENDMENT',
        paragraphs: [
          '**Power to Revoke or Amend.** During the Grantor\'s lifetime and while the Grantor is competent, the Grantor may revoke or amend this Trust, in whole or in part, at any time, by a written instrument signed by the Grantor and delivered to the Trustee.',
          '**Irrevocability on Death or Incapacity.** This Trust shall become irrevocable upon the Grantor\'s death or upon a determination of the Grantor\'s incapacity as provided below.',
          '**Determination of Incapacity.** The Grantor shall be deemed incapacitated upon the written certification of two licensed physicians who have personally examined the Grantor and determined that the Grantor is unable to manage the Grantor\'s financial affairs.',
        ],
      },
      {
        heading: 'ARTICLE IV. DISTRIBUTIONS DURING GRANTOR\'S LIFETIME',
        paragraphs: [
          '**Income and Principal.** During the Grantor\'s lifetime, the Trustee shall distribute to or for the benefit of the Grantor such amounts of net income and principal as the Grantor may from time to time request, or as the Trustee determines are advisable for the Grantor\'s health, education, maintenance, and support.',
          '**Distributions During Incapacity.** If the Grantor becomes incapacitated, the Trustee shall use trust income and principal for the Grantor\'s health, education, maintenance, support, and comfort, and may also make distributions for the benefit of persons the Grantor was legally obligated to support.',
        ],
      },
      {
        heading: 'ARTICLE V. DISTRIBUTIONS UPON GRANTOR\'S DEATH',
        paragraphs: [
          '**Payment of Expenses.** Upon the Grantor\'s death, the Trustee shall pay from the Trust the Grantor\'s legally enforceable debts, funeral and burial expenses, and expenses of last illness and estate administration, to the extent not otherwise provided for.',
          gifts
            ? `**Specific Distributions.** The Trustee shall make the following specific distributions: **${gifts}**`
            : '**Specific Distributions.** There are no specific distributions under this Article. **None.**',
          '**Residuary Distribution.**',
          ...trustResiduaryDistribution(answers, spouse),
          `**Distributions to Minors or Incapacitated Beneficiaries.** If any beneficiary entitled to a distribution is a minor or is incapacitated, the Trustee may hold that share in a separate trust for the beneficiary's benefit, and distribute income and principal for the beneficiary's health, education, maintenance, and support until the beneficiary reaches the age of **${age}** or regains capacity, at which time the remaining trust property shall be distributed outright to the beneficiary.`,
        ],
      },
      {
        heading: 'ARTICLE VI. TRUSTEE POWERS',
        paragraphs: [
          '**General Powers.** The Trustee shall have all powers granted to trustees under the Texas Trust Code, including, without limitation, the powers to: (a) retain, invest, and reinvest trust property in any kind of property, real or personal; (b) sell, exchange, lease, mortgage, or otherwise dispose of trust property; (c) borrow money and pledge trust property as security; (d) employ attorneys, accountants, investment advisors, and other professionals, and pay reasonable compensation therefor; (e) settle, compromise, or abandon claims in favor of or against the Trust; (f) distribute property in kind, in cash, or partly in each; and (g) do all other acts necessary or advisable for the proper administration of the Trust.',
          '**Standard of Care.** The Trustee shall administer the Trust as a prudent person would, considering the purposes, terms, distribution requirements, and other circumstances of the Trust.',
        ],
      },
      {
        heading: 'ARTICLE VII. SPENDTHRIFT PROVISION',
        paragraphs: [
          '**Spendthrift Trust.** No beneficiary shall have the power to anticipate, assign, transfer, or otherwise dispose of any interest in the Trust before actual receipt, and no interest of any beneficiary shall be subject to the claims of that beneficiary\'s creditors.',
        ],
      },
      {
        heading: 'ARTICLE VIII. MISCELLANEOUS',
        paragraphs: [
          '**Perpetuities Savings.** Notwithstanding any other provision, any trust created hereunder shall terminate no later than the latest date permitted under the Texas Trust Code.',
          '**Severability.** If any provision of this Trust is held invalid, the remaining provisions shall continue in full force and effect.',
          '**Successor Definitions.** References to any person acting as Trustee include any successor or substitute Trustee acting hereunder.',
          `**Residence.** The Grantor's residence for notice and administration purposes is **${residence}**.`,
        ],
      },
      {
        heading: 'SCHEDULE A. INITIAL TRUST PROPERTY',
        paragraphs: scheduleAParagraphs(assets),
      },
    ],
  }
}

/** Snapshot content for Medical POA (skeleton layout is the primary live preview). */
export function buildMpoaFromAnswers(answers: Answers): WillContent {
  const name = plain(str(answers.legal_full_name, '[Principal]'))
  return {
    title: 'MEDICAL POWER OF ATTORNEY',
    testatorName: name,
    sections: [
      {
        heading: 'APPOINTMENT OF AGENT',
        paragraphs: [
          `I, **${name}**, appoint **${plain(str(answers.mpoa_agent_name, '[Agent]'))}** as my medical agent. Address: ${plain(str(answers.mpoa_agent_address)) || '—'}. Phone: ${plain(str(answers.mpoa_agent_phone)) || '—'}.`,
          answers.mpoa_alt_agent_name
            ? `Alternate agent: **${plain(str(answers.mpoa_alt_agent_name))}**. Phone: ${plain(str(answers.mpoa_alt_agent_phone)) || '—'}.`
            : 'No alternate agent named.',
        ],
      },
    ],
  }
}

export function buildDpoaFromAnswers(answers: Answers): WillContent {
  const name = plain(str(answers.legal_full_name, '[Principal]'))
  const when =
    answers.dpoa_when_effective === 'incapacity'
      ? 'Only if I become incapacitated'
      : 'Immediately when I sign'
  return {
    title: 'DURABLE POWER OF ATTORNEY',
    testatorName: name,
    sections: [
      {
        heading: 'APPOINTMENT OF AGENT',
        paragraphs: [
          `I, **${name}**, appoint **${plain(str(answers.dpoa_agent_name, '[Agent]'))}** of ${plain(str(answers.dpoa_agent_address)) || '[address]'} as my agent. Phone: ${plain(str(answers.dpoa_agent_phone)) || '—'}.`,
          answers.dpoa_alt_agent_name
            ? `Alternate agent: **${plain(str(answers.dpoa_alt_agent_name))}**.`
            : 'No alternate agent named.',
          `When effective: **${when}**.`,
        ],
      },
    ],
  }
}

export function buildDirectiveFromAnswers(answers: Answers): WillContent {
  const name = plain(str(answers.legal_full_name, '[Declarant]'))
  const choice: Record<string, string> = {
    comfort: 'comfort care only — allow me to die as gently as possible',
    prolong: 'keep me alive using available life-sustaining treatment',
  }
  const terminal = choice[str(answers.directive_terminal)] ?? '[terminal preference]'
  const irreversible = choice[str(answers.directive_irreversible)] ?? '[irreversible preference]'
  const additional =
    answers.directive_additional === 'custom'
      ? plain(str(answers.directive_notes)) || 'Particular treatments as stated.'
      : 'None at this time.'
  return {
    title: 'DIRECTIVE TO PHYSICIANS AND FAMILY OR SURROGATES',
    testatorName: name,
    sections: [
      {
        heading: 'TREATMENT PREFERENCES',
        paragraphs: [
          `I, **${name}**, direct as follows. Terminal condition: **${terminal}**. Irreversible condition: **${irreversible}**. Additional requests: **${additional}**.`,
        ],
      },
    ],
  }
}

export function buildHipaaFromAnswers(answers: Answers): WillContent {
  const name = plain(str(answers.legal_full_name, '[Individual]'))
  const reps = [1, 2, 3, 4]
    .map((n) => {
      const person = plain(str(answers[`hipaa_rep${n}_name`]))
      if (!person) return ''
      const address = plain(str(answers[`hipaa_rep${n}_address`]))
      const phone = plain(str(answers[`hipaa_rep${n}_phone`]))
      return [person, address, phone].filter(Boolean).join(', ')
    })
    .filter(Boolean)
  return {
    title: 'HIPAA RELEASE AND AUTHORIZATION FOR USE AND DISCLOSURE OF PROTECTED HEALTH INFORMATION',
    testatorName: name,
    sections: [
      {
        heading: 'PERSONAL REPRESENTATIVES',
        paragraphs: [
          `I, **${name}**, authorize disclosure of my Individually Identifiable Health Information to: **${reps.join('; ') || '[Personal Representatives]'}**.`,
        ],
      },
    ],
  }
}

export function buildDocumentFromAnswers(
  kind: DocumentKind,
  answers: Answers,
  options: BuildDocOptions = {},
): WillContent {
  switch (kind) {
    case 'rlt':
      return buildTrustFromAnswers(answers)
    case 'mpoa':
      return buildMpoaFromAnswers(answers)
    case 'dpoa':
      return buildDpoaFromAnswers(answers)
    case 'directive':
      return buildDirectiveFromAnswers(answers)
    case 'hipaa':
      return buildHipaaFromAnswers(answers)
    case 'will':
    default:
      return buildWillFromAnswers(answers, options)
  }
}
