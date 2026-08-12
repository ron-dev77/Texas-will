import { supabase } from '@/integrations/supabase/client'
import type { OrderDraft } from '@/lib/order'

export const SESSION_STORAGE_KEY = 'myaiwill.questionnaire.session.v1'

export type QuestionnaireSession = {
  orderId: string
  answersId: string
  partnerNumber: 1 | 2
  partnerToken: string
}

export type Answers = Record<string, unknown>

function loadSession(): QuestionnaireSession | null {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as QuestionnaireSession
  } catch {
    return null
  }
}

function saveSession(session: QuestionnaireSession) {
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session))
}

async function invokeQuestionnaire<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('questionnaire', { body })
  if (error) {
    throw new Error(error.message || 'Questionnaire service error')
  }
  if (data && typeof data === 'object' && 'error' in data && data.error) {
    throw new Error(String((data as { error: string }).error))
  }
  return data as T
}

/** Create or resume order + answers via secure Edge Function (service role + partner token). */
export async function ensureQuestionnaireSession(
  draft: OrderDraft | null,
  localAnswers: Answers,
): Promise<{ session: QuestionnaireSession; answers: Answers; submitted: boolean }> {
  const existing = loadSession()
  const result = await invokeQuestionnaire<{
    session: QuestionnaireSession
    answers: Answers
    submitted: boolean
  }>({
    action: 'ensure',
    draft,
    localAnswers,
    session: existing,
  })

  saveSession(result.session)
  return result
}

export async function saveQuestionnaireAnswers(params: {
  session: QuestionnaireSession
  answers: Answers
  currentSection: number
}): Promise<void> {
  await invokeQuestionnaire({
    action: 'save',
    session: params.session,
    answers: params.answers,
    currentSection: params.currentSection,
  })
}

export async function submitQuestionnaireToDb(params: {
  session: QuestionnaireSession
  answers: Answers
}): Promise<void> {
  await invokeQuestionnaire({
    action: 'submit',
    session: params.session,
    answers: params.answers,
  })
}
