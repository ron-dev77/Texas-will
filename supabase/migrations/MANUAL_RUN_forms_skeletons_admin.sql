-- =============================================================================
-- Texas Will — combined migration (safe to re-run)
-- Paste into Supabase → SQL Editor → Run
-- Covers: questionnaire forms, form/order skeletons, admin delete grants
-- =============================================================================

-- 1) Named questionnaire forms (multi-form library)
CREATE TABLE IF NOT EXISTS public.questionnaire_forms (
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

CREATE UNIQUE INDEX IF NOT EXISTS questionnaire_forms_slug_uidx
  ON public.questionnaire_forms (slug);
CREATE UNIQUE INDEX IF NOT EXISTS questionnaire_forms_one_active
  ON public.questionnaire_forms (is_active) WHERE is_active;
CREATE UNIQUE INDEX IF NOT EXISTS questionnaire_forms_one_default
  ON public.questionnaire_forms (is_default) WHERE is_default;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.questionnaire_forms TO authenticated;
GRANT ALL ON public.questionnaire_forms TO service_role;

ALTER TABLE public.questionnaire_forms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read all questionnaire forms" ON public.questionnaire_forms;
CREATE POLICY "Admins read all questionnaire forms"
  ON public.questionnaire_forms
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Anyone can read active questionnaire form" ON public.questionnaire_forms;
CREATE POLICY "Anyone can read active questionnaire form"
  ON public.questionnaire_forms
  FOR SELECT
  USING (is_active = true);

DROP POLICY IF EXISTS "Admins insert questionnaire forms" ON public.questionnaire_forms;
CREATE POLICY "Admins insert questionnaire forms"
  ON public.questionnaire_forms
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins update questionnaire forms" ON public.questionnaire_forms;
CREATE POLICY "Admins update questionnaire forms"
  ON public.questionnaire_forms
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins delete questionnaire forms" ON public.questionnaire_forms;
CREATE POLICY "Admins delete questionnaire forms"
  ON public.questionnaire_forms
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') AND is_default = false);

-- Link questionnaire version history to a named form (if table exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'content_questionnaire_versions'
  ) THEN
    ALTER TABLE public.content_questionnaire_versions
      ADD COLUMN IF NOT EXISTS form_id uuid REFERENCES public.questionnaire_forms(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS content_questionnaire_versions_form_id_idx
      ON public.content_questionnaire_versions (form_id);
  END IF;
END $$;

-- 2) Will + trust skeletons on each form
ALTER TABLE public.questionnaire_forms
  ADD COLUMN IF NOT EXISTS skeleton_body text;

ALTER TABLE public.questionnaire_forms
  ADD COLUMN IF NOT EXISTS trust_skeleton_body text;

-- 3) Orders remember which form (and skeleton) was used
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS questionnaire_form_id uuid
    REFERENCES public.questionnaire_forms(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS orders_questionnaire_form_id_idx
  ON public.orders (questionnaire_form_id);

-- 4) Per-order corrected skeleton (will or trust document row)
ALTER TABLE public.will_documents
  ADD COLUMN IF NOT EXISTS skeleton_body text;

-- 5) Admin delete grants + RLS (orders queue ⋮ menu)
GRANT DELETE ON public.orders TO authenticated;
GRANT DELETE ON public.questionnaire_answers TO authenticated;
GRANT DELETE ON public.will_documents TO authenticated;
GRANT DELETE ON public.will_status_events TO authenticated;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'will_document_versions'
  ) THEN
    EXECUTE 'GRANT DELETE ON public.will_document_versions TO authenticated';
  END IF;
END $$;

DROP POLICY IF EXISTS "Admins delete orders" ON public.orders;
CREATE POLICY "Admins delete orders"
  ON public.orders FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins delete questionnaire answers" ON public.questionnaire_answers;
CREATE POLICY "Admins delete questionnaire answers"
  ON public.questionnaire_answers FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins delete will documents" ON public.will_documents;
CREATE POLICY "Admins delete will documents"
  ON public.will_documents FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins delete will status events" ON public.will_status_events;
CREATE POLICY "Admins delete will status events"
  ON public.will_status_events FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'admin'));

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'will_document_versions'
  ) THEN
    EXECUTE 'DROP POLICY IF EXISTS "Admins delete will document versions" ON public.will_document_versions';
    EXECUTE $pol$
      CREATE POLICY "Admins delete will document versions"
        ON public.will_document_versions FOR DELETE TO authenticated
        USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'admin'))
    $pol$;
  END IF;
END $$;

-- Ancillary document kinds (Medical POA, Durable POA, Directive, HIPAA)
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT con.conname AS name, rel.relname AS table_name
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname IN ('will_documents', 'will_document_versions')
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) ILIKE '%document_kind%'
  LOOP
    EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT %I', r.table_name, r.name);
  END LOOP;
END $$;

ALTER TABLE public.will_documents DROP CONSTRAINT IF EXISTS will_documents_document_kind_check;
ALTER TABLE public.will_document_versions DROP CONSTRAINT IF EXISTS will_document_versions_document_kind_check;

ALTER TABLE public.will_documents
  ADD CONSTRAINT will_documents_document_kind_check
  CHECK (document_kind IN ('will', 'rlt', 'mpoa', 'dpoa', 'directive', 'hipaa'));

ALTER TABLE public.will_document_versions
  ADD CONSTRAINT will_document_versions_document_kind_check
  CHECK (document_kind IN ('will', 'rlt', 'mpoa', 'dpoa', 'directive', 'hipaa'));

ALTER TABLE public.questionnaire_forms
  ADD COLUMN IF NOT EXISTS ancillary_skeletons jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Done. Optional check:
-- SELECT column_name FROM information_schema.columns
-- WHERE table_name = 'orders' AND column_name = 'questionnaire_form_id';
