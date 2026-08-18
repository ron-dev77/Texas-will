import type { AncillaryKind } from '@/lib/document-kinds'

type BlockInput = {
  id: string
  kind: 'heading' | 'paragraph' | 'signature' | 'signature_pair' | 'spacer'
  heading?: string
  body?: string
  label?: string
  leftLabel?: string
  rightLabel?: string
  align?: 'left' | 'center' | 'right'
  blankLinesAfter?: number
  pageBreakBefore?: boolean
  headingBold?: boolean
}

/** Bump when bundled ancillary copy changes so default forms auto-refresh. */
export const ANCILLARY_TEMPLATE = 'ancillary-v15'

function pack(title: string, blocks: BlockInput[]): string {
  const full = blocks.map((b) => ({
    id: b.id,
    kind: b.kind,
    heading: b.heading ?? '',
    body: b.body ?? '',
    label: b.label ?? '',
    leftLabel: b.leftLabel ?? '',
    rightLabel: b.rightLabel ?? '',
    align: b.align ?? 'left',
    blankLinesAfter: b.blankLinesAfter ?? 1,
    pageBreakBefore: b.pageBreakBefore ?? false,
    headingBold: b.headingBold === false ? false : true,
  }))
  return `<!-- texas-will-skeleton-v2 -->
${JSON.stringify(
  { version: 2, template: ANCILLARY_TEMPLATE, title, pageSize: 'A4', blocks: full },
  null,
  2,
)}
`
}

