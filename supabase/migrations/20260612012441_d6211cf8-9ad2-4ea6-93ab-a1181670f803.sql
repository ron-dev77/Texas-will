
-- 1. Roles
CREATE TYPE public.app_role AS ENUM ('admin', 'attorney');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Admins can read all roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Migrate existing admins
INSERT INTO public.user_roles (user_id, role)
SELECT user_id, 'admin'::public.app_role
FROM public.admin_users
ON CONFLICT (user_id, role) DO NOTHING;

-- 2. will_documents
CREATE TABLE public.will_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  partner_number smallint NOT NULL,
  google_doc_id text,
  google_doc_url text,
  pdf_storage_path text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','draft','approved','sent','failed')),
  ai_model text,
  ai_prompt_version text,
  generation_error text,
  draft_generated_at timestamptz,
  approved_at timestamptz,
  approved_by uuid REFERENCES auth.users(id),
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (order_id, partner_number)
);

GRANT SELECT ON public.will_documents TO authenticated;
GRANT ALL ON public.will_documents TO service_role;

ALTER TABLE public.will_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read all wills"
  ON public.will_documents FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_will_documents_updated_at
  BEFORE UPDATE ON public.will_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Storage policies for the 'wills' bucket (bucket created via tool)
CREATE POLICY "Admins can read wills storage"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'wills' AND public.has_role(auth.uid(), 'admin'));
