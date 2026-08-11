ALTER TABLE public.will_documents
  DROP CONSTRAINT IF EXISTS will_documents_status_check;

ALTER TABLE public.will_documents
  ADD CONSTRAINT will_documents_status_check
  CHECK (status IN ('pending', 'draft', 'ready_for_review', 'approved', 'sent', 'delivered', 'failed'));

ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_status_check;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_status_check
  CHECK (status IN ('pending_payment', 'paid', 'submitted', 'in_review', 'ready_for_review', 'needs_revision', 'reviewed', 'approved', 'delivered', 'failed'));
