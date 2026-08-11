
CREATE TABLE public.will_document_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  will_document_id uuid NOT NULL REFERENCES public.will_documents(id) ON DELETE CASCADE,
  order_id uuid NOT NULL,
  partner_number smallint NOT NULL,
  version integer NOT NULL,
  will_content jsonb NOT NULL,
  ai_model text,
  attorney_notes text,
  onedrive_web_url text,
  pdf_onedrive_web_url text,
  pdf_storage_path text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (will_document_id, version)
);

CREATE INDEX will_document_versions_order_partner_idx
  ON public.will_document_versions (order_id, partner_number, version DESC);

GRANT SELECT, INSERT ON public.will_document_versions TO authenticated;
GRANT ALL ON public.will_document_versions TO service_role;

ALTER TABLE public.will_document_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read will versions"
  ON public.will_document_versions FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert will versions"
  ON public.will_document_versions FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
