ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS archived_at timestamptz;
CREATE INDEX IF NOT EXISTS orders_active_idx ON public.orders (created_at DESC) WHERE archived_at IS NULL;