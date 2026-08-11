
-- Helper: updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Admin users table
CREATE TABLE public.admin_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.admin_users TO authenticated;
GRANT ALL ON public.admin_users TO service_role;

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view admin list"
  ON public.admin_users FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- is_admin SECURITY DEFINER function
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users WHERE user_id = _user_id
  );
$$;

-- Orders table
CREATE TABLE public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  plan_type TEXT NOT NULL CHECK (plan_type IN ('individual','couples')),
  stripe_session_id TEXT,
  stripe_payment_intent_id TEXT,
  amount_paid INTEGER NOT NULL DEFAULT 0, -- cents
  status TEXT NOT NULL DEFAULT 'pending_payment'
    CHECK (status IN ('pending_payment','paid','submitted','reviewed','delivered','failed')),
  user_email TEXT NOT NULL,
  partner_email TEXT,
  add_ons JSONB NOT NULL DEFAULT '{}'::jsonb,
  partner1_token TEXT NOT NULL DEFAULT encode(gen_random_bytes(24), 'hex'),
  partner2_token TEXT NOT NULL DEFAULT encode(gen_random_bytes(24), 'hex'),
  partner1_submitted_at TIMESTAMPTZ,
  partner2_submitted_at TIMESTAMPTZ
);

CREATE INDEX idx_orders_partner1_token ON public.orders(partner1_token);
CREATE INDEX idx_orders_partner2_token ON public.orders(partner2_token);
CREATE INDEX idx_orders_created_at ON public.orders(created_at DESC);

GRANT SELECT, INSERT, UPDATE ON public.orders TO anon, authenticated;
GRANT ALL ON public.orders TO service_role;

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Anyone can insert a new order (pre-payment)
CREATE POLICY "Anyone can create an order"
  ON public.orders FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Anonymous and authenticated users can read/update orders if they have the token
-- (token-based access — token is a hex secret the client knows after creating the order)
CREATE POLICY "Anyone can read orders (token-gated in app)"
  ON public.orders FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can update their order (token-gated in app)"
  ON public.orders FOR UPDATE TO anon, authenticated
  USING (true) WITH CHECK (true);

-- Admins can do everything
CREATE POLICY "Admins full access orders"
  ON public.orders FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER orders_set_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Questionnaire answers
CREATE TABLE public.questionnaire_answers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  partner_number SMALLINT NOT NULL CHECK (partner_number IN (1,2)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  submitted_at TIMESTAMPTZ,
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  current_section INTEGER NOT NULL DEFAULT 1,
  review_status TEXT NOT NULL DEFAULT 'in_progress'
    CHECK (review_status IN ('in_progress','pending','reviewed','delivered')),
  attorney_flags JSONB NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (order_id, partner_number)
);

CREATE INDEX idx_qa_order_id ON public.questionnaire_answers(order_id);

GRANT SELECT, INSERT, UPDATE ON public.questionnaire_answers TO anon, authenticated;
GRANT ALL ON public.questionnaire_answers TO service_role;

ALTER TABLE public.questionnaire_answers ENABLE ROW LEVEL SECURITY;

-- Token-gated in app: open access policies (we never expose the token publicly without it)
CREATE POLICY "Anyone can read answers (token-gated in app)"
  ON public.questionnaire_answers FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Anyone can insert answers (token-gated in app)"
  ON public.questionnaire_answers FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Anyone can update answers (token-gated in app)"
  ON public.questionnaire_answers FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Admins full access answers"
  ON public.questionnaire_answers FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER qa_set_updated_at
  BEFORE UPDATE ON public.questionnaire_answers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Email queue (placeholder until email infra is wired)
CREATE TABLE public.email_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at TIMESTAMPTZ,
  to_email TEXT NOT NULL,
  template TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued','sent','failed'))
);

GRANT INSERT ON public.email_queue TO anon, authenticated;
GRANT ALL ON public.email_queue TO service_role;

ALTER TABLE public.email_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can enqueue email"
  ON public.email_queue FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Admins read email queue"
  ON public.email_queue FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));
