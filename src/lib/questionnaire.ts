import { formatPhoneNumber, formatPhoneNumberIntl } from 'react-phone-number-input'

export type FieldType =
  | 'shorttext'
  | 'longtext'
  | 'email'
  | 'phone'
  | 'date'
  | 'radio'
  | 'yesno'
  | 'people'
  | 'gifts'
  | 'charitable_gifts'

export type ShowIf = {
  field: string
  equals?: string
  in?: readonly string[]
}

export type Field = {
  id: string
  label: string
  helper?: string
  type: FieldType
  placeholder?: string
  options?: readonly { value: string; label: string }[]
  required?: boolean
  /** Soft min length — checked on blur (progressive: shown before max). */
  minLength?: number
  /** Hard max length — prevents oversized PDF paragraphs. */
  maxLength?: number
  showIf?: ShowIf
}

export type Section = {
  id: string
  title: string
  intro: string
  fields: readonly Field[]
  /** Hide this section unless the order includes a trust add-on. */
  requiresTrust?: boolean
  /** Final review/submit step (no questions required). */
  isReview?: boolean
}

export type PersonRow = { name: string; date_of_birth?: string }
export type GiftRow = { item: string; recipient: string }

export const SECTIONS: readonly Section[] = [
  {
    id: 'you',
    title: 'About you',
    intro: "Let's start with the basics. This is the person whose will we are creating.",
    fields: [
      {
        id: 'legal_full_name',
        label: 'Your full legal name',
        helper: 'Exactly as it appears on your ID.',
        type: 'shorttext',
        required: true,
        placeholder: 'Jane Marie Doe',
        minLength: 3,
        maxLength: 80,
      },
      {
        id: 'also_known_as',
        label: 'Other names you go by',
        helper: 'Maiden names, nicknames that appear on accounts.',
        type: 'shorttext',
        placeholder: 'Jane Doe, Janie',
        minLength: 2,
        maxLength: 80,
      },
      { id: 'date_of_birth', label: 'Date of birth', type: 'date', required: true },
      {
        id: 'phone',
        label: 'Phone number',
        type: 'phone',
        placeholder: '(512) 555-0100',
        minLength: 10,
        maxLength: 20,
      },
    ],
  },
  {
    id: 'residence',
    title: 'Where you live',
    intro:
      'Texas law requires us to know the county you live in. This is the county that will have jurisdiction over your estate.',
    fields: [
      {
        id: 'address_street',
        label: 'Street address',
        type: 'shorttext',
        required: true,
        placeholder: '123 Main St',
        minLength: 5,
        maxLength: 100,
      },
      {
        id: 'address_city',
        label: 'City',
        type: 'shorttext',
        required: true,
        placeholder: 'Austin',
        minLength: 2,
        maxLength: 40,
      },
      {
        id: 'address_county',
        label: 'County',
        type: 'shorttext',
        required: true,
        placeholder: 'Travis',
        minLength: 2,
        maxLength: 40,
      },
      {
        id: 'address_zip',
        label: 'ZIP code',
        type: 'shorttext',
        required: true,
        placeholder: '78701',
        minLength: 5,
        maxLength: 5,
      },
    ],
  },
  {
    id: 'marital',
    title: 'Your spouse or partner',
    intro:
      'If you are married, your spouse has specific rights under Texas community property law. Tell us about them.',
    fields: [
      {
        id: 'marital_status',
        label: 'Marital status',
        type: 'radio',
        required: true,
        options: [
          { value: 'single', label: 'Single' },
          { value: 'married', label: 'Married' },
          { value: 'domestic_partnership', label: 'Domestic partnership' },
          { value: 'divorced', label: 'Divorced' },
          { value: 'widowed', label: 'Widowed' },
        ],
      },
      {
        id: 'spouse_full_name',
        label: "Spouse's full legal name",
        type: 'shorttext',
        placeholder: 'Jane Marie Doe',
        minLength: 3,
        maxLength: 80,
        showIf: { field: 'marital_status', in: ['married', 'domestic_partnership'] },
      },
      {
        id: 'marriage_date',
        label: 'Date of marriage',
        type: 'date',
        showIf: { field: 'marital_status', equals: 'married' },
      },
    ],
  },
  {
    id: 'children',
    title: 'Your children & guardians',
    intro:
      "Add every child you'd like named in your will — biological, adopted, or stepchildren you wish to include. If you have minor children, you'll also name a guardian to raise them if both parents pass away.",
    fields: [
      { id: 'has_children', label: 'Do you have children?', type: 'yesno', required: true },
      {
        id: 'children',
        label: 'List your children',
        helper: 'Add each child with their full name and date of birth.',
        type: 'people',
        required: true,
        minLength: 2,
        maxLength: 80,
        showIf: { field: 'has_children', equals: 'yes' },
      },
      {
        id: 'primary_guardian_name',
        label: 'Primary guardian — full name',
        type: 'shorttext',
        required: true,
        placeholder: 'Alex Rivera',
        minLength: 3,
        maxLength: 80,
        showIf: { field: 'has_children', equals: 'yes' },
      },
      {
        id: 'primary_guardian_relationship',
        label: 'Relationship to your children',
        type: 'shorttext',
        placeholder: 'Sister, close friend, etc.',
        minLength: 2,
        maxLength: 40,
        showIf: { field: 'has_children', equals: 'yes' },
      },
      {
        id: 'alternate_guardian_name',
        label: 'Alternate guardian — full name',
        helper: 'In case your primary guardian is unable to serve.',
        type: 'shorttext',
        required: true,
        placeholder: 'Jordan Lee',
        minLength: 3,
        maxLength: 80,
        showIf: { field: 'has_children', equals: 'yes' },
      },
      {
        id: 'guardian_notes',
        label: 'Anything the attorney should know? (optional)',
        type: 'longtext',
        minLength: 10,
        maxLength: 400,
        showIf: { field: 'has_children', equals: 'yes' },
      },
    ],
  },
  {
    id: 'executor',
    title: 'Executor of your will',
    intro:
      'Your executor carries out your wishes after you pass — paying debts, distributing assets, and handling the court process. Pick someone responsible.',
    fields: [
      {
        id: 'executor_name',
        label: "Executor's full legal name",
        type: 'shorttext',
        required: true,
        placeholder: 'Alex Rivera',
        minLength: 3,
        maxLength: 80,
      },
      {
        id: 'executor_relationship',
        label: 'Relationship to you',
        type: 'shorttext',
        required: true,
        placeholder: 'Spouse, sibling, friend',
        minLength: 2,
        maxLength: 40,
      },
      {
        id: 'executor_email',
        label: "Executor's email",
        type: 'email',
        placeholder: 'alex@email.com',
        minLength: 5,
        maxLength: 80,
      },
      {
        id: 'alt_executor_name',
        label: 'Alternate executor — full name',
        helper: "If your primary executor can't or won't serve.",
        type: 'shorttext',
        required: true,
        placeholder: 'Jordan Lee',
        minLength: 3,
        maxLength: 80,
      },
      {
        id: 'alt_executor_relationship',
        label: 'Alternate executor — relationship to you',
        type: 'shorttext',
        placeholder: 'Sibling, friend, attorney',
        minLength: 2,
        maxLength: 40,
      },
    ],
  },
  {
    id: 'specific_gifts',
    title: 'Specific gifts',
    intro:
      "Items you'd like to leave to specific people — heirlooms, vehicles, sentimental things. You can skip this if everything goes to your residuary.",
    fields: [
      {
        id: 'has_specific_gifts',
        label: 'Do you want to leave any specific items to specific people?',
        type: 'yesno',
        required: true,
      },
      {
        id: 'specific_gifts',
        label: 'Specific gifts',
        helper: 'Describe each item and who it goes to.',
        type: 'gifts',
        required: true,
        minLength: 2,
        maxLength: 120,
        showIf: { field: 'has_specific_gifts', equals: 'yes' },
      },
    ],
  },
  {
    id: 'charitable',
    title: 'Charitable gifts',
    intro:
      'Many Texans choose to leave a portion of their estate to a church, school, or charity. Entirely optional.',
    fields: [
      {
        id: 'has_charitable_gifts',
        label: 'Do you want to leave anything to charity?',
        type: 'yesno',
        required: true,
      },
      {
        id: 'charitable_gifts',
        label: 'Charitable gifts',
        helper:
          'Enter the dollar amount or percentage on the left, and the full legal name of the charity on the right.',
        type: 'charitable_gifts',
        required: true,
        minLength: 2,
        maxLength: 120,
        showIf: { field: 'has_charitable_gifts', equals: 'yes' },
      },
    ],
  },
  {
    id: 'residuary',
    title: 'The rest of your estate',
    intro:
      'Everything you haven\'t given away above is called your "residuary estate." Who should receive it?',
    fields: [
      {
        id: 'residuary_plan',
        label: 'Who receives the rest of your estate?',
        type: 'radio',
        required: true,
        options: [
          {
            value: 'spouse_then_children',
            label: "All to my spouse; if they don't survive me, equally to my children",
          },
          { value: 'children_equally', label: 'Equally among my children' },
          { value: 'spouse_only', label: 'All to my spouse' },
          { value: 'custom', label: "A custom split — I'll describe it" },
        ],
      },
      {
        id: 'residuary_custom',
        label: 'Describe your custom split',
        type: 'longtext',
        minLength: 15,
        maxLength: 500,
        showIf: { field: 'residuary_plan', equals: 'custom' },
      },
    ],
  },
  {
    id: 'special_needs',
    title: 'Special needs and Texas ABLE',
    intro:
      'If someone who will inherit from you has a disability or may get SSI or Medicaid, you can leave their share through a special needs trust in this will, a Texas ABLE account, or both. Those options are meant to add to government benefits, not replace them. A licensed Texas attorney must read and approve this language before we send the will. We do not set a dollar cutoff here; ABLE contribution limits change.',
    fields: [
      {
        id: 'wants_snt',
        label:
          'Do you want special-needs planning in this will for someone who may receive SSI, Medicaid, or other disability benefits?',
        type: 'yesno',
        required: true,
      },
      {
        id: 'snt_plan',
        label: 'How should that person\'s share be left?',
        helper:
          'A Texas ABLE account is often used for a smaller gift. A special needs trust can hold a larger share. You can also fill an ABLE account first and put any leftover in a special needs trust. The reviewing attorney will confirm which option fits.',
        type: 'radio',
        required: true,
        options: [
          {
            value: 'trust',
            label: 'Special needs trust in this will',
          },
          {
            value: 'able',
            label: 'Texas ABLE account',
          },
          {
            value: 'able_then_trust',
            label: 'Texas ABLE first; leftover in a special needs trust',
          },
        ],
        showIf: { field: 'wants_snt', equals: 'yes' },
      },
      {
        id: 'snt_beneficiary_name',
        label: 'Beneficiary — full legal name',
        helper: 'The person whose inheritance should go into the special needs trust and/or Texas ABLE account.',
        type: 'shorttext',
        required: true,
        placeholder: 'Maya Elise Doe',
        minLength: 3,
        maxLength: 80,
        showIf: { field: 'wants_snt', equals: 'yes' },
      },
      {
        id: 'able_has_account',
        label: 'Does this beneficiary already have a Texas ABLE account?',
        type: 'yesno',
        required: true,
        showIf: { field: 'snt_plan', in: ['able', 'able_then_trust'] },
      },
      {
        id: 'able_account_name',
        label: 'Name on that Texas ABLE account (if you know it)',
        type: 'shorttext',
        required: true,
        placeholder: 'Maya Elise Doe Texas ABLE',
        minLength: 3,
        maxLength: 120,
        showIf: { field: 'able_has_account', equals: 'yes' },
      },
      {
        id: 'snt_trustee_name',
        label: 'Trustee — full legal name',
        helper: 'This person manages the trust. Do not name the beneficiary.',
        type: 'shorttext',
        required: true,
        placeholder: 'Alex Rivera Doe',
        minLength: 3,
        maxLength: 80,
        showIf: { field: 'snt_plan', in: ['trust', 'able_then_trust'] },
      },
      {
        id: 'snt_successor_trustee_name',
        label: 'Successor trustee — full legal name',
        helper: 'Serves if the first trustee cannot. Do not name the beneficiary.',
        type: 'shorttext',
        required: true,
        placeholder: 'Jordan Lee',
        minLength: 3,
        maxLength: 80,
        showIf: { field: 'snt_plan', in: ['trust', 'able_then_trust'] },
      },
      {
        id: 'snt_remainder',
        label: 'Who gets leftover money when the beneficiary dies?',
        helper: 'Name each person, their relationship, and their share (for example: 50% to Alex Rivera Doe, spouse).',
        type: 'longtext',
        required: true,
        minLength: 8,
        maxLength: 500,
        showIf: { field: 'snt_plan', in: ['trust', 'able_then_trust'] },
      },
      {
        id: 'snt_contingent_remainder',
        label: 'If a leftover person dies first, who gets that share?',
        type: 'longtext',
        required: true,
        minLength: 8,
        maxLength: 400,
        showIf: { field: 'snt_plan', in: ['trust', 'able_then_trust'] },
      },
      {
        id: 'snt_trustee_notes',
        label: 'Optional notes for the trustee (not binding)',
        type: 'longtext',
        minLength: 5,
        maxLength: 400,
        showIf: { field: 'snt_plan', in: ['trust', 'able_then_trust'] },
      },
      {
        id: 'snt_has_existing',
        label: 'Does this beneficiary already have a special needs trust?',
        type: 'yesno',
        required: true,
        showIf: { field: 'snt_plan', in: ['trust', 'able_then_trust'] },
      },
      {
        id: 'snt_existing_name',
        label: 'Name of the existing trust',
        type: 'shorttext',
        required: true,
        placeholder: 'The Maya Elise Doe Special Needs Trust',
        minLength: 5,
        maxLength: 120,
        showIf: { field: 'snt_has_existing', equals: 'yes' },
      },
      {
        id: 'snt_existing_date',
        label: 'Date that existing trust was created',
        type: 'date',
        required: true,
        showIf: { field: 'snt_has_existing', equals: 'yes' },
      },
    ],
  },
  {
    id: 'trust_trustees',
    title: 'Living trust — trustees',
    intro:
      'You added the Revocable Living Trust to your order. Name your trust and who will manage it after you.',
    requiresTrust: true,
    fields: [
      {
        id: 'trust_name',
        label: 'Name of your trust',
        helper:
          'We\'ll default to "The [Your Full Name] Revocable Living Trust dated [Year]" if left blank.',
        type: 'shorttext',
        placeholder: 'The Jane Marie Doe Revocable Living Trust dated 2026',
        minLength: 5,
        maxLength: 120,
      },
      {
        id: 'trust_successor_trustee_name',
        label: 'Successor trustee — full legal name',
        helper:
          'You serve as trustee while alive. This person takes over on your death or incapacity.',
        type: 'shorttext',
        required: true,
        placeholder: 'Alex Rivera',
        minLength: 3,
        maxLength: 80,
      },
      {
        id: 'trust_successor_trustee_relationship',
        label: 'Successor trustee — relationship to you',
        type: 'shorttext',
        placeholder: 'Spouse, sibling, adult child, close friend',
        minLength: 2,
        maxLength: 40,
      },
      {
        id: 'trust_successor_trustee_address',
        label: 'Successor trustee — mailing address',
        type: 'longtext',
        placeholder: '123 Main St, Austin, TX 78701',
        minLength: 8,
        maxLength: 200,
      },
      {
        id: 'trust_alternate_successor_trustee_name',
        label: 'Alternate successor trustee — full legal name',
        helper: "In case your primary successor trustee can't or won't serve.",
        type: 'shorttext',
        placeholder: 'Jordan Lee',
        minLength: 3,
        maxLength: 80,
      },
      {
        id: 'trust_alternate_successor_trustee_address',
        label: 'Alternate successor trustee — mailing address',
        type: 'longtext',
        placeholder: '456 Oak Ave, Dallas, TX 75201',
        minLength: 8,
        maxLength: 200,
      },
    ],
  },
  {
    id: 'trust_distributions',
    title: 'Living trust — assets & gifts',
    intro:
      'Tell us what you’ll fund the trust with and how remaining trust property should pass on your death.',
    requiresTrust: true,
    fields: [
      {
        id: 'trust_assets',
        label: 'Assets you plan to fund the trust with',
        helper:
          'List each asset on its own line. Include a short description and approximate value.',
        type: 'longtext',
        required: true,
        placeholder:
          '123 Main St, Austin TX (primary residence) — approx $450,000.\nChase checking ending 1234 — approx $18,000.',
        minLength: 15,
        maxLength: 800,
      },
      {
        id: 'trust_specific_gifts',
        label: 'Specific distributions from the trust on your death',
        type: 'longtext',
        placeholder: '$10,000 to my sister Anne Doe.',
        minLength: 5,
        maxLength: 400,
      },
      {
        id: 'trust_residuary_plan',
        label: 'Who receives the remaining trust property on your death?',
        type: 'radio',
        required: true,
        options: [
          {
            value: 'same_as_will',
            label: "Same beneficiaries and shares as my will's residuary",
          },
          { value: 'custom', label: "A custom split — I'll describe it" },
        ],
      },
      {
        id: 'trust_residuary_custom',
        label: "Describe the trust's residuary split",
        type: 'longtext',
        minLength: 15,
        maxLength: 500,
        showIf: { field: 'trust_residuary_plan', equals: 'custom' },
      },
      {
        id: 'trust_distribution_age',
        label: 'Hold shares in trust for minor beneficiaries until what age?',
        type: 'shorttext',
        placeholder: '25',
        minLength: 1,
        maxLength: 3,
      },
    ],
  },
  {
    id: 'medical_poa',
    title: 'Medical power of attorney',
    intro:
      'Designation of health care agent. These answers fill the Texas Medical Power of Attorney (Name, Address, and Phone for each agent).',
    fields: [
      {
        id: 'mpoa_agent_name',
        label: 'Health care agent — full name',
        type: 'shorttext',
        required: true,
        placeholder: 'Alex Rivera',
        minLength: 2,
        maxLength: 80,
      },
      {
        id: 'mpoa_agent_address',
        label: 'Health care agent — address',
        type: 'longtext',
        required: true,
        placeholder: '123 Main St, Austin, TX 78701',
        minLength: 8,
        maxLength: 200,
      },
      {
        id: 'mpoa_agent_phone',
        label: 'Health care agent — phone',
        type: 'phone',
        required: true,
        placeholder: '(512) 555-0100',
      },
      {
        id: 'mpoa_limitations',
        label: 'Limitations on the decision-making authority of my agent',
        helper: 'Leave blank if there are no limits.',
        type: 'longtext',
        placeholder: 'No limitations.',
        maxLength: 600,
      },
      {
        id: 'mpoa_alt_agent_name',
        label: 'First alternate agent — full name (optional)',
        type: 'shorttext',
        placeholder: 'Jordan Lee',
        maxLength: 80,
      },
      {
        id: 'mpoa_alt_agent_address',
        label: 'First alternate agent — address (optional)',
        type: 'longtext',
        placeholder: '456 Oak Ave, Dallas, TX 75201',
        minLength: 8,
        maxLength: 200,
      },
      {
        id: 'mpoa_alt_agent_phone',
        label: 'First alternate agent — phone (optional)',
        type: 'phone',
        placeholder: '(512) 555-0199',
      },
      {
        id: 'mpoa_alt2_agent_name',
        label: 'Second alternate agent — full name (optional)',
        type: 'shorttext',
        placeholder: 'Sam Patel',
        maxLength: 80,
      },
      {
        id: 'mpoa_alt2_agent_address',
        label: 'Second alternate agent — address (optional)',
        type: 'longtext',
        placeholder: '789 Pine St, Houston, TX 77002',
        minLength: 8,
        maxLength: 200,
      },
      {
        id: 'mpoa_alt2_agent_phone',
        label: 'Second alternate agent — phone (optional)',
        type: 'phone',
        placeholder: '(512) 555-0177',
      },
      {
        id: 'mpoa_expires_on',
        label: 'This power of attorney ends on the following date (optional)',
        helper: 'Leave blank or write Not Applicable. If blank, there is no expiration.',
        type: 'shorttext',
        placeholder: 'Not Applicable',
        maxLength: 40,
      },
    ],
  },
  {
    id: 'durable_poa',
    title: 'Durable power of attorney',
    intro:
      'Statutory Durable Power of Attorney. Name your agent and successors. This does not authorize medical or health-care decisions.',
    fields: [
      {
        id: 'dpoa_agent_name',
        label: 'Agent — full name',
        type: 'shorttext',
        required: true,
        placeholder: 'Alex Rivera',
        minLength: 2,
        maxLength: 80,
      },
      {
        id: 'dpoa_agent_address',
        label: 'Agent — address',
        type: 'longtext',
        required: true,
        placeholder: '123 Main St, Austin, TX 78701',
        minLength: 8,
        maxLength: 200,
      },
      {
        id: 'dpoa_agent_phone',
        label: 'Agent — phone (optional)',
        type: 'phone',
        placeholder: '(512) 555-0100',
      },
      {
        id: 'dpoa_grant_all',
        label: 'Grant all statutory powers listed in (A) through (N)?',
        helper: 'Initial line (O) on the form. This is the usual choice.',
        type: 'yesno',
        required: true,
      },
      {
        id: 'dpoa_powers_list',
        label: 'If not all powers, which letters do you grant?',
        helper: 'Example: A, E, J, M',
        type: 'shorttext',
        placeholder: 'A, E, J, M',
        maxLength: 40,
        showIf: { field: 'dpoa_grant_all', equals: 'no' },
      },
      {
        id: 'dpoa_compensation',
        label: 'Agent compensation',
        type: 'radio',
        required: true,
        options: [
          {
            value: 'reasonable',
            label: 'Reimbursement of reasonable expenses and reasonable compensation',
          },
          {
            value: 'expenses_only',
            label: 'Reimbursement of reasonable expenses only — no compensation',
          },
        ],
      },
      {
        id: 'dpoa_gift_power',
        label: 'Grant the agent power to make gifts (annual exclusion limit)?',
        type: 'yesno',
        required: true,
      },
      {
        id: 'dpoa_special_instructions',
        label: 'Special instructions limiting or extending the agent’s powers (optional)',
        type: 'longtext',
        placeholder: 'No additional special instructions.',
        maxLength: 600,
      },
      {
        id: 'dpoa_when_effective',
        label: 'When should this power of attorney take effect?',
        helper:
          '(A) immediately and not affected by later disability, or (B) only upon disability or incapacity.',
        type: 'radio',
        required: true,
        options: [
          { value: 'immediately', label: '(A) Effective immediately when I sign' },
          { value: 'incapacity', label: '(B) Effective only if I become incapacitated' },
        ],
      },
      {
        id: 'dpoa_alt_agent_name',
        label: 'First alternate agent — full name (optional)',
        type: 'shorttext',
        placeholder: 'Jordan Lee',
        maxLength: 80,
      },
      {
        id: 'dpoa_alt_agent_address',
        label: 'First alternate agent — address (optional)',
        type: 'longtext',
        placeholder: '456 Oak Ave, Dallas, TX 75201',
        minLength: 8,
        maxLength: 200,
      },
      {
        id: 'dpoa_alt_agent_phone',
        label: 'First alternate agent — phone (optional)',
        type: 'phone',
        placeholder: '(512) 555-0199',
      },
      {
        id: 'dpoa_alt2_agent_name',
        label: 'Second alternate agent — full name (optional)',
        type: 'shorttext',
        placeholder: 'Sam Patel',
        maxLength: 80,
      },
      {
        id: 'dpoa_alt2_agent_address',
        label: 'Second alternate agent — address (optional)',
        type: 'longtext',
        placeholder: '789 Pine St, Houston, TX 77002',
        minLength: 8,
        maxLength: 200,
      },
      {
        id: 'dpoa_alt2_agent_phone',
        label: 'Second alternate agent — phone (optional)',
        type: 'phone',
        placeholder: '(214) 555-0133',
      },
    ],
  },
  {
    id: 'directive',
    title: 'Directive to physicians',
    intro:
      'Advance Directive. Initial the treatment choices that best reflect your wishes if you cannot speak for yourself.',
    fields: [
      {
        id: 'directive_terminal',
        label:
          'If I have a terminal condition and am expected to die within six months even with life-sustaining treatment…',
        type: 'radio',
        required: true,
        options: [
          {
            value: 'comfort',
            label:
              'Discontinue or withhold treatments other than comfort care and allow me to die as gently as possible',
          },
          {
            value: 'prolong',
            label:
              'Keep me alive in this terminal condition using available life-sustaining treatment (does not apply to hospice)',
          },
        ],
      },
      {
        id: 'directive_irreversible',
        label:
          'If I have an irreversible condition so I cannot care for myself or decide for myself, and I am expected to die without life-sustaining treatment…',
        type: 'radio',
        required: true,
        options: [
          {
            value: 'comfort',
            label:
              'Discontinue or withhold treatments other than comfort care and allow me to die as gently as possible',
          },
          {
            value: 'prolong',
            label:
              'Keep me alive in this irreversible condition using available life-sustaining treatment (does not apply to hospice)',
          },
        ],
      },
      {
        id: 'directive_additional',
        label: 'Additional requests about particular treatments',
        helper:
          'For example, artificially administered nutrition and hydration, or intravenous antibiotics.',
        type: 'radio',
        required: true,
        options: [
          { value: 'none', label: 'None at this time' },
          { value: 'custom', label: 'I will list particular treatments I do or do not want' },
        ],
      },
      {
        id: 'directive_notes',
        label: 'Particular treatments I do or do not want',
        type: 'longtext',
        required: true,
        placeholder: 'I do not want artificially administered nutrition and hydration.',
        minLength: 10,
        maxLength: 600,
        showIf: { field: 'directive_additional', equals: 'custom' },
      },
    ],
  },
  {
    id: 'hipaa',
    title: 'HIPAA release',
    intro:
      'Name up to four Personal Representatives. Your Health Care Providers may disclose your Individually Identifiable Health Information to these people and discuss it with them.',
    fields: [
      {
        id: 'hipaa_rep1_name',
        label: 'Personal Representative 1 — full name',
        type: 'shorttext',
        required: true,
        placeholder: 'Alex Rivera',
        minLength: 2,
        maxLength: 80,
      },
      {
        id: 'hipaa_rep1_address',
        label: 'Personal Representative 1 — address',
        type: 'longtext',
        required: true,
        placeholder: '123 Main St, Austin, TX 78701',
        minLength: 8,
        maxLength: 200,
      },
      {
        id: 'hipaa_rep1_phone',
        label: 'Personal Representative 1 — phone',
        type: 'phone',
        required: true,
        placeholder: '(512) 555-0100',
      },
      {
        id: 'hipaa_rep2_name',
        label: 'Personal Representative 2 — full name (optional)',
        type: 'shorttext',
        placeholder: 'Jordan Lee',
        maxLength: 80,
      },
      {
        id: 'hipaa_rep2_address',
        label: 'Personal Representative 2 — address (optional)',
        type: 'longtext',
        placeholder: '456 Oak Ave, Dallas, TX 75201',
        minLength: 8,
        maxLength: 200,
      },
      {
        id: 'hipaa_rep2_phone',
        label: 'Personal Representative 2 — phone (optional)',
        type: 'phone',
        placeholder: '(512) 555-0199',
      },
      {
        id: 'hipaa_rep3_name',
        label: 'Personal Representative 3 — full name (optional)',
        type: 'shorttext',
        placeholder: 'Sam Patel',
        maxLength: 80,
      },
      {
        id: 'hipaa_rep3_address',
        label: 'Personal Representative 3 — address (optional)',
        type: 'longtext',
        placeholder: '789 Pine St, Houston, TX 77002',
        minLength: 8,
        maxLength: 200,
      },
      {
        id: 'hipaa_rep3_phone',
        label: 'Personal Representative 3 — phone (optional)',
        type: 'phone',
        placeholder: '(214) 555-0133',
      },
      {
        id: 'hipaa_rep4_name',
        label: 'Personal Representative 4 — full name (optional)',
        type: 'shorttext',
        placeholder: 'Casey Morgan Reed',
        maxLength: 80,
      },
      {
        id: 'hipaa_rep4_address',
        label: 'Personal Representative 4 — address (optional)',
        type: 'longtext',
        placeholder: '901 West Lynn St, Austin, TX 78703',
        minLength: 8,
        maxLength: 200,
      },
      {
        id: 'hipaa_rep4_phone',
        label: 'Personal Representative 4 — phone (optional)',
        type: 'phone',
        placeholder: '(512) 555-0177',
      },
    ],
  },
  {
    id: 'final_wishes',
    title: 'Final wishes',
    intro:
      'Texas law treats funeral instructions as guidance, not a binding directive — but writing them down helps your family enormously.',
    fields: [
      {
        id: 'disposition',
        label: 'Burial, cremation, or other?',
        type: 'radio',
        required: true,
        options: [
          { value: 'burial', label: 'Burial' },
          { value: 'cremation', label: 'Cremation' },
          { value: 'donation', label: 'Donate to medical science' },
          { value: 'unsure', label: "I'd rather my family decide" },
        ],
      },
      {
        id: 'service_wishes',
        label: 'Service or memorial wishes (optional)',
        type: 'longtext',
        placeholder: "Anything you'd want said, sung, or skipped.",
        minLength: 5,
        maxLength: 400,
      },
    ],
  },
  {
    id: 'review',
    title: 'Review & submit',
    intro:
      'Review your answers below. When everything looks right, submit for attorney review.',
    isReview: true,
    fields: [],
  },
]