export const BUNDLED_MPOA_SKELETON = pack('MEDICAL POWER OF ATTORNEY', [
  {
    id: 'm-sub',
    kind: 'heading',
    heading: 'DESIGNATION OF HEALTH CARE AGENT',
    align: 'center',
    blankLinesAfter: 1,
  },
  {
    id: 'm-appoint',
    kind: 'paragraph',
    body: 'I, **{{legal_full_name}}**, appoint:',
    blankLinesAfter: 1,
  },
  {
    id: 'm-agent',
    kind: 'paragraph',
    body:
      '**Name:** {{mpoa_agent_name}}\n**Address:** {{mpoa_agent_address}}\n**Phone:** {{mpoa_agent_phone}}',
    blankLinesAfter: 1,
  },
  {
    id: 'm-agent-scope',
    kind: 'paragraph',
    body:
      'as my agent to make any and all health care decisions for me, except to the extent I state otherwise in this document. This medical power of attorney takes effect if I become unable to make my own health care decisions and this fact is certified in writing by my physician.',
    blankLinesAfter: 1,
  },
  {
    id: 'm-limits-h',
    kind: 'heading',
    heading: 'LIMITATIONS ON THE DECISION-MAKING AUTHORITY OF MY AGENT ARE AS FOLLOWS:',
    align: 'left',
    blankLinesAfter: 0,
  },
  {
    id: 'm-limits',
    kind: 'paragraph',
    body: '{{mpoa_limitations}}',
    blankLinesAfter: 1,
  },
  {
    id: 'm-alt-h',
    kind: 'heading',
    heading: 'DESIGNATION OF ALTERNATE AGENT:',
    align: 'left',
    blankLinesAfter: 0,
  },
  {
    id: 'm-alt-note',
    kind: 'paragraph',
    body:
      '(You are not required to designate an alternate agent but you may do so. An alternate agent may make the same health care decisions as the designated agent if the designated agent is unable or unwilling to act as your agent. If the agent designated is your spouse, the designation is automatically revoked by law if your marriage is dissolved, annulled, or declared void unless this document provides otherwise.)',
    blankLinesAfter: 1,
  },
  {
    id: 'm-alt-intro',
    kind: 'paragraph',
    body:
      'If the person designated as my agent is unable or unwilling to make health care decisions for me, I designate the following persons to serve as my agent to make health care decisions for me as authorized by this document, who serve in the following order:',
    blankLinesAfter: 1,
  },
  {
    id: 'm-alt1-h',
    kind: 'heading',
    heading: 'A. First Alternate Agent',
    align: 'left',
    headingBold: true,
    blankLinesAfter: 0,
  },
  {
    id: 'm-alt1',
    kind: 'paragraph',
    body:
      '**Name:** {{mpoa_alt_agent_name}}\n**Address:** {{mpoa_alt_agent_address}}\n**Phone:** {{mpoa_alt_agent_phone}}',
    blankLinesAfter: 1,
  },
  {
    id: 'm-alt2-h',
    kind: 'heading',
    heading: 'B. Second Alternate Agent',
    align: 'left',
    blankLinesAfter: 0,
  },
  {
    id: 'm-alt2',
    kind: 'paragraph',
    body:
      '**Name:** {{mpoa_alt2_agent_name}}\n**Address:** {{mpoa_alt2_agent_address}}\n**Phone:** {{mpoa_alt2_agent_phone}}',
    blankLinesAfter: 1,
  },
  {
    id: 'm-authority',
    kind: 'paragraph',
    body:
      "Your agent's authority is effective when your doctor certifies that you lack the competence to make health care decisions.\nYour agent is obligated to follow your instructions when making decisions on your behalf. Unless you state otherwise, your agent has the same authority to make decisions about your health care as you would have if you were able to make health care decisions for yourself.",
    blankLinesAfter: 1,
  },
  {
    id: 'm-discuss',
    kind: 'paragraph',
    body:
      'It is important that you discuss this document with your physician or other health care provider before you sign the document to ensure that you understand the nature and range of decisions that may be made on your behalf. If you do not have a physician, you should talk with someone else who is knowledgeable about these issues and can answer your questions. You do not need a lawyer\'s assistance to complete this document, but if there is anything in this document that you do not understand, you should ask a lawyer to explain it to you.',
    blankLinesAfter: 1,
  },
  {
    id: 'm-who-agent',
    kind: 'paragraph',
    body:
      'The person you appoint as agent should be someone you know and trust. The person must be 18 years of age or older or a person under 18 years of age who has had the disabilities of minority removed. If you appoint your health or residential care provider (e.g., your physician or an employee of a home health agency, hospital, nursing facility, or residential care facility, other than a relative), that person has to choose between acting as your agent or as your health or residential care provider; the law does not allow a person to serve as both at the same time.',
    blankLinesAfter: 1,
  },
  {
    id: 'm-inform',
    kind: 'paragraph',
    body:
      'You should inform the person you appoint that you want the person to be your health care agent. You should discuss this document with your agent and your physician and give each a signed copy. You should indicate on the document itself the people and institutions that you intend to have signed copies. Your agent is not liable for health care decisions made in good faith on your behalf.',
    blankLinesAfter: 1,
  },
  {
    id: 'm-revoke',
    kind: 'paragraph',
    body:
      'Once you have signed this document, you have the right to make health care decisions for yourself as long as you are able to make those decisions, and treatment cannot be given to you or stopped over your objection. You have the right to revoke the authority granted to your agent by informing your agent or your health or residential care provider orally or in writing or by your execution of a subsequent medical power of attorney. Unless you state otherwise in this document, your appointment of a spouse is revoked if your marriage is dissolved, annulled, or declared void.',
    blankLinesAfter: 1,
  },
  {
    id: 'm-no-mod',
    kind: 'paragraph',
    body:
      'This document may not be changed or modified. If you want to make changes in this document, you must execute a new medical power of attorney.',
    blankLinesAfter: 1,
  },
  {
    id: 'm-alt-same',
    kind: 'paragraph',
    body:
      'You may wish to designate an alternate agent in the event that your agent is unwilling, unable, or ineligible to act as your agent. If you designate an alternate agent, the alternate agent has the same authority as the agent to make health care decisions for you.',
    blankLinesAfter: 1,
  },
  {
    id: 'm-valid-h',
    kind: 'heading',
    heading: 'THIS POWER OF ATTORNEY IS NOT VALID UNLESS:',
    align: 'left',
    blankLinesAfter: 0,
  },
  {
    id: 'm-valid',
    kind: 'paragraph',
    body:
      '(1)\tYOU SIGN IT AND HAVE YOUR SIGNATURE ACKNOWLEDGED BEFORE A NOTARY PUBLIC; OR\n(2)\tYOU SIGN IT IN THE PRESENCE OF TWO COMPETENT ADULT WITNESSES.',
    blankLinesAfter: 1,
  },
  {
    id: 'm-copies-h',
    kind: 'heading',
    heading: 'The following individuals or institutions have signed copies:',
    align: 'left',
    headingBold: false,
    blankLinesAfter: 1,
  },
  {
    id: 'm-copies',
    kind: 'paragraph',
    body:
      '**1.**  **Name:** ________________________________    **Phone:** ________________________\n      **Address:** ________________________________________________________________\n\n**2.**  **Name:** ________________________________    **Phone:** ________________________\n      **Address:** ________________________________________________________________\n\n**3.**  **Name:** ________________________________    **Phone:** ________________________\n      **Address:** ________________________________________________________________',
    blankLinesAfter: 1,
  },
  {
    id: 'm-dur-h',
    kind: 'heading',
    heading: 'DURATION:',
    align: 'left',
    blankLinesAfter: 0,
  },
  {
    id: 'm-dur',
    kind: 'paragraph',
    body:
      'I understand that this power of attorney exists indefinitely from the date I execute this document unless I establish a short time or revoke this power of attorney. If I am unable to make health care decisions for myself when this power of attorney expires, the authority I have granted my agent continues to exist until the time I become able to make health care decisions for myself.',
    blankLinesAfter: 1,
  },
  {
    id: 'm-dur-date',
    kind: 'paragraph',
    body:
      '(IF APPLICABLE)- This power of attorney ends on the following date: **{{mpoa_expires_on}}**.\n(Insert date or write "Not Applicable"). If this is left blank it is presumed there is no expiration.',
    blankLinesAfter: 1,
  },
  {
    id: 'm-prior-h',
    kind: 'heading',
    heading: 'PRIOR DESIGNATIONS REVOKED:',
    align: 'left',
    blankLinesAfter: 0,
  },
  {
    id: 'm-prior',
    kind: 'paragraph',
    body: 'I revoke any prior medical power of attorney.',
    blankLinesAfter: 1,
  },
  {
    id: 'm-disc-h',
    kind: 'heading',
    heading: 'DISCLOSURE STATEMENT:',
    align: 'center',
    pageBreakBefore: true,
    blankLinesAfter: 0,
  },
  {
    id: 'm-disc-warn',
    kind: 'paragraph',
    body:
      'THIS MEDICAL POWER OF ATTORNEY IS AN IMPORTANT LEGAL DOCUMENT. BEFORE SIGNING THIS DOCUMENT, YOU SHOULD KNOW THESE IMPORTANT FACTS:',
    blankLinesAfter: 1,
  },
  {
    id: 'm-disc-body',
    kind: 'paragraph',
    body:
      'Except to the extent you state otherwise, this document gives the person you name as your agent the authority to make any and all health care decisions for you in accordance with your wishes, including your religious and moral beliefs, when you are unable to make the decisions for yourself. Because "health care" means any treatment, service, or procedure to maintain, diagnose, or treat your physical or mental condition, your agent has the power to make a broad range of health care decisions for you. Your agent may consent, refuse to consent, or withdraw consent to medical treatment and may make decisions about withdrawing or withholding life-sustaining treatment. Your agent my not consent to voluntary inpatient mental health services, convulsive treatment, psycosurgery, or abortion. A physician must comply with your agent\'s instructions or allow you to be transferred to another physician.',
    blankLinesAfter: 1,
  },
  {
    id: 'm-wit-disq-h',
    kind: 'heading',
    heading: 'THE FOLLOWING PERSONS MAY NOT ACT AS ONE OF THE WITNESSES:',
    align: 'left',
    blankLinesAfter: 0,
  },
  {
    id: 'm-wit-disq',
    kind: 'paragraph',
    body:
      '(1)\tthe person you have designated as your agent;\n\n(2)\ta person related to you by blood or marriage;\n\n(3)\ta person entitled to any part of your estate after your death under a will or codicil executed by you or by operation of law;\n\n(4)\tyour attending physician;\n\n(5)\tan employee of your attending physician;\n\n(6)\tan employee of a health care facility in which you are a patient if the employee is providing direct patient care to you or is an officer, director, partner, or business office employee of the health care facility or of any parent organization of the health care facility; or\n\n(7)\ta person who, at the time this medical power of attorney is executed, has a claim against any part of your estate after your death.',
    blankLinesAfter: 1,
  },
  {
    id: 'm-ack-disc',
    kind: 'paragraph',
    body:
      'By signing below, I acknowledge that I have read and understand the information contained in the above disclosure statement.',
    blankLinesAfter: 1,
  },
  {
    id: 'm-sign-note',
    kind: 'paragraph',
    body:
      '(YOU MUST DATE AND SIGN THIS POWER OF ATTORNEY. YOU MAY SIGN IT AND HAVE YOUR SIGNATURE ACKNOWLEDGED BEFORE A NOTARY PUBLIC OR YOU MAY SIGN IT IN THE PRESENCE OF TWO COMPETENT ADULT WITNESSES.)',
    blankLinesAfter: 1,
  },
  {
    id: 'm-notary-h',
    kind: 'heading',
    heading: 'SIGNATURE ACKNOWLEDGED BEFORE NOTARY',
    align: 'center',
    pageBreakBefore: true,
    blankLinesAfter: 1,
  },
  {
    id: 'm-notary-sign',
    kind: 'paragraph',
    body:
      'I sign my name to this medical power of attorney on this ______ day of _____________, 20_____.',
    blankLinesAfter: 1,
  },
  {
    id: 'm-declarant',
    kind: 'signature',
    label: 'Declarant',
    align: 'center',
    blankLinesAfter: 1,
  },
  {
    id: 'm-notary-venue',
    kind: 'paragraph',
    body:
      '**THE STATE OF TEXAS**\n\n**COUNTY OF** {{address_county}}\n\nThis instrument was acknowledged before me on the ______ day of _______________, 20_____ by **{{legal_full_name}}** (declarant).',
    blankLinesAfter: 1,
  },
  {
    id: 'm-notary-sig',
    kind: 'signature',
    label: 'Notary Public, State of Texas',
    align: 'right',
    blankLinesAfter: 1,
  },
  {
    id: 'm-wit-h',
    kind: 'heading',
    heading: 'SIGNATURE IN PRESENCE OF TWO COMPETENT ADULT WITNESSES',
    align: 'center',
    blankLinesAfter: 1,
  },
  {
    id: 'm-wit-sign',
    kind: 'paragraph',
    body:
      'I sign my name to this medical power of attorney on ______ day of _______________, 20_____, at **{{address_city}}**, Texas.',
    blankLinesAfter: 1,
  },
  {
    id: 'm-wit-name',
    kind: 'paragraph',
    body: '**{{legal_full_name}}**',
    align: 'center',
    blankLinesAfter: 1,
  },
  {
    id: 'm-wit1-h',
    kind: 'heading',
    heading: 'STATEMENT OF FIRST WITNESS.',
    align: 'left',
    blankLinesAfter: 0,
  },
  {
    id: 'm-wit1-txt',
    kind: 'paragraph',
    body:
      "I am not the person appointed as agent by this document. I am not related to the principal by blood or marriage. I would not be entitled to any portion of the principal's estate on the principal's death. I am not the attending physician of the principal or an employee of the attending physician. I have no claim against any portion of the principal's estate on the principal's death. Furthermore, if I am an employee of a health care facility in which the principal is a patient, I am not involved in providing direct patient care to the principal and am not an officer, director, partner, or business office employee of the health care facility or of any parent organization of the health care facility.",
    blankLinesAfter: 1,
  },
  {
    id: 'm-wits',
    kind: 'signature_pair',
    leftLabel: 'First Witness — Signature / Print Name / Address',
    rightLabel: 'Second Witness — Signature / Print Name / Address',
    blankLinesAfter: 2,
  },
  {
    id: 'm-wit2-space',
    kind: 'spacer',
    blankLinesAfter: 4,
  },
  {
    id: 'm-wit2-h',
    kind: 'heading',
    heading: 'SIGNATURE OF SECOND WITNESS.',
    align: 'center',
    blankLinesAfter: 1,
  },
  {
    id: 'm-wit-dates',
    kind: 'paragraph',
    body: '**Date:** _____________________________\t\t**Date:** _____________________________',
    align: 'center',
    blankLinesAfter: 0,
  },
])

