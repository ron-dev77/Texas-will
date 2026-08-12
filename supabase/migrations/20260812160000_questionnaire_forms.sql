-- Named questionnaire forms (multi-form library). One active form drives the live customer flow.
-- Bundled SECTIONS is seeded client-side as the default form when the table is empty.

CREATE TABLE public.questionnaire_forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL,
  description text,
  schema jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_default boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX questionnaire_forms_slug_uidx ON public.questionnaire_forms (slug);
CREATE UNIQUE INDEX questionnaire_forms_one_active ON public.questionnaire_forms (is_active) WHERE is_active;
CREATE UNIQUE INDEX questionnaire_forms_one_default ON public.questionnaire_forms (is_default) WHERE is_default;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.questionnaire_forms TO authenticated;
GRANT ALL ON public.questionnaire_forms TO service_role;

ALTER TABLE public.questionnaire_forms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read all questionnaire forms"
  ON public.questionnaire_forms
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can read active questionnaire form"
  ON public.questionnaire_forms
  FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins insert questionnaire forms"
  ON public.questionnaire_forms
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update questionnaire forms"
  ON public.questionnaire_forms
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete questionnaire forms"
  ON public.questionnaire_forms
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') AND is_default = false);

-- Link version history rows to a named form.
ALTER TABLE public.content_questionnaire_versions
  ADD COLUMN form_id uuid REFERENCES public.questionnaire_forms(id) ON DELETE SET NULL;

CREATE INDEX content_questionnaire_versions_form_id_idx
  ON public.content_questionnaire_versions (form_id);
