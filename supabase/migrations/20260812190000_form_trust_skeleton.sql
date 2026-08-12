-- Trust skeleton per questionnaire form (will already has skeleton_body).
ALTER TABLE public.questionnaire_forms
  ADD COLUMN IF NOT EXISTS trust_skeleton_body text;
