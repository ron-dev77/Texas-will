import { supabase } from '@/integrations/supabase/client'
import type { Json } from '@/integrations/supabase/types'
import {
  SECTIONS,
  type Field,
  type FieldType,
  type Section,
} from '@/lib/questionnaire'
import { BUNDLED_WILL_SKELETON } from '@/lib/admin-content'
import { needsDefaultWillSkeletonRefresh } from '@/lib/content-defaults/default-will-skeleton'
import { BUNDLED_SPOUSAL_TRUST_SKELETON } from '@/lib/content-defaults/default-spousal-trust-skeleton'
import {
  ANCILLARY_KINDS,
  DOCUMENT_KIND_LABEL,
  type AncillaryKind,
  type DocumentKind,
  isAncillaryKind,
} from '@/lib/document-kinds'
import { BUNDLED_ANCILLARY_SKELETONS, needsAncillaryTemplateRefresh } from '@/lib/ancillary-skeletons'

export type AncillarySkeletonsMap = Partial<Record<AncillaryKind, string>>

export type QuestionnaireFormRow = {
  id: string
  name: string
  slug: string
  description: string | null
  schema: Section[]
  skeleton_body: string | null
  trust_skeleton_body: string | null
  ancillary_skeletons: AncillarySkeletonsMap
  is_default: boolean
  is_active: boolean
  created_at: string
  updated_at: string
  created_by: string | null
}

export type QuestionnaireFormSummary = Omit<
  QuestionnaireFormRow,
  'schema' | 'skeleton_body' | 'trust_skeleton_body' | 'ancillary_skeletons'
>

/** Field ids the will/trust PDF builders currently read. */
export const WILL_ENGINE_FIELD_IDS = [
  'legal_full_name',
  'also_known_as',
  'date_of_birth',
  'phone',
  'address_street',
  'address_city',
  'address_county',
  'address_zip',
  'marital_status',
  'spouse_full_name',
  'marriage_date',
  'has_children',
  'children',
  'has_specific_gifts',
  'specific_gifts',
  'has_charitable_gifts',
  'charitable_gifts',
  'executor_name',
  'executor_relationship',
  'executor_email',
  'alt_executor_name',
  'alt_executor_relationship',
  'primary_guardian_name',
  'primary_guardian_relationship',
  'alternate_guardian_name',
  'guardian_notes',
  'residuary_plan',
  'residuary_custom',
  'has_prior_relationship_children',
  'prior_relationship_children_scope',
  'spousal_trust_trustee_mode',
  'spousal_trust_alternate_trustee_name',
  'spousal_trust_co_trustee_name',
  'spousal_trust_successor_trustee_name',
  'spousal_trust_remainder_children',
  'retirement_accounts_value',
  'beneficiary_forms_reviewed',
  'beneficiary_update_plan',
  'wants_snt',
  'snt_plan',
  'snt_beneficiary_name',
  'able_has_account',
  'able_account_name',
  'snt_trustee_name',
  'snt_successor_trustee_name',
  'snt_remainder',
  'snt_contingent_remainder',
  'snt_trustee_notes',
  'snt_has_existing',
  'snt_existing_name',
  'snt_existing_date',
  'disposition',
  'service_wishes',
  'trust_name',
  'trust_successor_trustee_name',
  'trust_successor_trustee_relationship',
  'trust_successor_trustee_address',
  'trust_alternate_successor_trustee_name',
  'trust_alternate_successor_trustee_address',
  'trust_assets',
  'trust_specific_gifts',
  'trust_residuary_plan',
  'trust_residuary_custom',
  'trust_distribution_age',
  'mpoa_agent_name',
  'mpoa_agent_phone',
  'mpoa_agent_address',
  'mpoa_limitations',
  'mpoa_alt_agent_name',
  'mpoa_alt_agent_phone',
  'mpoa_alt_agent_address',
  'mpoa_alt2_agent_name',
  'mpoa_alt2_agent_phone',
  'mpoa_alt2_agent_address',
  'mpoa_expires_on',
  'dpoa_agent_name',
  'dpoa_agent_address',
  'dpoa_agent_phone',
  'dpoa_grant_all',
  'dpoa_powers_list',
  'dpoa_compensation',
  'dpoa_gift_power',
  'dpoa_special_instructions',
  'dpoa_when_effective',
  'dpoa_alt_agent_name',
  'dpoa_alt_agent_address',
  'dpoa_alt_agent_phone',
  'dpoa_alt2_agent_name',
  'dpoa_alt2_agent_address',
  'dpoa_alt2_agent_phone',
  'directive_terminal',
  'directive_irreversible',
  'directive_additional',
  'directive_notes',
  'hipaa_rep1_name',
  'hipaa_rep1_address',
  'hipaa_rep1_phone',
  'hipaa_rep2_name',
  'hipaa_rep2_address',
  'hipaa_rep2_phone',
  'hipaa_rep3_name',
  'hipaa_rep3_address',
  'hipaa_rep3_phone',
  'hipaa_rep4_name',
  'hipaa_rep4_address',
  'hipaa_rep4_phone',
] as const

export const FIELD_TYPES: FieldType[] = [
  'shorttext',
  'longtext',
  'email',
  'phone',
  'date',
  'radio',
  'yesno',
  'people',
  'gifts',
  'charitable_gifts',
]

const FIELD_TYPE_SET = new Set<string>(FIELD_TYPES)

function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return base || 'form'
}

async function uniqueSlug(base: string, excludeId?: string): Promise<string> {
  let candidate = base
  let n = 2
  for (;;) {
    const { data } = await supabase
      .from('questionnaire_forms')
      .select('id')
      .eq('slug', candidate)
      .maybeSingle()
    if (!data || data.id === excludeId) return candidate
    candidate = `${base}-${n}`
    n += 1
  }
}

function asSections(schema: Json | Section[]): Section[] {
  if (!Array.isArray(schema)) return []
  return schema as Section[]
}

