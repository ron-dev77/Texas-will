
ALTER TABLE public.will_documents
  ADD COLUMN IF NOT EXISTS document_kind text NOT NULL DEFAULT 'will'
    CHECK (document_kind IN ('will','rlt'));

ALTER TABLE public.will_document_versions
  ADD COLUMN IF NOT EXISTS document_kind text NOT NULL DEFAULT 'will'
    CHECK (document_kind IN ('will','rlt'));

ALTER TABLE public.will_documents
  DROP CONSTRAINT IF EXISTS will_documents_order_id_partner_number_key;

CREATE UNIQUE INDEX IF NOT EXISTS will_documents_order_partner_kind_key
  ON public.will_documents (order_id, partner_number, document_kind);
