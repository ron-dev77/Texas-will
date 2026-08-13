/** Re-exports for questionnaire / checkout edge functions. */

export { sendResendEmail, isPlaceholderEmail, DEFAULT_EMAIL_FROM } from './resend.ts'
export {
  buildSubmissionContext,
  notifyQuestionnaireSubmission,
  listRegisteredAdminEmails,
} from './send-submission.ts'
export { sendQuestionnaireInvites } from './send-invite.ts'
export {
  sendDocumentsReadyEmails,
  markDocumentsSent,
} from './send-documents-ready.ts'
export { buildClientDocumentsReadyEmail } from './templates/client-documents-ready.ts'
export type { DocumentsReadyEmailContext } from './templates/client-documents-ready.ts'
export { notaryFinderPageUrl, notaryMapsSearchUrl } from './notary.ts'
export type { SubmissionEmailContext, SendEmailResult } from './types.ts'