function asAncillarySkeletons(value: unknown): AncillarySkeletonsMap {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  const out: AncillarySkeletonsMap = {}
  for (const kind of ANCILLARY_KINDS) {
    const body = (value as Record<string, unknown>)[kind]
    if (typeof body === 'string' && body.trim()) out[kind] = body
  }
  return out
}

function mapFormRow(row: {
  id: string
  name: string
  slug: string
  description: string | null
  schema: Json
  skeleton_body?: string | null
  trust_skeleton_body?: string | null
  ancillary_skeletons?: Json | AncillarySkeletonsMap | null
  is_default: boolean
  is_active: boolean
  created_at: string
  updated_at: string
  created_by: string | null
}): QuestionnaireFormRow {
  return {
    ...row,
    schema: asSections(row.schema),
    skeleton_body: row.skeleton_body ?? null,
    trust_skeleton_body: row.trust_skeleton_body ?? null,
    ancillary_skeletons: asAncillarySkeletons(row.ancillary_skeletons),
  }
}

const FORM_SELECT =
  'id, name, slug, description, schema, skeleton_body, trust_skeleton_body, ancillary_skeletons, is_default, is_active, created_at, updated_at, created_by'

const AUTO_INSERT_SECTION_IDS = new Set([
  'medical_poa',
  'durable_poa',
  'directive',
  'hipaa',
  'beneficiary_designation',
  'spousal_trust',
  'special_needs',
])

const INSERT_AFTER_RESIDUARY_SECTION_IDS = [
  'spousal_trust',
  'beneficiary_designation',
  'special_needs',
] as const

/** Insert any missing bundled sections (e.g. ancillaries, beneficiary designation, SNT) before review. */
export function mergeMissingBundledSections(schema: Section[]): Section[] {
  const ids = new Set(schema.map((s) => s.id))
  const missing = SECTIONS.filter((s) => AUTO_INSERT_SECTION_IDS.has(s.id) && !ids.has(s.id))
  if (missing.length === 0) return schema
  let next = [...schema]
  const afterResiduary = missing
    .filter((s) => INSERT_AFTER_RESIDUARY_SECTION_IDS.includes(s.id as (typeof INSERT_AFTER_RESIDUARY_SECTION_IDS)[number]))
    .sort(
      (a, b) =>
        INSERT_AFTER_RESIDUARY_SECTION_IDS.indexOf(a.id as (typeof INSERT_AFTER_RESIDUARY_SECTION_IDS)[number]) -
        INSERT_AFTER_RESIDUARY_SECTION_IDS.indexOf(b.id as (typeof INSERT_AFTER_RESIDUARY_SECTION_IDS)[number]),
    )
  const otherMissing = missing.filter(
    (s) => !INSERT_AFTER_RESIDUARY_SECTION_IDS.includes(s.id as (typeof INSERT_AFTER_RESIDUARY_SECTION_IDS)[number]),
  )
  for (const section of afterResiduary) {
    const residuaryIdx = next.findIndex((s) => s.id === 'residuary')
    if (residuaryIdx >= 0) {
      next = [...next.slice(0, residuaryIdx + 1), section, ...next.slice(residuaryIdx + 1)]
      continue
    }
    const reviewIdx = next.findIndex((s) => s.id === 'review' || s.isReview)
    if (reviewIdx < 0) next = [...next, section]
    else next = [...next.slice(0, reviewIdx), section, ...next.slice(reviewIdx)]
  }
  for (const section of otherMissing) {
    const reviewIdx = next.findIndex((s) => s.id === 'review' || s.isReview)
    if (reviewIdx < 0) next = [...next, section]
    else next = [...next.slice(0, reviewIdx), section, ...next.slice(reviewIdx)]
  }
  return next
}

/** Add new bundled questions onto existing sections (does not overwrite edited copy). */
export function mergeMissingBundledFields(schema: Section[]): Section[] {
  const bundledById = new Map(SECTIONS.map((s) => [s.id, s]))
  let changed = false
  const next = schema.map((section) => {
    const bundled = bundledById.get(section.id)
    if (!bundled) return section
    const have = new Set(section.fields.map((f) => f.id))
    const missing = bundled.fields.filter((f) => !have.has(f.id))
    if (missing.length === 0) return section
    changed = true
    return { ...section, fields: [...section.fields, ...missing] }
  })
  return changed ? next : schema
}

/** Sections whose default questions must stay in lockstep with the bundled form. */
const BUNDLED_QUESTION_SYNC_IDS = new Set([
  'medical_poa',
  'hipaa',
  'durable_poa',
  'directive',
  'beneficiary_designation',
  'spousal_trust',
  'special_needs',
])

function bundledSectionFingerprint(section: Section): string {
  return JSON.stringify({
    title: section.title,
    intro: section.intro,
    fields: section.fields.map((f) => ({
      id: f.id,
      label: f.label,
      type: f.type,
      required: Boolean(f.required),
      helper: f.helper ?? '',
      placeholder: f.placeholder ?? '',
    })),
  })
}

/** Replace bundled sections on the default form when those questions change. */
export function syncBundledDefaultQuestions(schema: Section[]): Section[] {
  const bundledById = new Map(SECTIONS.map((s) => [s.id, s]))
  let changed = false
  const next = schema.map((section) => {
    if (!BUNDLED_QUESTION_SYNC_IDS.has(section.id)) return section
    const bundled = bundledById.get(section.id)
    if (!bundled) return section
    if (bundledSectionFingerprint(section) === bundledSectionFingerprint(bundled)) {
      return section
    }
    changed = true
    return { ...bundled, fields: [...bundled.fields] }
  })
  return changed ? next : schema
}

export function defaultAncillarySkeletonsMap(): Record<AncillaryKind, string> {
  return { ...BUNDLED_ANCILLARY_SKELETONS }
}

