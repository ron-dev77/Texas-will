-- Ancillary document kinds + form-level skeleton map
-- Medical POA, Durable POA, Directive to Physicians, HIPAA release

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

ALTER TABLE public.will_documents
  ADD CONSTRAINT will_documents_document_kind_check
  CHECK (document_kind IN ('will', 'rlt', 'mpoa', 'dpoa', 'directive', 'hipaa'));

ALTER TABLE public.will_document_versions
  ADD CONSTRAINT will_document_versions_document_kind_check
  CHECK (document_kind IN ('will', 'rlt', 'mpoa', 'dpoa', 'directive', 'hipaa'));

ALTER TABLE public.questionnaire_forms
  ADD COLUMN IF NOT EXISTS ancillary_skeletons jsonb NOT NULL DEFAULT '{}'::jsonb;
