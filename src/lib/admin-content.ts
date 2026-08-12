import { supabase } from '@/integrations/supabase/client'
import type { Json } from '@/integrations/supabase/types'
import { SECTIONS } from '@/lib/questionnaire'
import { DEFAULT_WILL_SKELETON_BODY } from '@/lib/content-defaults/default-will-skeleton'
import {
  DEFAULT_SYSTEM_PROMPT,
  DEFAULT_USER_PROMPT_TEMPLATE,
} from '@/lib/content-defaults/will-prompts'

export type ContentVersionRow = {
  id: string
  version_no: number
  note: string | null
  created_at: string
  is_active: boolean
}

export const BUNDLED_WILL_SKELETON = DEFAULT_WILL_SKELETON_BODY
export const BUNDLED_PROMPTS = {
  system_prompt: DEFAULT_SYSTEM_PROMPT,
  user_prompt_template: DEFAULT_USER_PROMPT_TEMPLATE,
}
export const BUNDLED_QUESTIONNAIRE_SCHEMA = SECTIONS

async function nextVersionNo(
  table:
    | 'content_skeleton_versions'
    | 'content_prompt_versions'
    | 'content_questionnaire_versions',
) {
  const { data } = await supabase
    .from(table)
    .select('version_no')
    .order('version_no', { ascending: false })
    .limit(1)
    .maybeSingle()
  return (data?.version_no ?? 0) + 1
}

async function deactivateAll(
  table:
    | 'content_skeleton_versions'
    | 'content_prompt_versions'
    | 'content_questionnaire_versions',
) {
  await supabase.from(table).update({ is_active: false }).eq('is_active', true)
}

/* -------------------- Skeleton -------------------- */

export async function getSkeletonContent() {
  const [{ data: active }, { data: versions, error }] = await Promise.all([
    supabase
      .from('content_skeleton_versions')
      .select('id, version_no, body, note, created_at, is_active')
      .eq('is_active', true)
      .maybeSingle(),
    supabase
      .from('content_skeleton_versions')
      .select('id, version_no, note, created_at, is_active')
      .order('version_no', { ascending: false }),
  ])
  if (error) throw new Error(error.message)
  return {
    active: active
      ? { body: active.body, version_no: active.version_no, id: active.id }
      : { body: BUNDLED_WILL_SKELETON, version_no: null as number | null, id: null as string | null },
    defaultBody: BUNDLED_WILL_SKELETON,
    versions: (versions ?? []) as ContentVersionRow[],
  }
}