export function formSkeletonBodyForKind(
  form: Pick<QuestionnaireFormRow, 'skeleton_body' | 'trust_skeleton_body' | 'ancillary_skeletons'>,
  kind: DocumentKind,
): string | null {
  if (kind === 'will') return form.skeleton_body?.trim() ? form.skeleton_body : null
  if (kind === 'rlt') return form.trust_skeleton_body?.trim() ? form.trust_skeleton_body : null
  if (kind === 'spousal_trust') return BUNDLED_SPOUSAL_TRUST_SKELETON
  if (!isAncillaryKind(kind)) return null
  const body = form.ancillary_skeletons?.[kind]
  return body?.trim() ? body : null
}

export function ensureSchemaIds(sections: Section[]): Section[] {
  return sections.map((s) => ({
    ...s,
    id: typeof s.id === 'string' && s.id.trim() ? s.id.trim() : crypto.randomUUID(),
    fields: (s.fields ?? []).map((f) => ({
      ...f,
      id: typeof f.id === 'string' && f.id.trim() ? f.id.trim() : crypto.randomUUID(),
    })),
  }))
}

export function validateQuestionnaireSchema(schema: unknown): {
  ok: true
  sections: Section[]
} | { ok: false; error: string } {
  if (!Array.isArray(schema) || schema.length < 1) {
    return { ok: false, error: 'Form must have at least one section.' }
  }

  const normalized = ensureSchemaIds(schema as Section[])
  const sectionIds = new Set<string>()
  const fieldIds = new Set<string>()

  for (let si = 0; si < normalized.length; si++) {
    const section = normalized[si]
    if (!section || typeof section !== 'object') {
      return { ok: false, error: `Section ${si + 1} is invalid.` }
    }
    const sid = section.id
    if (sectionIds.has(sid)) return { ok: false, error: `Duplicate section id: ${sid}` }
    sectionIds.add(sid)
    if (typeof section.title !== 'string' || !section.title.trim()) {
      return { ok: false, error: `Section ${si + 1} needs a title.` }
    }
    if (!Array.isArray(section.fields)) {
      return { ok: false, error: `Section "${section.title}" needs a fields array.` }
    }
    for (let fi = 0; fi < section.fields.length; fi++) {
      const field = section.fields[fi]
      const fid = field.id
      if (fieldIds.has(fid)) return { ok: false, error: `Duplicate field id: ${fid}` }
      fieldIds.add(fid)
      if (typeof field.label !== 'string' || !field.label.trim()) {
        return { ok: false, error: `A question in "${section.title}" needs a label.` }
      }
      if (!field.type || !FIELD_TYPE_SET.has(field.type)) {
        return { ok: false, error: `Question "${field.label}" has an unknown type.` }
      }
      if (field.type === 'radio') {
        if (!Array.isArray(field.options) || field.options.length < 1) {
          return { ok: false, error: `Radio question "${field.label}" needs at least one option.` }
        }
      }
    }
  }

  return { ok: true, sections: normalized }
}

export function missingWillEngineKeys(sections: readonly Section[]): string[] {
  const present = new Set(sections.flatMap((s) => s.fields.map((f) => f.id)))
  return WILL_ENGINE_FIELD_IDS.filter((id) => !present.has(id))
}