/** Sections shown in the questionnaire (hide trust / unselected package docs). */
export function getActiveSections(
  includeTrust: boolean,
  sections: readonly Section[] = SECTIONS,
  documents: readonly string[] = ['will'],
): Section[] {
  const docs = new Set(documents.length ? documents : ['will'])
  const willOnly = new Set([
    'children',
    'executor',
    'specific_gifts',
    'charitable',
    'residuary',
    'special_needs',
    'final_wishes',
  ])

  return sections.filter((s) => {
    if (s.requiresTrust || s.id === 'trust_trustees' || s.id === 'trust_distributions') {
      return includeTrust
    }
    if (s.id === 'medical_poa') return docs.has('mpoa')
    if (s.id === 'durable_poa') return docs.has('dpoa')
    if (s.id === 'directive') return docs.has('directive')
    if (s.id === 'hipaa') return docs.has('hipaa')
    if (willOnly.has(s.id)) return docs.has('will')
    // Shared identity / residence / marital / review — always keep when any doc selected
    return true
  })
}

export function isFieldVisible(field: Field, answers: Record<string, unknown>): boolean {
  const cond = field.showIf
  if (!cond) return true
  const value = answers[cond.field]
  if (cond.equals !== undefined && value !== cond.equals) return false
  if (cond.in && !cond.in.includes(value as string)) return false
  return true
}