export async function saveSkeleton(params: { body: string; note?: string }) {
  if (params.body.trim().length < 100) {
    throw new Error('Skeleton body must be at least 100 characters.')
  }
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const version_no = await nextVersionNo('content_skeleton_versions')
  await deactivateAll('content_skeleton_versions')
  const { data, error } = await supabase
    .from('content_skeleton_versions')
    .insert({
      version_no,
      body: params.body,
      note: params.note?.trim() || null,
      created_by: user?.id ?? null,
      is_active: true,
    })
    .select('id, version_no')
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function activateSkeleton(id: string) {
  await deactivateAll('content_skeleton_versions')
  const { error } = await supabase
    .from('content_skeleton_versions')
    .update({ is_active: true })
    .eq('id', id)
  if (error) throw new Error(error.message)
}

export async function getSkeletonVersionBody(id: string) {
  const { data, error } = await supabase
    .from('content_skeleton_versions')
    .select('body, note, version_no')
    .eq('id', id)
    .single()
  if (error) throw new Error(error.message)
  return data
}

/* -------------------- Prompts -------------------- */

export async function getPromptsContent() {
  const [{ data: active }, { data: versions, error }] = await Promise.all([
    supabase
      .from('content_prompt_versions')
      .select('id, version_no, system_prompt, user_prompt_template, note, created_at, is_active')
      .eq('is_active', true)
      .maybeSingle(),
    supabase
      .from('content_prompt_versions')
      .select('id, version_no, note, created_at, is_active')
      .order('version_no', { ascending: false }),
  ])
  if (error) throw new Error(error.message)
  return {
    active: active
      ? {
          system_prompt: active.system_prompt,
          user_prompt_template: active.user_prompt_template,
          version_no: active.version_no,
          id: active.id,
        }
      : {
          ...BUNDLED_PROMPTS,
          version_no: null as number | null,
          id: null as string | null,
        },
    defaults: BUNDLED_PROMPTS,
    versions: (versions ?? []) as ContentVersionRow[],
  }
}

export async function savePrompts(params: {
  system_prompt: string
  user_prompt_template: string
  note?: string
}) {
  if (params.system_prompt.trim().length < 20 || params.user_prompt_template.trim().length < 20) {
    throw new Error('Both prompts must be at least 20 characters.')
  }
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const version_no = await nextVersionNo('content_prompt_versions')
  await deactivateAll('content_prompt_versions')
  const { data, error } = await supabase
    .from('content_prompt_versions')
    .insert({
      version_no,
      system_prompt: params.system_prompt,
      user_prompt_template: params.user_prompt_template,
      note: params.note?.trim() || null,
      created_by: user?.id ?? null,
      is_active: true,
    })
    .select('id, version_no')
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function activatePrompts(id: string) {
  await deactivateAll('content_prompt_versions')
  const { error } = await supabase
    .from('content_prompt_versions')
    .update({ is_active: true })
    .eq('id', id)
  if (error) throw new Error(error.message)
}

export async function getPromptsVersionBody(id: string) {
  const { data, error } = await supabase
    .from('content_prompt_versions')
    .select('system_prompt, user_prompt_template, note, version_no')
    .eq('id', id)
    .single()
  if (error) throw new Error(error.message)
  return data
}

/* -------------------- Questionnaire -------------------- */

export async function getQuestionnaireContent() {
  const [{ data: active }, { data: versions, error }] = await Promise.all([
    supabase
      .from('content_questionnaire_versions')
      .select('id, version_no, schema, note, created_at, is_active')
      .eq('is_active', true)
      .maybeSingle(),
    supabase
      .from('content_questionnaire_versions')
      .select('id, version_no, note, created_at, is_active')
      .order('version_no', { ascending: false }),
  ])
  if (error) throw new Error(error.message)
  return {
    active: active
      ? {
          schema: active.schema,
          version_no: active.version_no,
          id: active.id,
        }
      : {
          schema: BUNDLED_QUESTIONNAIRE_SCHEMA as unknown as Json,
          version_no: null as number | null,
          id: null as string | null,
        },
    defaultSchema: BUNDLED_QUESTIONNAIRE_SCHEMA,
    versions: (versions ?? []) as ContentVersionRow[],
  }
}

export async function saveQuestionnaire(params: { schemaJson: string; note?: string }) {
  let schema: Json
  try {
    schema = JSON.parse(params.schemaJson) as Json
  } catch {
    throw new Error('Questionnaire must be valid JSON.')
  }
  if (!Array.isArray(schema) || schema.length < 1) {
    throw new Error('Questionnaire schema must be a non-empty array of sections.')
  }
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const version_no = await nextVersionNo('content_questionnaire_versions')
  await deactivateAll('content_questionnaire_versions')
  const { data, error } = await supabase
    .from('content_questionnaire_versions')
    .insert({
      version_no,
      schema,
      note: params.note?.trim() || null,
      created_by: user?.id ?? null,
      is_active: true,
    })
    .select('id, version_no')
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function activateQuestionnaire(id: string) {
  await deactivateAll('content_questionnaire_versions')
  const { error } = await supabase
    .from('content_questionnaire_versions')
    .update({ is_active: true })
    .eq('id', id)
  if (error) throw new Error(error.message)
}

export async function getQuestionnaireVersionBody(id: string) {
  const { data, error } = await supabase
    .from('content_questionnaire_versions')
    .select('schema, note, version_no')
    .eq('id', id)
    .single()
  if (error) throw new Error(error.message)
  return data
}