export const BUNDLED_DPOA_SKELETON = pack('STATUTORY DURABLE POWER OF ATTORNEY', [
  {
    id: 'd-notice',
    kind: 'paragraph',
    body:
      'NOTICE: THE POWERS GRANTED BY THIS DOCUMENT ARE BROAD AND SWEEPING. THEY ARE EXPLAINED IN THE DURABLE POWER OF ATTORNEY ACT, SUBTITLE P, TITLE 2, ESTATES CODE. IF YOU HAVE ANY QUESTIONS ABOUT THESE POWERS, OBTAIN COMPETENT LEGAL ADVICE. THIS DOCUMENT DOES NOT AUTHORIZE ANYONE TO MAKE MEDICAL AND OTHER HEALTH-CARE DECISIONS FOR YOU. YOU MAY REVOKE THIS POWER OF ATTORNEY IF YOU LATER WISH TO DO SO. IF YOU WANT YOUR AGENT TO HAVE THE AUTHORITY TO SIGN HOME EQUITY LOAN DOCUMENTS ON YOUR BEHALF, THIS POWER OF ATTORNEY MUST BE SIGNED BY YOU AT THE OFFICE OF THE LENDER, AN ATTORNEY AT LAW, OR A TITLE COMPANY.',
    blankLinesAfter: 1,
  },
  {
    id: 'd-trust',
    kind: 'paragraph',
    body:
      "You should select someone you trust to serve as your agent. Unless you specify otherwise, generally the agent's authority will continue until:\n(1) you die or revoke the power of attorney;\n(2) your agent resigns, is removed by court order, or is unable to act for you; or\n(3) a guardian is appointed for your estate.",
    blankLinesAfter: 1,
  },
  {
    id: 'd-appoint',
    kind: 'paragraph',
    body:
      'I, **{{legal_full_name}}**, **{{address_street}}, {{address_city}}, Texas {{address_zip}}** (insert your name and address), appoint **{{dpoa_agent_name}}**, **{{dpoa_agent_address}}** (insert the name and address of the person appointed) as my agent to act for me in any lawful way with respect to all of the following powers that I have initialed below. (YOU MAY APPOINT CO-AGENTS. UNLESS YOU PROVIDE OTHERWISE, CO-AGENTS MAY ACT INDEPENDENTLY.)',
    blankLinesAfter: 1,
  },
  {
    id: 'd-grant-note',
    kind: 'paragraph',
    body:
      'TO GRANT ALL OF THE FOLLOWING POWERS, INITIAL THE LINE IN FRONT OF (O) AND IGNORE THE LINES IN FRONT OF THE OTHER POWERS LISTED IN (A) THROUGH (N).\nTO GRANT A POWER, YOU MUST INITIAL THE LINE IN FRONT OF THE POWER YOU ARE GRANTING.\nTO WITHHOLD A POWER, DO NOT INITIAL THE LINE IN FRONT OF THE POWER. YOU MAY, BUT DO NOT NEED TO, CROSS OUT EACH POWER WITHHELD.',
    blankLinesAfter: 1,
  },
  {
    id: 'd-powers',
    kind: 'paragraph',
    body:
      '{{dpoa_init_a}} (A) Real property transactions;\n{{dpoa_init_b}} (B) Tangible personal property transactions;\n{{dpoa_init_c}} (C) Stock and bond transactions;\n{{dpoa_init_d}} (D) Commodity and option transactions;\n{{dpoa_init_e}} (E) Banking and other financial institution transactions;\n{{dpoa_init_f}} (F) Business operating transactions;\n{{dpoa_init_g}} (G) Insurance and annuity transactions;\n{{dpoa_init_h}} (H) Estate, trust, and other beneficiary transactions;\n{{dpoa_init_i}} (I) Claims and litigation;\n{{dpoa_init_j}} (J) Personal and family maintenance;\n{{dpoa_init_k}} (K) Benefits from social security, Medicare, Medicaid, or other governmental programs or civil or military service;\n{{dpoa_init_l}} (L) Retirement plan transactions;\n{{dpoa_init_m}} (M) Tax matters;\n{{dpoa_init_n}} (N) Digital assets and the content of an electronic communication;\n{{dpoa_init_o}} (O) ALL OF THE POWERS LISTED IN (A) THROUGH (N). YOU DO NOT HAVE TO INITIAL THE LINE IN FRONT OF ANY OTHER POWER IF YOU INITIAL LINE (O).',
    blankLinesAfter: 1,
  },
  {
    id: 'd-special-h',
    kind: 'heading',
    heading: 'SPECIAL INSTRUCTIONS:',
    align: 'left',
    blankLinesAfter: 0,
  },
  {
    id: 'd-comp',
    kind: 'paragraph',
    body:
      'Special instructions applicable to agent compensation (initial in front of one of the following sentences to have it apply; if no selection is made, each agent will be entitled to compensation that is reasonable under the circumstances):\n{{dpoa_init_comp_reasonable}} My agent is entitled to reimbursement of reasonable expenses incurred on my behalf and to compensation that is reasonable under the circumstances.\n{{dpoa_init_comp_none}} My agent is entitled to reimbursement of reasonable expenses incurred on my behalf but shall receive no compensation for serving as my agent.',
    blankLinesAfter: 1,
  },
  {
    id: 'd-coagents',
    kind: 'paragraph',
    body:
      'Special instructions applicable to co-agents (if you have appointed co-agents to act, initial in front of one of the following sentences to have it apply; if no selection is made, each agent will be entitled to act independently)\n____ Each of my co-agents may act independently for me.\n____ My co-agents may act for me only if the co-agents act jointly.\n____ My co-agents may act for me only if a majority of the co-agents act jointly.',
    blankLinesAfter: 1,
  },
  {
    id: 'd-gifts',
    kind: 'paragraph',
    body:
      'Special instructions applicable to gifts (initial in front of the following sentence to have it apply):\n{{dpoa_init_gifts}} I grant my agent the power to apply my property to make gifts outright to or for the benefit of a person, including by the exercise of a presently exercisable general power of appointment held by me, except that the amount of a gift to an individual may not exceed the amount of annual exclusions allowed from the federal gift tax for the calendar year of the gift.',
    blankLinesAfter: 1,
  },
  {
    id: 'd-limits-h',
    kind: 'heading',
    heading:
      'ON THE FOLLOWING LINES YOU MAY GIVE SPECIAL INSTRUCTIONS LIMITING OR EXTENDING THE POWERS GRANTED TO YOUR AGENT.',
    align: 'left',
    headingBold: false,
    blankLinesAfter: 0,
  },
  {
    id: 'd-limits',
    kind: 'paragraph',
    body: '{{dpoa_special_instructions}}',
    blankLinesAfter: 1,
  },
  {
    id: 'd-revoke',
    kind: 'paragraph',
    body:
      'I hereby expressly revoke any and all prior financial or durable powers of attorney executed by me as principal. This revocation applies EXCLUSIVELY to financial, property, and general durable powers of attorney and DOES NOT revoke, modify, or affect any Medical Power of Attorney, Advance Directive, Directive to Physicians, or HIPAA Release executed by me prior to or concurrently with this document.',
    blankLinesAfter: 1,
  },
  {
    id: 'd-effect-note',
    kind: 'paragraph',
    body:
      'UNLESS YOU DIRECT OTHERWISE BELOW, THIS POWER OF ATTORNEY IS EFFECTIVE IMMEDIATELY AND WILL CONTINUE UNTIL IT TERMINATES.\nCHOOSE ONE OF THE FOLLOWING ALTERNATIVES BY CROSSING OUT THE ALTERNATIVE NOT CHOSEN:',
    blankLinesAfter: 1,
  },
  {
    id: 'd-effect',
    kind: 'paragraph',
    body:
      '{{dpoa_line_a}}\n{{dpoa_line_b}}\n\nYOU SHOULD CHOOSE ALTERNATIVE (A) IF THIS POWER OF ATTORNEY IS TO BECOME EFFECTIVE ON THE DATE IT IS EXECUTED.\nIF NEITHER (A) NOR (B) IS CROSSED OUT, IT WILL BE ASSUMED THAT YOU CHOSE ALTERNATIVE (A).',
    blankLinesAfter: 1,
  },
  {
    id: 'd-incapacity',
    kind: 'paragraph',
    body:
      "If Alternative (B) is chosen and a definition of my disability or incapacity is not contained in this power of attorney, I shall be considered disabled or incapacitated for purposes of this power of attorney if a physician certifies in writing at a date later than the date this power of attorney is executed that, based on the physician's medical examination of me, I am mentally incapable of managing my financial affairs. I authorize the physician who examines me for this purpose to disclose my physical or mental condition to another person for purposes of this power of attorney. A third party who accepts this power of attorney is fully protected from any action taken under this power of attorney that is based on the determination made by a physician of my disability or incapacity.",
    blankLinesAfter: 1,
  },
  {
    id: 'd-third',
    kind: 'paragraph',
    body:
      'I agree that any third party who receives a copy of this document may act under it. Termination of this durable power of attorney is not effective as to a third party until the third party has actual knowledge of the termination. I agree to indemnify the third party for any claims that arise against the third party because of reliance on this power of attorney. The meaning and effect of this durable power of attorney is determined by Texas law.',
    blankLinesAfter: 1,
  },
  {
    id: 'd-succ-intro',
    kind: 'paragraph',
    body:
      "If any agent named by me dies, becomes incapacitated, resigns, refuses to act, or is removed by court order, or if my marriage to an agent named by me is dissolved by a court decree of divorce or annulment or is declared void by a court (unless I provided in this document that the dissolution or declaration does not terminate the agent's authority to act under this power of attorney), I name the following (each to act alone and successively, in the order named) as successor(s) to that agent:",
    blankLinesAfter: 1,
  },
  {
    id: 'd-alt1-h',
    kind: 'heading',
    heading: 'First Alternate Agent',
    align: 'left',
    blankLinesAfter: 0,
  },
  {
    id: 'd-alt1',
    kind: 'paragraph',
    body:
      '**Name:** {{dpoa_alt_agent_name}}\n**Address:** {{dpoa_alt_agent_address}}\n**Phone:** {{dpoa_alt_agent_phone}}',
    blankLinesAfter: 1,
  },
  {
    id: 'd-alt2-h',
    kind: 'heading',
    heading: 'Second Alternate Agent',
    align: 'left',
    blankLinesAfter: 0,
  },
  {
    id: 'd-alt2',
    kind: 'paragraph',
    body:
      '**Name:** {{dpoa_alt2_agent_name}}\n**Address:** {{dpoa_alt2_agent_address}}\n**Phone:** {{dpoa_alt2_agent_phone}}',
    blankLinesAfter: 1,
  },
  {
    id: 'd-sig-txt',
    kind: 'paragraph',
    body: 'Signed this ______ day of ____________, __________',
    blankLinesAfter: 1,
  },
  {
    id: 'd-sig',
    kind: 'signature',
    label: "Principal's signature",
    align: 'center',
    blankLinesAfter: 0,
  },
  {
    id: 'd-notary',
    kind: 'paragraph',
    body:
      '**State of Texas**\n**County of** {{address_county}}\n\nThis document was acknowledged before me on ____________ (date) by **{{legal_full_name}}** (name of principal).\n\n(Seal, if any, of notary)\n**Printed name:** __________________________\n**My commission expires:** __________',
    blankLinesAfter: 1,
  },
  {
    id: 'd-notary-sig',
    kind: 'signature',
    label: 'Signature of notarial officer / Notary Public, State of Texas',
    align: 'right',
    blankLinesAfter: 1,
  },
  {
    id: 'd-agent-info-h',
    kind: 'heading',
    heading: 'IMPORTANT INFORMATION FOR AGENT',
    align: 'center',
    pageBreakBefore: true,
    blankLinesAfter: 1,
  },
  {
    id: 'd-duties-h',
    kind: 'heading',
    heading: "Agent's Duties",
    align: 'left',
    blankLinesAfter: 0,
  },
  {
    id: 'd-duties',
    kind: 'paragraph',
    body:
      'When you accept the authority granted under this power of attorney, you establish a "fiduciary" relationship with the principal. This is a special legal relationship that imposes on you legal duties that continue until you resign or the power of attorney is terminated, suspended, or revoked by the principal or by operation of law. A fiduciary duty generally includes the duty to:\n(1) act in good faith;\n(2) do nothing beyond the authority granted in this power of attorney;\n(3) act loyally for the principal\'s benefit;\n(4) avoid conflicts that would impair your ability to act in the principal\'s best interest; and\n(5) disclose your identity as an agent when you act for the principal by writing or printing the name of the principal and signing your own name as "agent" in the following manner:\n\n(Principal\'s Name) by (Your Signature) as Agent',
    blankLinesAfter: 1,
  },
  {
    id: 'd-records',
    kind: 'paragraph',
    body:
      'In addition, the Durable Power of Attorney Act (Subtitle P, Title 2, Estates Code) requires you to:\n(1) maintain records of each action taken or decision made on behalf of the principal;\n(2) maintain all records until delivered to the principal, released by the principal, or discharged by a court; and\n(3) if requested by the principal, provide an accounting to the principal that, unless otherwise directed by the principal or otherwise provided in the Special Instructions, must include:\n(A) the property belonging to the principal that has come to your knowledge or into your possession;\n(B) each action taken or decision made by you as agent;\n(C) a complete account of receipts, disbursements, and other actions of you as agent that includes the source and nature of each receipt, disbursement, or action, with receipts of principal and income shown separately;\n(D) a listing of all property over which you have exercised control that includes an adequate description of each asset and the asset\'s current value, if known to you;\n(E) the cash balance on hand and the name and location of the depository at which the cash balance is kept;\n(F) each known liability;\n(G) any other information and facts known to you as necessary for a full and definite understanding of the exact condition of the property belonging to the principal; and\n(H) all documentation regarding the principal\'s property.',
    blankLinesAfter: 1,
  },
  {
    id: 'd-term-h',
    kind: 'heading',
    heading: "Termination of Agent's Authority",
    align: 'left',
    blankLinesAfter: 0,
  },
  {
    id: 'd-term',
    kind: 'paragraph',
    body:
      "You must stop acting on behalf of the principal if you learn of any event that terminates or suspends this power of attorney or your authority under this power of attorney. An event that terminates this power of attorney or your authority to act under this power of attorney includes:\n(1) the principal's death;\n(2) the principal's revocation of this power of attorney or your authority;\n(3) the occurrence of a termination event stated in this power of attorney;\n(4) if you are married to the principal, the dissolution of your marriage by a court decree of divorce or annulment or declaration that your marriage is void, unless otherwise provided in this power of attorney;\n(5) the appointment and qualification of a permanent guardian of the principal's estate unless a court order provides otherwise; or\n(6) if ordered by a court, your removal as agent (attorney in fact) under this power of attorney. An event that suspends this power of attorney or your authority to act under this power of attorney is the appointment and qualification of a temporary guardian unless a court order provides otherwise.",
    blankLinesAfter: 1,
  },
  {
    id: 'd-liab-h',
    kind: 'heading',
    heading: 'Liability of Agent',
    align: 'left',
    blankLinesAfter: 0,
  },
  {
    id: 'd-liab',
    kind: 'paragraph',
    body:
      'The authority granted to you under this power of attorney is specified in the Durable Power of Attorney Act (Subtitle P, Title 2, Estates Code). If you violate the Durable Power of Attorney Act or act beyond the authority granted, you may be liable for any damages caused by the violation or subject to prosecution for misapplication of property by a fiduciary under Chapter 32 of the Texas Penal Code.\n\nTHE AGENT, BY ACCEPTING OR ACTING UNDER THE APPOINTMENT, ASSUMES THE FIDUCIARY AND OTHER LEGAL RESPONSIBILITIES OF AN AGENT.',
    blankLinesAfter: 0,
  },
])