export function getVisibleFields(section: Section, answers: Record<string, unknown>): Field[] {
  return section.fields.filter((f) => isFieldVisible(f, answers))
}

export function isFieldFilled(field: Field, value: unknown): boolean {
  if (field.type === 'yesno') return value === 'yes' || value === 'no'
  if (field.type === 'people') {
    if (!Array.isArray(value) || value.length === 0) return false
    return value.every((row: PersonRow) => {
      const nameOk = typeof row?.name === 'string' && row.name.trim() !== ''
      if (!nameOk) return false
      if (field.id === 'children') {
        return typeof row?.date_of_birth === 'string' && row.date_of_birth.trim() !== ''
      }
      return true
    })
  }
  if (field.type === 'gifts' || field.type === 'charitable_gifts') {
    if (!Array.isArray(value) || value.length === 0) return false
    return value.every(
      (row: GiftRow) =>
        typeof row?.item === 'string' &&
        row.item.trim() !== '' &&
        typeof row?.recipient === 'string' &&
        row.recipient.trim() !== '',
    )
  }
  if (Array.isArray(value)) return value.length > 0
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return false
    if (field.id === 'address_zip') return /^\d{5}$/.test(trimmed)
    if (field.id === 'address_city' || field.id === 'address_county') {
      return /^[A-Za-z][A-Za-z\s.'-]*$/.test(trimmed)
    }
    return true
  }
  return !(value === undefined || value === null || value === '')
}

