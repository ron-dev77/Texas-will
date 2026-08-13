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
import {
  ANCILLARY_KINDS,
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
  'mpoa_agent_relationship',
  'mpoa_agent_phone',
  'mpoa_alt_agent_name',
  'mpoa_alt_agent_phone',
  'dpoa_agent_name',
  'dpoa_agent_relationship',
  'dpoa_agent_phone',
  'dpoa_alt_agent_name',
  'dpoa_when_effective',
  'directive_preference',
  'directive_notes',
  'hipaa_recipients',
  'hipaa_include_agents',
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

const ANCILLARY_SECTION_IDS = new Set([
  'medical_poa',
  'durable_poa',
  'directive',
  'hipaa',
])

/** Insert any missing bundled sections (e.g. ancillaries) before review. */
export function mergeMissingBundledSections(schema: Section[]): Section[] {
  const ids = new Set(schema.map((s) => s.id))
  const missing = SECTIONS.filter((s) => ANCILLARY_SECTION_IDS.has(s.id) && !ids.has(s.id))
  if (missing.length === 0) return schema
  const reviewIdx = schema.findIndex((s) => s.id === 'review' || s.isReview)
  if (reviewIdx < 0) return [...schema, ...missing]
  return [...schema.slice(0, reviewIdx), ...missing, ...schema.slice(reviewIdx)]
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
    const mergedSchema = mergeMissingBundledSections(mapped.schema)
    if (mergedSchema.length !== mapped.schema.length) {
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

export async function activateForm(id: string): Promise<void> {
  const form = await getForm(id)
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

export const BUNDLED_TRUST_SKELETON = `<!-- texas-will-skeleton-v2 -->
{
  "version": 2,
  "title": "REVOCABLE LIVING TRUST",
  "pageSize": "A4",
  "blocks": [
    {
      "id": "t2",
      "kind": "paragraph",
      "heading": "",
      "body": "This Revocable Living Trust is made by **{{legal_full_name}}**, as Grantor and initial Trustee, under the laws of the **State of Texas**.",
      "label": "",
      "leftLabel": "",
      "rightLabel": "",
      "align": "left",
      "blankLinesAfter": 1,
      "pageBreakBefore": false
    },
    {
      "id": "t3",
      "kind": "paragraph",
      "heading": "",
      "body": "The trust shall be known as **{{trust_name}}** (or, if blank, The {{legal_full_name}} Revocable Living Trust).",
      "label": "",
      "leftLabel": "",
      "rightLabel": "",
      "align": "left",
      "blankLinesAfter": 1,
      "pageBreakBefore": false
    },
    {
      "id": "t4",
      "kind": "paragraph",
      "heading": "",
      "body": "If the Grantor ceases to serve as Trustee, **{{trust_successor_trustee_name}}** shall serve as successor Trustee.",
      "label": "",
      "leftLabel": "",
      "rightLabel": "",
      "align": "left",
      "blankLinesAfter": 2,
      "pageBreakBefore": false
    },
    {
      "id": "t5",
      "kind": "heading",
      "heading": "SIGNATURE OF GRANTOR",
      "body": "",
      "label": "",
      "leftLabel": "",
      "rightLabel": "",
      "align": "center",
      "blankLinesAfter": 1,
      "pageBreakBefore": false
    },
    {
      "id": "t6",
      "kind": "paragraph",
      "heading": "",
      "body": "I, **{{legal_full_name}}**, the Grantor, sign my name to this Revocable Living Trust on this ______ day of __________________, 20_____, and declare that I execute it as my free and voluntary act.",
      "label": "",
      "leftLabel": "",
      "rightLabel": "",
      "align": "left",
      "blankLinesAfter": 1,
      "pageBreakBefore": false
    },
    {
      "id": "t7",
      "kind": "signature",
      "heading": "",
      "body": "",
      "label": "Signature of Grantor",
      "leftLabel": "",
      "rightLabel": "",
      "align": "center",
      "blankLinesAfter": 1,
      "pageBreakBefore": false
    },
    {
      "id": "t8",
      "kind": "heading",
      "heading": "NOTARY ACKNOWLEDGMENT",
      "body": "",
      "label": "",
      "leftLabel": "",
      "rightLabel": "",
      "align": "center",
      "blankLinesAfter": 1,
      "pageBreakBefore": false
    },
    {
      "id": "t9",
      "kind": "paragraph",
      "heading": "",
      "body": "**STATE OF TEXAS**\\n**COUNTY OF** ____________________________\\n\\nThis instrument was acknowledged before me on this ______ day of __________________, 20_____, by **{{legal_full_name}}**, the Grantor.",
      "label": "",
      "leftLabel": "",
      "rightLabel": "",
      "align": "left",
      "blankLinesAfter": 1,
      "pageBreakBefore": false
    },
    {
      "id": "t10",
      "kind": "signature",
      "heading": "",
      "body": "",
      "label": "Notary Public, State of Texas",
      "leftLabel": "",
      "rightLabel": "",
      "align": "right",
      "blankLinesAfter": 0,
      "pageBreakBefore": false
    }
  ]
}
`

/** True when trust skeleton needs bundled refresh (notary align or duplicate title heading). */
export function needsTrustSkeletonRefresh(body: string | null | undefined): boolean {
  const t = (body ?? '').trim()
  if (!t) return true
  if (!t.includes('Notary Public, State of Texas')) return true
  if (/"label":\s*"Notary Public, State of Texas"[\s\S]{0,120}"align":\s*"left"/.test(t)) return true
  // Old templates repeated the document title as the first heading block.
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
    .select('id, name, schema')
    .eq('is_active', true)
    .maybeSingle()

  if (error || !data) {
    return { formId: null, formName: null, sections: [...SECTIONS] }
  }

  const validated = validateQuestionnaireSchema(data.schema)
  if (!validated.ok) {
    return { formId: null, formName: null, sections: [...SECTIONS] }
  }

  return {
    formId: data.id,
    formName: data.name,
    sections: mergeMissingBundledSections(validated.sections),
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
