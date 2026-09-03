/**
 * Bundled spousal trust skeleton — Scott Article X (Option 1 default for admin layout editor).
 * Live PDF generation uses buildSpousalTrustFromAnswers() in spousal-trust.ts
 * (verbatim Scott Option 1 or Option 2 from questionnaire answers).
 */
export const SPOUSAL_TRUST_TEMPLATE = 'spousal-trust-v2-scott'
export const SPOUSAL_TRUST_MARKER = '<!-- texas-will-spousal-trust-v2-scott -->'

export const BUNDLED_SPOUSAL_TRUST_SKELETON = `${SPOUSAL_TRUST_MARKER}
# {{legal_full_name}} — Spousal Testamentary Trust

## SPOUSAL TESTAMENTARY TRUST

### Creation of Trust
If my spouse survives me, I give, devise, and bequeath my entire residuary estate to the Trustee named below, to be held, administered, and distributed in a separate trust for the primary benefit of my spouse, designated as the "{{legal_full_name}} Family Trust."

### Appointment of Trustee
I appoint my spouse as the sole Trustee of the {{legal_full_name}} Family Trust. If my spouse fails or ceases to serve for any reason, I appoint {{spousal_trust_alternate_trustee_name}} as successor Trustee. No Trustee serving under this Instrument shall be required to post bond or other security in any jurisdiction.

### Lifetime Distributions to Spouse
(a) Mandatory Net Income: The Trustee shall pay to or apply for the benefit of my spouse all of the net income of the Trust, distributed at least annually or in more frequent installments. (b) Principal Discretion (HEMS Standard): The Trustee may pay to or apply for the benefit of my spouse so much of the trust principal as the Trustee deems necessary or advisable, in the Trustee's sole discretion, for my spouse's health, education, maintenance, and support in reasonable comfort (the "HEMS Standard"), taking into consideration any other financial resources known to the Trustee to be available to my spouse.

### Termination and Remainder Distribution
Upon the death of my spouse, the {{legal_full_name}} Family Trust shall terminate. The Trustee shall distribute the remaining trust principal and any accrued but undistributed net income in equal shares to my children from my prior relationship: {{spousal_trust_remainder_children}}, per stirpes and not per capita.

### Texas Statutory Administration Powers
(a) General Powers under Texas Property Code § 111.001 et seq. (b) Accounting under Tex. Prop. Code § 113.151. (c) Principal and Income under Chapter 116. (d) Non-Pro Rata Distributions under Tex. Prop. Code § 113.027.

### Trustee Exculpation
To the fullest extent permitted under Texas Property Code § 114.007, no Trustee shall be personally liable except for gross negligence, willful misconduct, intentional fraud, or bad faith, with indemnification for reasonable legal fees when acting in good faith.
`
