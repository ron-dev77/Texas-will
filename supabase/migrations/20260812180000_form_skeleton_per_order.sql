-- Each questionnaire form owns its will skeleton.
ALTER TABLE public.questionnaire_forms
  ADD COLUMN IF NOT EXISTS skeleton_body text;

-- Orders remember which form (and thus which skeleton) was used.
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS questionnaire_form_id uuid
    REFERENCES public.questionnaire_forms(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS orders_questionnaire_form_id_idx
  ON public.orders (questionnaire_form_id);

-- Per-order corrected skeleton (attorney fixes without changing the form template).
ALTER TABLE public.will_documents
  ADD COLUMN IF NOT EXISTS skeleton_body text;
