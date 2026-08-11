
-- Content versioning tables for admin-editable skeleton, AI prompts, and questionnaire schema.

CREATE TABLE public.content_skeleton_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version_no integer NOT NULL,
  body text NOT NULL,
  note text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  is_active boolean NOT NULL DEFAULT false
);
GRANT SELECT, INSERT, UPDATE ON public.content_skeleton_versions TO authenticated;
GRANT ALL ON public.content_skeleton_versions TO service_role;
ALTER TABLE public.content_skeleton_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read skeleton versions" ON public.content_skeleton_versions
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins write skeleton versions" ON public.content_skeleton_versions
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update skeleton versions" ON public.content_skeleton_versions
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE UNIQUE INDEX content_skeleton_versions_one_active ON public.content_skeleton_versions (is_active) WHERE is_active;
CREATE UNIQUE INDEX content_skeleton_versions_version_no ON public.content_skeleton_versions (version_no);

CREATE TABLE public.content_prompt_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version_no integer NOT NULL,
  system_prompt text NOT NULL,
  user_prompt_template text NOT NULL,
  note text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  is_active boolean NOT NULL DEFAULT false
);
GRANT SELECT, INSERT, UPDATE ON public.content_prompt_versions TO authenticated;
GRANT ALL ON public.content_prompt_versions TO service_role;
ALTER TABLE public.content_prompt_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read prompt versions" ON public.content_prompt_versions
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins write prompt versions" ON public.content_prompt_versions
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update prompt versions" ON public.content_prompt_versions
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE UNIQUE INDEX content_prompt_versions_one_active ON public.content_prompt_versions (is_active) WHERE is_active;
CREATE UNIQUE INDEX content_prompt_versions_version_no ON public.content_prompt_versions (version_no);

CREATE TABLE public.content_questionnaire_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version_no integer NOT NULL,
  schema jsonb NOT NULL,
  note text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  is_active boolean NOT NULL DEFAULT false
);
GRANT SELECT, INSERT, UPDATE ON public.content_questionnaire_versions TO authenticated;
GRANT ALL ON public.content_questionnaire_versions TO service_role;
ALTER TABLE public.content_questionnaire_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read questionnaire versions" ON public.content_questionnaire_versions
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins write questionnaire versions" ON public.content_questionnaire_versions
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update questionnaire versions" ON public.content_questionnaire_versions
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE UNIQUE INDEX content_questionnaire_versions_one_active ON public.content_questionnaire_versions (is_active) WHERE is_active;
CREATE UNIQUE INDEX content_questionnaire_versions_version_no ON public.content_questionnaire_versions (version_no);

-- Record which content versions were used to produce each generated will.
ALTER TABLE public.will_documents
  ADD COLUMN skeleton_version_id uuid REFERENCES public.content_skeleton_versions(id) ON DELETE SET NULL,
  ADD COLUMN prompt_version_id uuid REFERENCES public.content_prompt_versions(id) ON DELETE SET NULL,
  ADD COLUMN questionnaire_version_id uuid REFERENCES public.content_questionnaire_versions(id) ON DELETE SET NULL;
