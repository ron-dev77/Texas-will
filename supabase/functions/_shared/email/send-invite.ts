import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { isPlaceholderEmail, sendResendEmail } from './resend.ts'
import {
  buildQuestionnaireInviteEmail,
  type QuestionnaireInviteContext,
} from './templates/questionnaire-invite.ts'
import type { SendEmailResult } from './types.ts'

function appOrigin(): string {
  return (
    Deno.env.get('APP_ORIGIN')?.trim() ||
    Deno.env.get('PUBLIC_SITE_URL')?.trim() ||
    'https://myaiwill.com'
  )
}

export type InviteSendResult = {
  primary: SendEmailResult | null
  partner: SendEmailResult | null
}

export async function sendQuestionnaireInvites(
  _sb: SupabaseClient,
  params: {
    orderId: string
    planType: string
    includeTrust: boolean
    amountPaidCents: number
    userEmail: string
    partnerEmail: string | null
    partner1Token: string
    partner2Token: string
    expiresAt: string
    planCents?: number
    trustCents?: number
  },
): Promise<InviteSendResult> {
  const origin = appOrigin().replace(/\/$/, '')
  const result: InviteSendResult = { primary: null, partner: null }

  const baseCtx = {
    orderId: params.orderId,
    planType: params.planType,
    includeTrust: params.includeTrust,
    amountPaidCents: params.amountPaidCents,
    expiresAt: params.expiresAt,
    appOrigin: origin,
    planCents: params.planCents,
    trustCents: params.trustCents,
  }

  if (!isPlaceholderEmail(params.userEmail)) {
    const ctx: QuestionnaireInviteContext = {
      ...baseCtx,
      recipientEmail: params.userEmail,
      partnerLabel: 'you',
      questionnaireUrl: `${origin}/questionnaire?token=${encodeURIComponent(params.partner1Token)}`,
    }
    const tpl = buildQuestionnaireInviteEmail(ctx)
    result.primary = await sendResendEmail({
      to: params.userEmail,
      subject: tpl.subject,
      html: tpl.html,
      text: tpl.text,
      tags: [
        { name: 'category', value: 'questionnaire_invite' },
        { name: 'order_id', value: params.orderId.slice(0, 36) },
      ],
    })
  }

  if (
    params.planType === 'couples' &&
    params.partnerEmail &&
    !isPlaceholderEmail(params.partnerEmail)
  ) {
    const ctx: QuestionnaireInviteContext = {
      ...baseCtx,
      recipientEmail: params.partnerEmail,
      partnerLabel: 'partner',
      questionnaireUrl: `${origin}/questionnaire?token=${encodeURIComponent(params.partner2Token)}`,
    }
    const tpl = buildQuestionnaireInviteEmail(ctx)
    result.partner = await sendResendEmail({
      to: params.partnerEmail,
      subject: tpl.subject,
      html: tpl.html,
      text: tpl.text,
      tags: [
        { name: 'category', value: 'questionnaire_invite_partner' },
        { name: 'order_id', value: params.orderId.slice(0, 36) },
      ],
    })
  }

  console.log('[email] questionnaire invites', {
    orderId: params.orderId,
    primary: result.primary,
    partner: result.partner,
  })

  return result
}