export function missingRequired(
  section: Section,
  answers: Record<string, unknown>,
): Field[] {
  return getVisibleFields(section, answers).filter(
    (f) => f.required && !isFieldFilled(f, answers[f.id]),
  )
}

/**
 * Progressive quality check for blur / live fix:
 * 1) required / format first
 * 2) then min length
 * 3) then max length (only after min is met)
 * Returns one message at a time; null when valid.
 */
export function fieldQualityError(field: Field, value: unknown): string | null {
  if (field.type === 'radio' || field.type === 'yesno') {
    if (field.required && !isFieldFilled(field, value)) return 'Please make a selection'
    return null
  }

  if (field.type === 'people') {
    if (!Array.isArray(value) || value.length === 0) {
      return field.required ? 'Add at least one person' : null
    }
    const min = field.minLength ?? 2
    const max = field.maxLength ?? 80
    for (const row of value as PersonRow[]) {
      const name = (row?.name ?? '').trim()
      if (!name) return 'Enter a full name'
      if (name.length < min) return `Enter at least ${min} characters for each name`
      if (name.length > max) return `Keep each name to ${max} characters or fewer`
      if (field.id === 'children' && !(row?.date_of_birth ?? '').trim()) {
        return 'Add a date of birth for each child'
      }
    }
    return null
  }

  if (field.type === 'gifts' || field.type === 'charitable_gifts') {
    if (!Array.isArray(value) || value.length === 0) {
      return field.required ? 'Add at least one gift' : null
    }
    const min = field.minLength ?? 2
    const max = field.maxLength ?? 120
    for (const row of value as GiftRow[]) {
      const item = (row?.item ?? '').trim()
      const recipient = (row?.recipient ?? '').trim()
      if (!item || !recipient) return 'Complete both columns for each gift'
      if (item.length < min || recipient.length < min) {
        return `Enter at least ${min} characters in each gift field`
      }
      if (item.length > max || recipient.length > max) {
        return `Keep each gift field to ${max} characters or fewer`
      }
    }
    return null
  }

  if (typeof value !== 'string') {
    if (field.required) return 'This field is required'
    return null
  }

  const trimmed = value.trim()
  if (!trimmed) {
    if (field.required) return 'This field is required'
    return null // optional empty — no min/max yet
  }

  if (field.id === 'address_zip') {
    if (!/^\d{5}$/.test(trimmed)) return 'Enter a valid 5-digit ZIP code'
    return null
  }

  if (field.id === 'address_city' || field.id === 'address_county') {
    if (!/^[A-Za-z][A-Za-z\s.'-]*$/.test(trimmed)) {
      return 'Use letters only (spaces and hyphens are fine)'
    }
  }

  if (field.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return 'Enter a valid email address'
  }

  if (field.type === 'phone') {
    const digits = trimmed.replace(/\D/g, '')
    if (digits.length < 10) return 'Enter a complete 10-digit phone number'
  }

  if (field.id === 'trust_distribution_age') {
    const n = Number(trimmed)
    if (!/^\d{1,3}$/.test(trimmed) || n < 18 || n > 40) {
      return 'Enter an age between 18 and 40'
    }
    return null
  }

  // Progressive: min first, then max
  if (field.minLength != null && trimmed.length < field.minLength) {
    return `Enter at least ${field.minLength} characters`
  }
  if (field.maxLength != null && trimmed.length > field.maxLength) {
    return `Use no more than ${field.maxLength} characters`
  }

  return null
}

/** True when the field has a quality error that should block Continue. */
export function sectionHasQualityErrors(
  section: Section,
  answers: Record<string, unknown>,
): boolean {
  return getVisibleFields(section, answers).some(
    (f) => fieldQualityError(f, answers[f.id]) != null,
  )
}

function formatIsoDate(value: string): string {
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return value
  return `${m[2]}/${m[3]}/${m[1]}`
}

/** Pretty-print E.164 phones for admin / review summaries. */
export function formatPhoneDisplay(value: string): string {
  const raw = value.trim()
  if (!raw) return '—'
  const national = formatPhoneNumber(raw)
  if (national) return national
  const intl = formatPhoneNumberIntl(raw)
  if (intl) return intl
  // Lightweight US fallback: +15125550147 → (512) 555-0147
  const digits = raw.replace(/\D/g, '')
  if (digits.length === 11 && digits.startsWith('1')) {
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
  }
  return raw
}

export function formatAnswerPreview(field: Field, value: unknown): string {
  if (value == null || value === '') return '—'
  if (field.type === 'yesno') return value === 'yes' ? 'Yes' : value === 'no' ? 'No' : '—'
  if (field.type === 'radio') {
    const opt = field.options?.find((o) => o.value === value)
    return opt?.label ?? String(value)
  }
  if (field.type === 'phone' && typeof value === 'string') {
    return formatPhoneDisplay(value)
  }
  if (field.type === 'date' && typeof value === 'string') {
    return formatIsoDate(value)
  }
  if (field.type === 'people' && Array.isArray(value)) {
    return (
      value
        .map((r: PersonRow) => {
          if (!r.name?.trim()) return ''
          if (!r.date_of_birth) return r.name
          return `${r.name} (DOB ${formatIsoDate(r.date_of_birth)})`
        })
        .filter(Boolean)
        .join('\n') || '—'
    )
  }
  if ((field.type === 'gifts' || field.type === 'charitable_gifts') && Array.isArray(value)) {
    return (
      value
        .map((r: GiftRow) =>
          r.item?.trim() || r.recipient?.trim() ? `${r.item || '—'} → ${r.recipient || '—'}` : '',
        )
        .filter(Boolean)
        .join('\n') || '—'
    )
  }
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value, null, 2)
    } catch {
      return String(value)
    }
  }
  return String(value)
}