/** Ensure the bundled default form exists (active). Safe to call repeatedly. */
export async function ensureDefaultForm(): Promise<QuestionnaireFormRow> {
  const { data: existing, error: existingError } = await supabase
    .from('questionnaire_forms')
    .select(
      FORM_SELECT,
    )
    .eq('is_default', true)
    .maybeSingle()
  if (existingError) throw new Error(existingError.message)
  if (existing) {
    const mapped = mapFormRow(existing)
    const patch: {
      skeleton_body?: string
      trust_skeleton_body?: string
      schema?: Json
      ancillary_skeletons?: Json
    } = {}
    // Upgrade old / outdated default will skeletons (bracket text, stacked witnesses).
    if (needsDefaultWillSkeletonRefresh(mapped.skeleton_body)) {
      patch.skeleton_body = BUNDLED_WILL_SKELETON
    }
    // Refresh outdated default living trust (notary align / duplicate title heading).
    if (needsTrustSkeletonRefresh(mapped.trust_skeleton_body)) {
      patch.trust_skeleton_body = BUNDLED_TRUST_SKELETON
    }
    const mergedSchema = syncBundledDefaultQuestions(
      mergeMissingBundledFields(mergeMissingBundledSections(mapped.schema)),
    )
    const schemaChanged = JSON.stringify(mergedSchema) !== JSON.stringify(mapped.schema)
    if (schemaChanged) {
      patch.schema = mergedSchema as unknown as Json
    }
    const anc = mapped.ancillary_skeletons
    const bundledAnc = defaultAncillarySkeletonsMap()
    const staleAnc = ANCILLARY_KINDS.filter((k) => {
      const body = anc[k]?.trim() ?? ''
      if (needsAncillaryTemplateRefresh(body)) return true
      return false
    })
    if (staleAnc.length > 0) {
      const next = { ...anc }
      for (const k of staleAnc) next[k] = bundledAnc[k]
      patch.ancillary_skeletons = next as unknown as Json
    }
    if (Object.keys(patch).length > 0) {
      const { data: upgraded, error: upErr } = await supabase
        .from('questionnaire_forms')
        .update(patch)
        .eq('id', existing.id)
        .select(FORM_SELECT)
        .single()
      if (upErr) throw new Error(upErr.message)
      return mapFormRow(upgraded)
    }
    return mapped
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { count } = await supabase
    .from('questionnaire_forms')
    .select('id', { count: 'exact', head: true })

  const { data, error } = await supabase
    .from('questionnaire_forms')
    .insert({
      name: 'Texas Will Default',
      slug: 'texas-will-default',
      description: 'Built-in Texas will questionnaire (bundled schema).',
      schema: SECTIONS as unknown as Json,
      skeleton_body: BUNDLED_WILL_SKELETON,
      ancillary_skeletons: defaultAncillarySkeletonsMap() as unknown as Json,
      is_default: true,
      is_active: (count ?? 0) === 0,
      created_by: user?.id ?? null,
    })
    .select(
      FORM_SELECT,
    )
    .single()
  if (error) throw new Error(error.message)

  // If another active form already exists, leave it; otherwise activate default.
  if (!data.is_active) {
    const { data: active } = await supabase
      .from('questionnaire_forms')
      .select('id')
      .eq('is_active', true)
      .maybeSingle()
    if (!active) {
      await supabase.from('questionnaire_forms').update({ is_active: true }).eq('id', data.id)
      return { ...mapFormRow(data), is_active: true }
    }
  }

  return mapFormRow(data)
}

export async function listForms(): Promise<QuestionnaireFormSummary[]> {
  await ensureDefaultForm()
  const { data, error } = await supabase
    .from('questionnaire_forms')
    .select('id, name, slug, description, is_default, is_active, created_at, updated_at, created_by')
    .order('is_default', { ascending: false })
    .order('updated_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as QuestionnaireFormSummary[]
}

export type FormTemplateRow = QuestionnaireFormSummary & {
  templateStatus: ReturnType<typeof formSkeletonsReadySync>
  kindStatus: Record<DocumentKind, 'ready' | 'missing'>
}

/** List questionnaires with per-document template readiness for the hub UI. */
export async function listFormsWithTemplateStatus(): Promise<FormTemplateRow[]> {
  await ensureDefaultForm()
  const { data, error } = await supabase
    .from('questionnaire_forms')
    .select(
      'id, name, slug, description, is_default, is_active, created_at, updated_at, created_by, skeleton_body, trust_skeleton_body, ancillary_skeletons',
    )
    .order('is_default', { ascending: false })
    .order('updated_at', { ascending: false })
  if (error) throw new Error(error.message)

  return (data ?? []).map((row) => {
    const mapped = mapFormRow(row as Parameters<typeof mapFormRow>[0])
    const templateStatus = formSkeletonsReadySync(mapped)
    const minLen = 40
    const anc = mapped.ancillary_skeletons ?? {}
    const kindStatus = {
      will:
        mapped.skeleton_body?.trim() && mapped.skeleton_body.trim().length >= minLen
          ? ('ready' as const)
          : ('missing' as const),
      rlt:
        mapped.trust_skeleton_body?.trim() && mapped.trust_skeleton_body.trim().length >= minLen
          ? ('ready' as const)
          : ('missing' as const),
      mpoa: anc.mpoa?.trim() && anc.mpoa.trim().length >= minLen ? ('ready' as const) : ('missing' as const),
      dpoa: anc.dpoa?.trim() && anc.dpoa.trim().length >= minLen ? ('ready' as const) : ('missing' as const),
      directive:
        anc.directive?.trim() && anc.directive.trim().length >= minLen
          ? ('ready' as const)
          : ('missing' as const),
      hipaa:
        anc.hipaa?.trim() && anc.hipaa.trim().length >= minLen ? ('ready' as const) : ('missing' as const),
      spousal_trust: 'ready' as const,
    } satisfies Record<DocumentKind, 'ready' | 'missing'>
    return {
      id: mapped.id,
      name: mapped.name,
      slug: mapped.slug,
      description: mapped.description,
      is_default: mapped.is_default,
      is_active: mapped.is_active,
      created_at: mapped.created_at,
      updated_at: mapped.updated_at,
      created_by: mapped.created_by,
      templateStatus,
      kindStatus,
    }
  })
}

export async function getForm(id: string): Promise<QuestionnaireFormRow> {
  const { data, error } = await supabase
    .from('questionnaire_forms')
    .select(
      FORM_SELECT,
    )
    .eq('id', id)
    .single()
  if (error) throw new Error(error.message)
  return mapFormRow(data)
}

export async function createForm(params: {
  name: string
  description?: string
  fromDefault?: boolean
}): Promise<QuestionnaireFormRow> {
  await ensureDefaultForm()
  const name = params.name.trim()
  if (!name) throw new Error('Form name is required.')
  const slug = await uniqueSlug(slugify(name))
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let schema: Section[]
  if (params.fromDefault !== false) {
    schema = SECTIONS.map((s) => ({
      ...s,
      fields: s.fields.map((f) => ({ ...f })),
    }))
  } else {
    schema = [
      {
        id: crypto.randomUUID(),
        title: 'New section',
        intro: '',
        fields: [
          {
            id: crypto.randomUUID(),
            label: 'New question',
            type: 'shorttext',
            placeholder: '',
          },
        ],
      },
    ]
  }

  const { data, error } = await supabase
    .from('questionnaire_forms')
    .insert({
      name,
      slug,
      description: params.description?.trim() || null,
      schema: schema as unknown as Json,
      skeleton_body:
        params.fromDefault !== false ? BUNDLED_WILL_SKELETON : BUNDLED_WILL_SKELETON,
      trust_skeleton_body: BUNDLED_TRUST_SKELETON,
      ancillary_skeletons: defaultAncillarySkeletonsMap() as unknown as Json,
      is_default: false,
      is_active: false,
      created_by: user?.id ?? null,
    })
    .select(
      FORM_SELECT,
    )
    .single()
  if (error) throw new Error(error.message)
  return mapFormRow(data)
}

export async function duplicateForm(id: string): Promise<QuestionnaireFormRow> {
  const source = await getForm(id)
  const name = `${source.name} (copy)`
  const slug = await uniqueSlug(slugify(name))
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .from('questionnaire_forms')
    .insert({
      name,
      slug,
      description: source.description,
      schema: source.schema as unknown as Json,
      skeleton_body: source.skeleton_body || BUNDLED_WILL_SKELETON,
      trust_skeleton_body: source.trust_skeleton_body || BUNDLED_TRUST_SKELETON,
      ancillary_skeletons: {
        ...defaultAncillarySkeletonsMap(),
        ...source.ancillary_skeletons,
      } as unknown as Json,
      is_default: false,
      is_active: false,
      created_by: user?.id ?? null,
    })
    .select(
      FORM_SELECT,
    )
    .single()
  if (error) throw new Error(error.message)
  return mapFormRow(data)
}

async function nextQuestionnaireVersionNo(): Promise<number> {
  const { data } = await supabase
    .from('content_questionnaire_versions')
    .select('version_no')
    .order('version_no', { ascending: false })
    .limit(1)
    .maybeSingle()
  return (data?.version_no ?? 0) + 1
}

async function snapshotFormVersion(params: {
  formId: string
  schema: Section[]
  note?: string
  makeActive: boolean
}) {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const version_no = await nextQuestionnaireVersionNo()
  if (params.makeActive) {
    await supabase
      .from('content_questionnaire_versions')
      .update({ is_active: false })
      .eq('is_active', true)
  }
  const { error } = await supabase.from('content_questionnaire_versions').insert({
    version_no,
    schema: params.schema as unknown as Json,
    note: params.note?.trim() || null,
    created_by: user?.id ?? null,
    is_active: params.makeActive,
    form_id: params.formId,
  })
  if (error) throw new Error(error.message)
  return version_no
}

export async function updateForm(params: {
  id: string
  name?: string
  description?: string | null
  schema: Section[]
  note?: string
}): Promise<{ form: QuestionnaireFormRow; version_no: number }> {
  const validated = validateQuestionnaireSchema(params.schema)
  if (!validated.ok) throw new Error(validated.error)

  const existing = await getForm(params.id)
  if (existing.is_default) {
    throw new Error(
      'The default questionnaire form is locked. Duplicate it to customize, or fix layouts on the order.',
    )
  }
  const name = (params.name ?? existing.name).trim()
  if (!name) throw new Error('Form name is required.')

  let slug = existing.slug
  if (name !== existing.name) {
    slug = await uniqueSlug(slugify(name), existing.id)
  }

  const { data, error } = await supabase
    .from('questionnaire_forms')
    .update({
      name,
      slug,
      description:
        params.description === undefined
          ? existing.description
          : params.description?.trim() || null,
      schema: validated.sections as unknown as Json,
      updated_at: new Date().toISOString(),
    })
    .eq('id', params.id)
    .select(
      FORM_SELECT,
    )
    .single()
  if (error) throw new Error(error.message)

  const version_no = await snapshotFormVersion({
    formId: params.id,
    schema: validated.sections,
    note: params.note,
    makeActive: data.is_active,
  })

  return { form: mapFormRow(data), version_no }
}

export async function formSkeletonsReady(
  form: Pick<
    QuestionnaireFormRow,
    'skeleton_body' | 'trust_skeleton_body' | 'ancillary_skeletons'
  >,
): Promise<{ ok: boolean; missing: string[] }> {
  return formSkeletonsReadySync(form)
}

export function formSkeletonsReadySync(
  form: Pick<
    QuestionnaireFormRow,
    'skeleton_body' | 'trust_skeleton_body' | 'ancillary_skeletons'
  >,
): { ok: boolean; missing: string[] } {
  const missing: string[] = []
  const minLen = 40
  if (!form.skeleton_body?.trim() || form.skeleton_body.trim().length < minLen) {
    missing.push('Will')
  }
  if (!form.trust_skeleton_body?.trim() || form.trust_skeleton_body.trim().length < minLen) {
    missing.push('Trust')
  }
  const anc = form.ancillary_skeletons ?? {}
  for (const k of ANCILLARY_KINDS) {
    const body = anc[k]?.trim() ?? ''
    if (body.length < minLen) missing.push(DOCUMENT_KIND_LABEL[k])
  }
  return { ok: missing.length === 0, missing }
}

export async function activateForm(id: string): Promise<void> {
  const form = await getForm(id)
  const ready = formSkeletonsReadySync(form)
  if (!ready.ok) {
    throw new Error(
      `Link document templates before activating. Missing: ${ready.missing.join(', ')}. Open Document templates for this form.`,
    )
  }
  await supabase.from('questionnaire_forms').update({ is_active: false }).eq('is_active', true)
  const { error } = await supabase
    .from('questionnaire_forms')
    .update({ is_active: true, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw new Error(error.message)

  await snapshotFormVersion({
    formId: id,
    schema: form.schema,
    note: `Activated form: ${form.name}`,
    makeActive: true,
  })
}

export async function deleteForm(id: string): Promise<void> {
  const form = await getForm(id)
  if (form.is_default) throw new Error('The default form cannot be deleted.')
  if (form.is_active) throw new Error('Deactivate this form (activate another) before deleting.')
  const { error } = await supabase.from('questionnaire_forms').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export async function resetDefaultForm(): Promise<QuestionnaireFormRow> {
  throw new Error(
    'The default questionnaire form is locked and cannot be reset from admin. Duplicate it to customize.',
  )
}

/** Save will, trust, or ancillary skeleton onto a specific questionnaire form. */
export async function saveFormSkeleton(params: {
  formId: string
  body: string
  kind?: DocumentKind
  note?: string
}): Promise<QuestionnaireFormRow> {
  if (params.body.trim().length < 40) {
    throw new Error('Skeleton body is too short.')
  }
  const kind = params.kind ?? 'will'

  const existingForm = await getForm(params.formId)
  if (existingForm.is_default) {
    throw new Error(
      'Default form skeletons are locked. Duplicate the form to customize templates, or edit layout on an order.',
    )
  }

  let patch: {
    updated_at: string
    skeleton_body?: string
    trust_skeleton_body?: string
    ancillary_skeletons?: Json
  } = {
    updated_at: new Date().toISOString(),
  }
  if (kind === 'will') {
    patch.skeleton_body = params.body
  } else if (kind === 'rlt') {
    patch.trust_skeleton_body = params.body
  } else {
    const map = existingForm.ancillary_skeletons
    patch.ancillary_skeletons = {
      ...defaultAncillarySkeletonsMap(),
      ...map,
      [kind]: params.body,
    } as unknown as Json
  }

  const { data, error } = await supabase
    .from('questionnaire_forms')
    .update(patch)
    .eq('id', params.formId)
    .select(FORM_SELECT)
    .single()
  if (error) throw new Error(error.message)

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    const { data: last } = await supabase
      .from('content_skeleton_versions')
      .select('version_no')
      .order('version_no', { ascending: false })
      .limit(1)
      .maybeSingle()
    const skelNo = (last?.version_no ?? 0) + 1
    if (kind === 'will') {
      await supabase.from('content_skeleton_versions').update({ is_active: false }).eq('is_active', true)
      await supabase.from('content_skeleton_versions').insert({
        version_no: skelNo,
        body: params.body,
        note: params.note?.trim() || `Form ${kind} skeleton: ${data.name}`,
        created_by: user?.id ?? null,
        is_active: true,
      })
    }
  } catch (e) {
    console.error('Skeleton version snapshot failed', e)
  }

  return mapFormRow(data)
}

/** Bump when bundled trust copy changes so default forms auto-refresh. */
export const TRUST_TEMPLATE = 'trust-v2'

export const BUNDLED_TRUST_SKELETON = `<!-- texas-will-skeleton-v2 -->
${JSON.stringify(
  {
    version: 2,
    template: TRUST_TEMPLATE,
    title: 'REVOCABLE LIVING TRUST',
    pageSize: 'A4',
    blocks: [
      {
        id: 't-intro',
        kind: 'paragraph',
        heading: '',
        body:
          'This Revocable Living Trust Agreement is made under the laws of the **State of Texas**, including the **Texas Trust Code** (Chapter 111 et seq. of the Texas Property Code). It creates a revocable living trust so that property transferred to the trust may be managed during the Grantor\'s lifetime and distributed after death according to the terms below.',
        label: '',
        leftLabel: '',
        rightLabel: '',
        align: 'left',
        blankLinesAfter: 1,
        pageBreakBefore: false,
      },
      {
        id: 't-art1-h',
        kind: 'heading',
        heading: 'ARTICLE I. DECLARATION OF TRUST',
        body: '',
        label: '',
        leftLabel: '',
        rightLabel: '',
        align: 'left',
        blankLinesAfter: 1,
        pageBreakBefore: false,
      },
      {
        id: 't-art1',
        kind: 'paragraph',
        heading: '',
        body:
          '**Establishment.** I, **{{legal_full_name}}**, a resident of **{{address_county}} County, Texas**, residing at **{{address_street}}, {{address_city}}, Texas {{address_zip}}** (the "Grantor"), hereby establish this Revocable Living Trust (the "Trust"). The Trust shall be known as **{{trust_name}}**.\n\n**Governing Law.** This Trust is created under and shall be governed by the laws of the **State of Texas**, except as otherwise expressly stated herein.\n\n**Transfer of Property.** The Grantor transfers to the Trust the property described in **Schedule A**, attached hereto and incorporated by reference. Additional property may be added to the Trust at any time by the Grantor or by any other person, subject to the Trustee\'s acceptance.',
        label: '',
        leftLabel: '',
        rightLabel: '',
        align: 'left',
        blankLinesAfter: 1,
        pageBreakBefore: false,
      },
      {
        id: 't-art2-h',
        kind: 'heading',
        heading: 'ARTICLE II. TRUSTEE',
        body: '',
        label: '',
        leftLabel: '',
        rightLabel: '',
        align: 'left',
        blankLinesAfter: 1,
        pageBreakBefore: false,
      },
      {
        id: 't-art2',
        kind: 'paragraph',
        heading: '',
        body:
          '**Initial Trustee.** The Grantor, **{{legal_full_name}}**, shall serve as the initial Trustee.\n\n**Successor Trustee.** Upon the Grantor\'s death, resignation, or incapacity, **{{trust_successor_trustee_name}}** ({{trust_successor_trustee_relationship}}), of **{{trust_successor_trustee_address}}**, shall serve as Successor Trustee.\n\n**Alternate Successor Trustee.** If the Successor Trustee is unable or unwilling to serve, or ceases to serve, **{{trust_alternate_successor_trustee_name}}**, of **{{trust_alternate_successor_trustee_address}}**, shall serve as Alternate Successor Trustee. If no alternate is named or able to serve, a successor may be appointed as provided by Texas law and the terms of this Trust.\n\n**Trustee Compensation.** Any Trustee (other than the Grantor while serving) shall be entitled to reasonable compensation for services rendered.\n\n**No Bond.** No Trustee shall be required to post bond or other security.',
        label: '',
        leftLabel: '',
        rightLabel: '',
        align: 'left',
        blankLinesAfter: 1,
        pageBreakBefore: false,
      },
      {
        id: 't-art3-h',
        kind: 'heading',
        heading: 'ARTICLE III. REVOCATION AND AMENDMENT',
        body: '',
        label: '',
        leftLabel: '',
        rightLabel: '',
        align: 'left',
        blankLinesAfter: 1,
        pageBreakBefore: false,
      },
      {
        id: 't-art3',
        kind: 'paragraph',
        heading: '',
        body:
          '**Power to Revoke or Amend.** During the Grantor\'s lifetime and while the Grantor is competent, the Grantor may revoke or amend this Trust, in whole or in part, at any time, by a written instrument signed by the Grantor and delivered to the Trustee.\n\n**Irrevocability on Death or Incapacity.** This Trust shall become irrevocable upon the Grantor\'s death or upon a determination of the Grantor\'s incapacity as provided below.\n\n**Determination of Incapacity.** The Grantor shall be deemed incapacitated upon the written certification of two licensed physicians who have personally examined the Grantor and determined that the Grantor is unable to manage the Grantor\'s financial affairs.',
        label: '',
        leftLabel: '',
        rightLabel: '',
        align: 'left',
        blankLinesAfter: 1,
        pageBreakBefore: false,
      },
      {
        id: 't-art4-h',
        kind: 'heading',
        heading: "ARTICLE IV. DISTRIBUTIONS DURING GRANTOR'S LIFETIME",
        body: '',
        label: '',
        leftLabel: '',
        rightLabel: '',
        align: 'left',
        blankLinesAfter: 1,
        pageBreakBefore: false,
      },
      {
        id: 't-art4',
        kind: 'paragraph',
        heading: '',
        body:
          '**Income and Principal.** During the Grantor\'s lifetime, the Trustee shall distribute to or for the benefit of the Grantor such amounts of net income and principal as the Grantor may from time to time request, or as the Trustee determines are advisable for the Grantor\'s health, education, maintenance, and support.\n\n**Distributions During Incapacity.** If the Grantor becomes incapacitated, the Trustee shall use trust income and principal for the Grantor\'s health, education, maintenance, support, and comfort, and may also make distributions for the benefit of persons the Grantor was legally obligated to support.',
        label: '',
        leftLabel: '',
        rightLabel: '',
        align: 'left',
        blankLinesAfter: 1,
        pageBreakBefore: false,
      },
      {
        id: 't-art5-h',
        kind: 'heading',
        heading: "ARTICLE V. DISTRIBUTIONS UPON GRANTOR'S DEATH",
        body: '',
        label: '',
        leftLabel: '',
        rightLabel: '',
        align: 'left',
        blankLinesAfter: 1,
        pageBreakBefore: false,
      },
      {
        id: 't-art5',
        kind: 'paragraph',
        heading: '',
        body:
          '**Payment of Expenses.** Upon the Grantor\'s death, the Trustee shall pay from the Trust the Grantor\'s legally enforceable debts, funeral and burial expenses, and expenses of last illness and estate administration, to the extent not otherwise provided for.\n\n**Specific Distributions.** The Trustee shall make the following specific distributions (if any): **{{trust_specific_gifts}}**\n\n**Residuary Distribution.** The remaining trust estate shall be distributed according to the Grantor\'s residuary plan: **{{trust_residuary_plan}}**. Additional instructions (if any): **{{trust_residuary_custom}}**\n\n**Distributions to Minors or Incapacitated Beneficiaries.** If any beneficiary entitled to a distribution is a minor or is incapacitated, the Trustee may hold that share in a separate trust for the beneficiary\'s benefit, and distribute income and principal for the beneficiary\'s health, education, maintenance, and support until the beneficiary reaches the age of **{{trust_distribution_age}}** or regains capacity, at which time the remaining trust property shall be distributed outright to the beneficiary.',
        label: '',
        leftLabel: '',
        rightLabel: '',
        align: 'left',
        blankLinesAfter: 1,
        pageBreakBefore: false,
      },
      {
        id: 't-art6-h',
        kind: 'heading',
        heading: 'ARTICLE VI. TRUSTEE POWERS',
        body: '',
        label: '',
        leftLabel: '',
        rightLabel: '',
        align: 'left',
        blankLinesAfter: 1,
        pageBreakBefore: false,
      },
      {
        id: 't-art6',
        kind: 'paragraph',
        heading: '',
        body:
          '**General Powers.** The Trustee shall have all powers granted to trustees under the Texas Trust Code, including, without limitation, the powers to: (a) retain, invest, and reinvest trust property; (b) sell, exchange, lease, mortgage, or otherwise dispose of trust property; (c) borrow money and pledge trust property as security; (d) employ attorneys, accountants, investment advisors, and other professionals; (e) settle or compromise claims; (f) distribute property in kind or in cash; and (g) do all other acts necessary or advisable for proper administration of the Trust.\n\n**Standard of Care.** The Trustee shall administer the Trust as a prudent person would, considering the purposes, terms, distribution requirements, and other circumstances of the Trust.',
        label: '',
        leftLabel: '',
        rightLabel: '',
        align: 'left',
        blankLinesAfter: 1,
        pageBreakBefore: false,
      },
      {
        id: 't-art7-h',
        kind: 'heading',
        heading: 'ARTICLE VII. SPENDTHRIFT AND MISCELLANEOUS',
        body: '',
        label: '',
        leftLabel: '',
        rightLabel: '',
        align: 'left',
        blankLinesAfter: 1,
        pageBreakBefore: false,
      },
      {
        id: 't-art7',
        kind: 'paragraph',
        heading: '',
        body:
          '**Spendthrift Trust.** No beneficiary shall have the power to anticipate, assign, transfer, or otherwise dispose of any interest in the Trust before actual receipt, and no interest of any beneficiary shall be subject to the claims of that beneficiary\'s creditors.\n\n**Perpetuities Savings.** Notwithstanding any other provision, any trust created hereunder shall terminate no later than the latest date permitted under the Texas Trust Code.\n\n**Severability.** If any provision of this Trust is held invalid, the remaining provisions shall continue in full force and effect.',
        label: '',
        leftLabel: '',
        rightLabel: '',
        align: 'left',
        blankLinesAfter: 1,
        pageBreakBefore: false,
      },
      {
        id: 't-sched-h',
        kind: 'heading',
        heading: 'SCHEDULE A. INITIAL TRUST PROPERTY',
        body: '',
        label: '',
        leftLabel: '',
        rightLabel: '',
        align: 'left',
        blankLinesAfter: 1,
        pageBreakBefore: false,
      },
      {
        id: 't-sched',
        kind: 'paragraph',
        heading: '',
        body:
          'The Grantor initially transfers to the Trust the following property (and any additional property later accepted by the Trustee):\n\n**{{trust_assets}}**',
        label: '',
        leftLabel: '',
        rightLabel: '',
        align: 'left',
        blankLinesAfter: 2,
        pageBreakBefore: false,
      },
      {
        id: 't-sig-h',
        kind: 'heading',
        heading: 'SIGNATURE OF GRANTOR',
        body: '',
        label: '',
        leftLabel: '',
        rightLabel: '',
        align: 'center',
        blankLinesAfter: 1,
        pageBreakBefore: true,
      },
      {
        id: 't-sig-p',
        kind: 'paragraph',
        heading: '',
        body:
          'I, **{{legal_full_name}}**, the Grantor, sign my name to this Revocable Living Trust on this ______ day of __________________, 20_____, and declare that I execute it as my free and voluntary act for the purposes stated herein.',
        label: '',
        leftLabel: '',
        rightLabel: '',
        align: 'left',
        blankLinesAfter: 1,
        pageBreakBefore: false,
      },
      {
        id: 't-sig',
        kind: 'signature',
        heading: '',
        body: '',
        label: 'Signature of Grantor',
        leftLabel: '',
        rightLabel: '',
        align: 'center',
        blankLinesAfter: 1,
        pageBreakBefore: false,
      },
      {
        id: 't-notary-h',
        kind: 'heading',
        heading: 'NOTARY ACKNOWLEDGMENT',
        body: '',
        label: '',
        leftLabel: '',
        rightLabel: '',
        align: 'center',
        blankLinesAfter: 1,
        pageBreakBefore: false,
      },
      {
        id: 't-notary-p',
        kind: 'paragraph',
        heading: '',
        body:
          '**STATE OF TEXAS**\n**COUNTY OF** ____________________________\n\nThis instrument was acknowledged before me on this ______ day of __________________, 20_____, by **{{legal_full_name}}**, the Grantor.',
        label: '',
        leftLabel: '',
        rightLabel: '',
        align: 'left',
        blankLinesAfter: 1,
        pageBreakBefore: false,
      },
      {
        id: 't-notary',
        kind: 'signature',
        heading: '',
        body: '',
        label: 'Notary Public, State of Texas',
        leftLabel: '',
        rightLabel: '',
        align: 'right',
        blankLinesAfter: 0,
        pageBreakBefore: false,
      },
    ],
  },
  null,
  2,
)}
`

/** True when trust skeleton needs bundled refresh (thin intro / missing trust-v2). */
export function needsTrustSkeletonRefresh(body: string | null | undefined): boolean {
  const t = (body ?? '').trim()
  if (!t) return true
  if (!new RegExp(`"template"\\s*:\\s*"${TRUST_TEMPLATE}"`).test(t)) return true
  if (!t.includes('Notary Public, State of Texas')) return true
  if (/"label":\s*"Notary Public, State of Texas"[\s\S]{0,120}"align":\s*"left"/.test(t)) return true
  if (/"kind":\s*"heading"[\s\S]{0,80}"heading":\s*"REVOCABLE LIVING TRUST"/.test(t)) return true
  return false
}

export function bundledSkeletonForKind(kind: DocumentKind): string {
  if (kind === 'rlt') return BUNDLED_TRUST_SKELETON
  if (isAncillaryKind(kind)) return BUNDLED_ANCILLARY_SKELETONS[kind]
  return BUNDLED_WILL_SKELETON
}

/** Resolve skeleton text for an order: order override → form → bundled. */
export async function resolveSkeletonForOrder(params: {
  orderFormId: string | null | undefined
  orderSkeletonBody?: string | null
  kind?: DocumentKind
}): Promise<{ body: string; source: 'order' | 'form' | 'bundled'; formName: string | null }> {
  const kind = params.kind ?? 'will'
  const bundled = bundledSkeletonForKind(kind)

  if (params.orderSkeletonBody?.trim()) {
    return { body: params.orderSkeletonBody, source: 'order', formName: null }
  }

  const pickFromRow = (row: {
    name: string
    skeleton_body: string | null
    trust_skeleton_body: string | null
    ancillary_skeletons: Json | null
  } | null) => {
    if (!row) return null
    const mapped = mapFormRow({
      id: '',
      name: row.name,
      slug: '',
      description: null,
      schema: [],
      skeleton_body: row.skeleton_body,
      trust_skeleton_body: row.trust_skeleton_body,
      ancillary_skeletons: row.ancillary_skeletons,
      is_default: false,
      is_active: false,
      created_at: '',
      updated_at: '',
      created_by: null,
    })
    return formSkeletonBodyForKind(mapped, kind)
  }

  if (params.orderFormId) {
    const { data } = await supabase
      .from('questionnaire_forms')
      .select('name, skeleton_body, trust_skeleton_body, ancillary_skeletons')
      .eq('id', params.orderFormId)
      .maybeSingle()
    const body = pickFromRow(data)
    if (body?.trim()) {
      return { body, source: 'form', formName: data?.name ?? null }
    }
  }
  const { data: active } = await supabase
    .from('questionnaire_forms')
    .select('name, skeleton_body, trust_skeleton_body, ancillary_skeletons')
    .eq('is_active', true)
    .maybeSingle()
  const activeBody = pickFromRow(active)
  if (activeBody?.trim()) {
    return { body: activeBody, source: 'form', formName: active?.name ?? null }
  }
  return { body: bundled, source: 'bundled', formName: null }
}

/** Public: active form schema for the live questionnaire. Falls back to bundled SECTIONS. */
export async function getActiveQuestionnaireSchema(): Promise<{
  formId: string | null
  formName: string | null
  sections: Section[]
}> {
  try {
    await ensureDefaultForm()
  } catch {
    /* continue with active lookup */
  }

  const { data, error } = await supabase
    .from('questionnaire_forms')
    .select('id, name, schema, is_default')
    .eq('is_active', true)
    .maybeSingle()

  if (error || !data) {
    return { formId: null, formName: null, sections: [...SECTIONS] }
  }

  const validated = validateQuestionnaireSchema(data.schema)
  if (!validated.ok) {
    return { formId: null, formName: null, sections: [...SECTIONS] }
  }

  const merged = mergeMissingBundledFields(mergeMissingBundledSections(validated.sections))
  return {
    formId: data.id,
    formName: data.name,
    sections: data.is_default ? syncBundledDefaultQuestions(merged) : merged,
  }
}

export function newSection(_index?: number): Section {
  return {
    id: crypto.randomUUID(),
    title: 'New section',
    intro: '',
    fields: [],
  }
}

export function newField(_index?: number): Field {
  return {
    id: crypto.randomUUID(),
    label: 'New question',
    type: 'shorttext',
    placeholder: '',
  }
}