export const BUNDLED_DIRECTIVE_SKELETON = pack(
  'DIRECTIVE TO PHYSICIANS AND FAMILY OR SURROGATES',
  [
    {
      id: 'dir-of',
      kind: 'heading',
      heading: 'OF',
      align: 'center',
      headingBold: false,
      blankLinesAfter: 0,
    },
    {
      id: 'dir-name',
      kind: 'paragraph',
      body: '**{{legal_full_name}}**\nPatient / Individual',
      align: 'center',
      blankLinesAfter: 1,
    },
    {
      id: 'dir-notice-h',
      kind: 'heading',
      heading: 'NOTICE AND INSTRUCTIONS FOR COMPLETING THIS DOCUMENT:',
      align: 'left',
      blankLinesAfter: 0,
    },
    {
      id: 'dir-notice',
      kind: 'paragraph',
      body:
        'This is an important legal document known as an Advance Directive. It is designed to help you communicate your wishes about medical treatment at some time in the future when you are unable to make your wishes known because of illness or injury. These wishes are usually based on personal values. In particular, you may want to consider what burdens or hardships of treatment you would be willing to accept for a particular amount of benefit obtained if you were seriously ill.',
      blankLinesAfter: 1,
    },
    {
      id: 'dir-discuss',
      kind: 'paragraph',
      body:
        'You are encouraged to discuss your values and wishes with your family or chosen spokesperson, as well as your physician. Your physician, other health care provider, or medical institution may provide you with various resources to assist you in completing your advance directive. Brief definitions are listed below and may aid you in your discussions and advance planning. Initial the treatment choices that best reflect your personal preferences. Provide a copy of your directive to your physician, usual hospital, and family or spokesperson. Consider a periodic review of this document. By periodic review, you can best assure that the directive reflects your preferences.',
      blankLinesAfter: 1,
    },
    {
      id: 'dir-other',
      kind: 'paragraph',
      body:
        'In addition to this advance directive, Texas law provides for two other types of directives that can be important during a serious illness. These are the Medical Power of Attorney and the Out-of-Hospital Do-Not-Resuscitate Order. You may wish to discuss these with your physician, family, hospital representative, or other advisers. You may also wish to complete a directive related to the donation of organs and tissues.',
      blankLinesAfter: 1,
    },
    {
      id: 'dir-def-h',
      kind: 'heading',
      heading: 'DEFINITIONS-',
      align: 'left',
      blankLinesAfter: 0,
    },
    {
      id: 'dir-def-aanh',
      kind: 'paragraph',
      body:
        '"Artificially administered nutrition and hydration" means the provision of nutrients or fluids by a tube inserted in a vein, under the skin in the subcutaneous tissues, or in the stomach (gastrointestinal tract).',
      blankLinesAfter: 1,
    },
    {
      id: 'dir-def-irr',
      kind: 'paragraph',
      body:
        '"Irreversible condition" means a condition, injury, or illness:\n(1) that may be treated, but is never cured or eliminated;\n(2) that leaves a person unable to care for or make decisions for the person\'s own self; and\n(3) that, without life-sustaining treatment provided in accordance with the prevailing standard of medical care, is fatal.',
      blankLinesAfter: 1,
    },
    {
      id: 'dir-def-irr-x',
      kind: 'paragraph',
      body:
        "Explanation: Many serious illnesses such as cancer, failure of major organs (kidney, heart, liver, or lung), and serious brain disease such as Alzheimer's dementia may be considered irreversible early on. There is no cure, but the patient may be kept alive for prolonged periods of time if the patient receives life-sustaining treatments. Late in the course of the same illness, the disease may be considered terminal when, even with treatment, the patient is expected to die. You may wish to consider which burdens of treatment you would be willing to accept in an effort to achieve a particular outcome. This is a very personal decision that you may wish to discuss with your physician, family, or other important persons in your life.",
      blankLinesAfter: 1,
    },
    {
      id: 'dir-def-lst',
      kind: 'paragraph',
      body:
        '"Life-sustaining treatment" means treatment that, based on reasonable medical judgment, sustains the life of a patient and without which the patient will die. The term includes both life-sustaining medications and artificial life support such as mechanical breathing machines, kidney dialysis treatment, and artificially administered nutrition and hydration. The term does not include the administration of pain management medication, the performance of a medical procedure necessary to provide comfort care, or any other medical care provided to alleviate a patient\'s pain.',
      blankLinesAfter: 1,
    },
    {
      id: 'dir-def-term',
      kind: 'paragraph',
      body:
        '"Terminal condition" means an incurable condition caused by injury, disease, or illness that according to reasonable medical judgment will produce death within six months, even with available life-sustaining treatment provided in accordance with the prevailing standard of medical care.',
      blankLinesAfter: 1,
    },
    {
      id: 'dir-def-term-x',
      kind: 'paragraph',
      body:
        'Explanation: Many serious illnesses may be considered irreversible early in the course of the illness, but they may not be considered terminal until the disease is fairly advanced. In thinking about terminal illness and its treatment, you again may wish to consider the relative benefits and burdens of treatment and discuss your wishes with your physician, family, or other important persons in your life.',
      blankLinesAfter: 1,
    },
    {
      id: 'dir-dir-h',
      kind: 'heading',
      heading: 'DIRECTIVE-',
      align: 'left',
      pageBreakBefore: true,
      blankLinesAfter: 0,
    },
    {
      id: 'dir-open',
      kind: 'paragraph',
      body:
        'I, **{{legal_full_name}}**, recognize that the best health care is based upon a partnership of trust and communication with my physician. My physician and I will make health care decisions together as long as I am of sound mind and able to make my wishes known. If there comes a time that I am unable to make medical decisions about myself because of illness or injury, I direct that the following treatment preferences be honored:',
      blankLinesAfter: 1,
    },
    {
      id: 'dir-term',
      kind: 'paragraph',
      body:
        'If, in the judgment of my physician, I am suffering with a terminal condition from which I am expected to die within six months, even with available life-sustaining treatment provided in accordance with prevailing standards of medical care:\n{{dir_term_comfort}} I request that all treatments other than those needed to keep me comfortable be discontinued or withheld and my physician allow me to die as gently as possible; OR\n{{dir_term_prolong}} I request that I be kept alive in this terminal condition using available life-sustaining treatment. (THIS SELECTION DOES NOT APPLY TO HOSPICE CARE.)',
      blankLinesAfter: 1,
    },
    {
      id: 'dir-irr',
      kind: 'paragraph',
      body:
        'If, in the judgment of my physician, I am suffering with an irreversible condition so that I cannot care for myself or make decisions for myself and am expected to die without life-sustaining treatment provided in accordance with prevailing standards of care:\n{{dir_irr_comfort}} I request that all treatments other than those needed to keep me comfortable be discontinued or withheld and my physician allow me to die as gently as possible; OR\n{{dir_irr_prolong}} I request that I be kept alive in this irreversible condition using available life-sustaining treatment. (THIS SELECTION DOES NOT APPLY TO HOSPICE CARE.)',
      blankLinesAfter: 1,
    },
    {
      id: 'dir-add-h',
      kind: 'heading',
      heading: 'Additional requests:',
      align: 'left',
      headingBold: false,
      blankLinesAfter: 0,
    },
    {
      id: 'dir-add-note',
      kind: 'paragraph',
      body:
        '(After discussion with your physician, you may wish to consider listing particular treatments in this space that you do or do not want in specific circumstances, such as artificially administered nutrition and hydration, intravenous antibiotics, etc. Be sure to state whether you do or do not want the particular treatment.)',
      blankLinesAfter: 1,
    },
    {
      id: 'dir-add',
      kind: 'paragraph',
      body: '{{dir_add_none}} None at this time; OR\n{{directive_notes}}',
      blankLinesAfter: 1,
    },
    {
      id: 'dir-special-h',
      kind: 'heading',
      heading: 'SPECIAL DIRECTIONS:',
      align: 'left',
      blankLinesAfter: 0,
    },
    {
      id: 'dir-special',
      kind: 'paragraph',
      body:
        'I direct that my health care providers allow my proxies under this directive or agents under a medical power of attorney to see my medical records, to ask questions and receive answers about my health condition from my health care providers, and to be with me during medical examinations and consultations even if I am competent and able to communicate, unless I hereafter clearly direct otherwise in certain situations. My reason is this: I want to benefit from the advice of my agents and they must be informed in order to help me. I waive any privacy restrictions as to my agents and release my health care providers from any liability, including but not limited to privacy violations, for their actions in carrying out this Special Direction.',
      blankLinesAfter: 1,
    },
    {
      id: 'dir-conflict',
      kind: 'paragraph',
      body:
        'In the event of conflict, my last executed durable power of attorney for health care or medical power of attorney (i.e., a document in which I have designated an agent to make medical decisions for me) shall take precedence over any other directives as to my health care and treatment (including any Directive to Physicians and Family or Surrogate) which I have executed (regardless of when I executed such directive -- before, after, or at the same time) unless I expressly direct otherwise.',
      blankLinesAfter: 1,
    },
    {
      id: 'dir-copy',
      kind: 'paragraph',
      body:
        'A copy of this directive shall be honored as would be an original.\nAfter signing this directive, if my representative or I elect hospice care, I understand and agree that only those treatments needed to keep me comfortable would be provided and I would not be given available life-sustaining treatments.',
      blankLinesAfter: 1,
    },
    {
      id: 'dir-sig-txt',
      kind: 'paragraph',
      body: 'IN WITNESS WHEREOF, I have executed this document on the date below:',
      blankLinesAfter: 1,
    },
    {
      id: 'dir-sig',
      kind: 'signature',
      label: 'Patient/Individual',
      align: 'center',
      blankLinesAfter: 1,
    },
    {
      id: 'dir-date-addr',
      kind: 'paragraph',
      body:
        '**Dated:** _______________________, 20_____\n**Address:** {{address_street}}, {{address_city}}, Texas {{address_zip}}',
      blankLinesAfter: 1,
    },
    {
      id: 'dir-wit-h',
      kind: 'heading',
      heading: 'WITNESSES',
      align: 'center',
      blankLinesAfter: 0,
    },
    {
      id: 'dir-wit-txt',
      kind: 'paragraph',
      body:
        'Two competent adult witnesses must sign below, acknowledging the signature of the Declarant. The witnesses may not be a person designated to make a treatment decision for the patient and may not be related to the patient by blood or marriage. The witnesses may not be entitled to any part of the estate and may not have a claim against the estate of the patient. The witnesses may not be the attending physician or an employee of the attending physician. If the witnesses are an employee of a health care facility in which the patient is being cared for, the witness may not be involved in providing direct patient care to the patient. Thw witnesses may not be an officer, director, partner, or business office employee of a health care facility in which the patient is being cared for or of any parent organization of the health care facility.',
      blankLinesAfter: 1,
    },
    {
      id: 'dir-wits',
      kind: 'signature_pair',
      leftLabel: 'Witness 1 — Signature / Date / Print Name',
      rightLabel: 'Witness 2 — Signature / Date / Print Name',
      blankLinesAfter: 0,
    },
  ],
)

