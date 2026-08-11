
-- Orders: add submission/review/delivery timestamps, promo, names
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS promo_code text,
  ADD COLUMN IF NOT EXISTS customer_name text,
  ADD COLUMN IF NOT EXISTS partner_name text,
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS review_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz;

-- Will documents: PDF + attorney workflow columns
ALTER TABLE public.will_documents
  ADD COLUMN IF NOT EXISTS pdf_onedrive_item_id text,
  ADD COLUMN IF NOT EXISTS pdf_onedrive_web_url text,
  ADD COLUMN IF NOT EXISTS pdf_storage_path text,
  ADD COLUMN IF NOT EXISTS attorney_notes text,
  ADD COLUMN IF NOT EXISTS revision_count int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS will_content jsonb;

-- Status event log
CREATE TABLE IF NOT EXISTS public.will_status_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  partner_number int,
  status text NOT NULL,
  note text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.will_status_events TO authenticated;
GRANT ALL ON public.will_status_events TO service_role;

ALTER TABLE public.will_status_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read status events"
  ON public.will_status_events FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins write status events"
  ON public.will_status_events FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_will_status_events_order ON public.will_status_events(order_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_submitted_at ON public.orders(submitted_at DESC NULLS LAST);

-- Allow admins to UPDATE will_documents (for notes, status changes)
DROP POLICY IF EXISTS "Admins update will documents" ON public.will_documents;
CREATE POLICY "Admins update will documents"
  ON public.will_documents FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Allow admins to UPDATE orders (status transitions, timestamps)
DROP POLICY IF EXISTS "Admins update orders" ON public.orders;
CREATE POLICY "Admins update orders"
  ON public.orders FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
