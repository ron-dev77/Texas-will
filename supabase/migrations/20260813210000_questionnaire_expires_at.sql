-- 30-day window to complete the questionnaire after payment
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS questionnaire_expires_at timestamptz;

CREATE INDEX IF NOT EXISTS orders_questionnaire_expires_at_idx
  ON public.orders (questionnaire_expires_at);