export const BUNDLED_HIPAA_SKELETON = pack(
  'HIPAA RELEASE AND AUTHORIZATION FOR USE AND DISCLOSURE OF PROTECTED HEALTH INFORMATION',
  [
    {
      id: 'h-intent-h',
      kind: 'heading',
      heading: 'Statement of Intent',
      align: 'left',
      blankLinesAfter: 0,
    },
    {
      id: 'h-intent',
      kind: 'paragraph',
      body:
        'It is my understanding that congress has passed a law entitled the Health Insurance Portability and Accountability Act of 1996 ("HIPAA"), that there are federal regulations that interpret and implement that law, and that HIPAA limits disclosure of my "Individually Identifiable Health Information" to certain members of my family and friends, regardless of my state of health. I am signing this HIPAA Release And Authorization For Use And Disclosure Of Protected Health Information ("Authorization") so my Health Care Providers can disclose my health care information to the persons listed below, and openly discuss that information them.',
      blankLinesAfter: 1,
    },
    {
      id: 'h-auth-h',
      kind: 'heading',
      heading: '1. Authorization.',
      align: 'left',
      blankLinesAfter: 0,
    },
    {
      id: 'h-auth',
      kind: 'paragraph',
      body:
        'I, **{{legal_full_name}}**, hereby authorize my physicians, nurses, hospitals, and other Health Care Providers to fully disclose my Individually Identifiable Health Information to any and all of the following authorized persons (my "Personal Representatives"):',
      blankLinesAfter: 1,
    },
    {
      id: 'h-rep1',
      kind: 'paragraph',
      body:
        '**Name:** {{hipaa_rep1_name}}\n**Address:** {{hipaa_rep1_address}}\n**Phone:** {{hipaa_rep1_phone}}',
      blankLinesAfter: 1,
    },
    {
      id: 'h-rep2',
      kind: 'paragraph',
      body:
        '**Name:** {{hipaa_rep2_name}}\n**Address:** {{hipaa_rep2_address}}\n**Phone:** {{hipaa_rep2_phone}}',
      blankLinesAfter: 1,
    },
    {
      id: 'h-rep3',
      kind: 'paragraph',
      body:
        '**Name:** {{hipaa_rep3_name}}\n**Address:** {{hipaa_rep3_address}}\n**Phone:** {{hipaa_rep3_phone}}',
      blankLinesAfter: 1,
    },
    {
      id: 'h-rep4',
      kind: 'paragraph',
      body:
        '**Name:** {{hipaa_rep4_name}}\n**Address:** {{hipaa_rep4_address}}\n**Phone:** {{hipaa_rep4_phone}}',
      blankLinesAfter: 1,
    },
    {
      id: 'h-discuss-h',
      kind: 'heading',
      heading: '2. Authority to Discuss and Answer Questions.',
      align: 'left',
      blankLinesAfter: 0,
    },
    {
      id: 'h-discuss',
      kind: 'paragraph',
      body:
        'My Health Care Providers are expressly authorized to answer questions posed by the Personal Representatives listed above and openly discuss with them my condition, treatment, test results, prognosis, and everything pertinent to my health care, even if I am fully competent to ask questions and discuss these matters at the time. This document constitutes a full authorization to disclose ANY Individually Identifiable Health Information to the Personal Representatives named in this Authorization.',
      blankLinesAfter: 1,
    },
    {
      id: 'h-waiver-h',
      kind: 'heading',
      heading: '3. Waiver and Release.',
      align: 'left',
      blankLinesAfter: 0,
    },
    {
      id: 'h-waiver',
      kind: 'paragraph',
      body:
        'I hereby release any Health Care Provider that acts in reliance on this Authorization from any liability that might accrue from releasing my Individually Identifiable Health Information and for any actions taken by my Personal Representatives.',
      blankLinesAfter: 1,
    },
    {
      id: 'h-term-h',
      kind: 'heading',
      heading: '4. Termination.',
      align: 'left',
      blankLinesAfter: 0,
    },
    {
      id: 'h-term',
      kind: 'paragraph',
      body:
        'This Authorization is effective as of the date shown as the date of its signing, and shall not be affected by my subsequent disability or incapacity. This Authorization shall terminate on the first to occur of (1) two years following my death or (2) upon my written revocation actually received by the Health Care Provider. Proof of receipt of my written revocation may be by certified mail, registered mail, facsimile, or any other receipt evidencing actual receipt by the Health Care Provider.',
      blankLinesAfter: 1,
    },
    {
      id: 'h-redisclose-h',
      kind: 'heading',
      heading: '5. Re-Disclosure.',
      align: 'left',
      blankLinesAfter: 0,
    },
    {
      id: 'h-redisclose',
      kind: 'paragraph',
      body:
        'By signing this Authorization, I readily acknowledge that the information used or disclosed pursuant to this Authorization may be subject to re-disclosure by the Personal Representatives named in this Authorization and may no longer be protected by the HIPAA rules. I realize that such re-disclosure might be improper, cause me embarrassment, cause family strife, be misinterpreted by non-health care professionals, and otherwise cause me and my family various forms of injury. I fully indemnify my Health Care Providers for all consequences which may occur as a result of their good faith reliance and compliance with this Authorization. No Health Care Provider shall require my Personal Representatives to indemnify the Health Care Provider or agree to perform any act in order for the Health Care Provider to comply with this Authorization.',
      blankLinesAfter: 1,
    },
    {
      id: 'h-enforce-h',
      kind: 'heading',
      heading: '6. Enforcement.',
      align: 'left',
      blankLinesAfter: 0,
    },
    {
      id: 'h-enforce',
      kind: 'paragraph',
      body:
        'My Personal Representatives shall have the right to bring a legal action in any applicable form against any Health Care Provider that refuses to recognize and accept this Authorization. Additionally, my Personal Representatives are authorized to sign any documents that my Personal Representatives deem necessary or appropriate to obtain my Individually Identifiable Health Information.',
      blankLinesAfter: 1,
    },
    {
      id: 'h-conflict-h',
      kind: 'heading',
      heading: '7. Conflicts With Other Authorization.',
      align: 'left',
      blankLinesAfter: 0,
    },
    {
      id: 'h-conflict',
      kind: 'paragraph',
      body:
        'This Authorization is in addition to other medical release authorizations I may have granted in the past or future. It does not replace them. This Authorization may be relied upon by my Health Care Providers regardless of any real or perceived conflict with any Medical Power of Attorney signed by me, whether prior to or subsequent to the date of this Authorization. I recognize and intend that this will result in multiple persons having the authority to obtain my protected Individually Identifiable Health Information. This Authorization is not intended to replace a Medical Power of Attorney, nor to grant any person the authority to make health care decisions, but merely to obtain information and explanations.',
      blankLinesAfter: 1,
    },
    {
      id: 'h-copies-h',
      kind: 'heading',
      heading: '8. Copies.',
      align: 'left',
      blankLinesAfter: 0,
    },
    {
      id: 'h-copies',
      kind: 'paragraph',
      body:
        'A copy or facsimile of this original Authorization may be accepted and relied upon as though it was an original document.',
      blankLinesAfter: 1,
    },
    {
      id: 'h-def-h',
      kind: 'heading',
      heading: '9. Definitions.',
      align: 'left',
      blankLinesAfter: 0,
    },
    {
      id: 'h-def-intro',
      kind: 'paragraph',
      body: 'The following definitions apply to this Authorization:',
      blankLinesAfter: 1,
    },
    {
      id: 'h-def-a',
      kind: 'paragraph',
      body:
        'a. Individually Identifiable Health Information. The term "Individually Identifiable Health Information" includes, but is not limited to, the following: all health care information reports, and/or records concerning my medical history, condition, diagnosis, testing, prognosis, treatment, billing information, and identity of health care providers and insurers, whether past, present, or future, and any other medical information which is in any way related to my health care. In this Authorization, the term also includes the term "Protected Medical Information" as sometimes used in HIPAA.',
      blankLinesAfter: 1,
    },
    {
      id: 'h-def-b',
      kind: 'paragraph',
      body:
        'b. Health Care Providers. The term "Health Care Providers" includes, but it not limited to, the following: doctors (including but not limited to physicians, podiatrists, chiropractors, or osteopaths), psychiatrists, psychologists, dentists, therapists, nurses, hospitals, clinics, pharmacies, laboratories, ambulance services, assisted living facilities, residential care facilities, bed and board facilities, nursing homes, medical insurance companies, or any other medical providers or affiliates. In this Authorization the term also includes the term "Covered Entity" as sometimes used in HIPAA.',
      blankLinesAfter: 1,
    },
    {
      id: 'h-sig-h',
      kind: 'heading',
      heading: 'SIGNATURE OF INDIVIDUAL/PATIENT',
      align: 'center',
      pageBreakBefore: true,
      blankLinesAfter: 1,
    },
    {
      id: 'h-sig-txt',
      kind: 'paragraph',
      body:
        'I sign my name to this HIPAA RELEASE AND AUTHORIZATION FOR USE AND DISCLOSURE OF PROTECTED HEALTH INFORMATION on _____________________, 20______, in the County of **{{address_county}}**, State of Texas.',
      blankLinesAfter: 1,
    },
    {
      id: 'h-sig',
      kind: 'signature',
      label: 'Signature of Individual/Patient',
      align: 'center',
      blankLinesAfter: 1,
    },
    {
      id: 'h-print',
      kind: 'paragraph',
      body: '**Print Name:** {{legal_full_name}}',
      blankLinesAfter: 1,
    },
    {
      id: 'h-notary',
      kind: 'paragraph',
      body:
        '**THE STATE OF TEXAS**\n\n**COUNTY OF** {{address_county}}\n\nThis instrument was acknowledged before me on this __________ day of _________, 20_____, by **{{legal_full_name}}** (Individual/Patient).',
      blankLinesAfter: 1,
    },
    {
      id: 'h-notary-sig',
      kind: 'signature',
      label: 'NOTARY PUBLIC IN AND FOR THE STATE OF TEXAS',
      align: 'right',
      blankLinesAfter: 0,
    },
  ],
)

export const BUNDLED_ANCILLARY_SKELETONS: Record<AncillaryKind, string> = {
  mpoa: BUNDLED_MPOA_SKELETON,
  dpoa: BUNDLED_DPOA_SKELETON,
  directive: BUNDLED_DIRECTIVE_SKELETON,
  hipaa: BUNDLED_HIPAA_SKELETON,
}

export function bundledSkeletonForAncillary(kind: AncillaryKind): string {
  return BUNDLED_ANCILLARY_SKELETONS[kind]
}

export function needsAncillaryTemplateRefresh(body: string | null | undefined): boolean {
  const text = body?.trim() ?? ''
  if (!text) return true
  return !new RegExp(`"template"\\s*:\\s*"${ANCILLARY_TEMPLATE}"`).test(text)
}
