import { supabase } from '@/integrations/supabase/client'
import type { OrderDraft } from '@/lib/order'
import { normalizeOrderDocuments, saveOrderDraft } from '@/lib/order'

export const SESSION_STORAGE_KEY = 'myaiwill.questionnaire.session.v1'

export type QuestionnaireSession = {
  orderId: string
  answersId: string
  partnerNumber: 1 | 2
  partnerToken: string
}

export type Answers = Record<string, unknown>

export type QuestionnaireDraftMeta = {
  plan: 'individual' | 'couples'
  includeTrust: boolean
  documents: string[]
  email: string
  partnerEmail?: string
  total: number
  expiresAt: string | null
}

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

function draftFromMeta(meta: QuestionnaireDraftMeta | undefined): OrderDraft | null {
  if (!meta) return null
  const draft: OrderDraft = {
    plan: meta.plan,
    email: meta.email,
    partnerEmail: meta.partnerEmail,
    includeTrust: meta.includeTrust,
    documents: normalizeOrderDocuments(meta.documents),
    total: meta.total,
    lsrConsent: true,
  }
  saveOrderDraft(draft)
  return draft
}

/** Open via email token and/or resume an existing paid session. Never creates unpaid orders. */
export async function ensureQuestionnaireSession(
  draft: OrderDraft | null,
  localAnswers: Answers,
  token?: string | null,
  paymentIntentId?: string | null,
): Promise<{
  session: QuestionnaireSession
  answers: Answers
  submitted: boolean
  order: OrderDraft | null
}> {
  const existing = loadSession()
  const result = await invokeQuestionnaire<{
    session: QuestionnaireSession
    answers: Answers
    submitted: boolean
    draft?: QuestionnaireDraftMeta
  }>({
    action: 'ensure',
    draft,
    localAnswers,
    session: existing,
    token: token || undefined,
    paymentIntentId: paymentIntentId || undefined,
  })

  saveSession(result.session)
  const order = draftFromMeta(result.draft) ?? draft
  return { ...result, order }
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
