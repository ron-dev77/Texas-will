/** Same LSR explanation shown in FAQ and as the checkout consent text. */
export const LSR_FAQ = {
  q: 'Since Texas AI Law Group, PLLC is reviewing my will, do I have an attorney-client relationship with them?',
  a: "Yes, but it's what's called a Limited Scope Representation (or LSR). By agreeing to a LSR (which you must affirm prior to starting your will), you are agreeing that the representation is limited to only reviewing the data provided in the questionnaire and ensuring it is correctly populated in a standard Texas will template. Neither you, The Texas AI Law Group PLLC, nor MyAIWill.com are doing any tax or probate planning.",
} as const

export const FAQS = [
  {
    q: 'Is an AI-generated will actually valid in Texas?',
    a: "Yes. Texas law doesn't specify how a will must be drafted — only how it must be signed and witnessed. Our questionnaire is built around the Texas Estates Code, and a licensed Texas attorney reviews every will before it reaches you.",
  },
  {
    q: 'What if my situation is complicated?',
    a: "My AI Will is built for straightforward Texas estates. If you have multiple properties, a business, a blended family with complex dynamics, or significant estate-tax planning needs, we'll tell you upfront and recommend you work directly with an attorney.",
  },
  {
    q: 'How does the attorney review actually work?',
    a: 'After you submit your answers, your draft is queued for review by a licensed Texas attorney. Within 24 hours they read your specific document, flag anything that needs your attention, and approve it for delivery. It is not an automated stamp.',
  },
  {
    q: 'Do you offer refunds?',
    a: "Because every order triggers attorney time, we don't offer refunds once payment is processed. If you change your mind before starting the questionnaire, contact us and we'll do the right thing.",
  },
  {
    q: 'How long do witnesses, signing, and the self-proving affidavit take?',
    a: "Once your will arrives, signing in front of two witnesses takes about 15 minutes. We include plain-English instructions for the Texas self-proving affidavit so your will doesn't need witness testimony later.",
  },
  {
    q: 'How does the couples plan work?',
    a: 'You and your partner each get a private link to fill out your half of the questionnaire. We coordinate the documents so they reference each other correctly, then a Texas attorney reviews both.',
  },
  {
    q: 'Do you make living trusts?',
    a: "No. My AI Will is Texas will-based estate planning: a last will and optional Texas papers (powers of attorney, directive, HIPAA). We do not sell or draft a revocable living trust.",
  },
  {
    q: 'I live in Texas — do I need a revocable living trust?',
    a: "Usually no. My AI Will is Texas will-based estate planning. For most Texas residents whose assets are in Texas, a will plus beneficiary designations is enough, because Texas independent probate is relatively fast and inexpensive. A revocable living trust may be needed only in limited cases: you own a house or land outside Texas; you own an interest in a private LLC, partnership, or closely held company; or you have a heightened need for privacy (a will is filed in court). If any of those apply, we stop checkout and send you to Texas estate-planning law firms.",
  },
  {
    q: 'Can I leave a gift in a special needs trust or a Texas ABLE account?',
    a: 'Yes. If someone who inherits from you may get SSI or Medicaid, the questionnaire asks whether you want a special needs trust in this will, a gift to a Texas ABLE account, or both (ABLE first, leftover in the trust). ABLE accounts have contribution limits that change; we do not invent a dollar cutoff in the form. A licensed Texas attorney must read and approve that language before the will is sent to you.',
  },
  {
    q: 'Is My AI Will a law firm?',
    a: 'No. We are a software service that produces a Texas-compliant will template, which is then reviewed by a licensed Texas attorney. Using our service does not create an attorney-client relationship with My AI Will itself.',
  },
  {
    q: 'What attorney or law firm will be reviewing my will?',
    a: 'Currently MyAi Wills are reviewed by a law firm from or affiliated with the law firm "Texas Ai Law Group, PLLC."',
  },
  LSR_FAQ,
  {
    q: 'Where is my data stored?',
    a: 'Your answers are stored encrypted in our backend. We never sell your data. You can request deletion at any time after delivery.',
  },
] as const
