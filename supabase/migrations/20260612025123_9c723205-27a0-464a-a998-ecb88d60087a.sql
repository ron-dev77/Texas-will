
-- 1. Remove permissive policies on orders
DROP POLICY IF EXISTS "Anyone can create an order" ON public.orders;
DROP POLICY IF EXISTS "Anyone can read orders (token-gated in app)" ON public.orders;
DROP POLICY IF EXISTS "Anyone can update their order (token-gated in app)" ON public.orders;

-- 2. Remove permissive policies on questionnaire_answers
DROP POLICY IF EXISTS "Anyone can insert answers (token-gated in app)" ON public.questionnaire_answers;
DROP POLICY IF EXISTS "Anyone can read answers (token-gated in app)" ON public.questionnaire_answers;
DROP POLICY IF EXISTS "Anyone can update answers (token-gated in app)" ON public.questionnaire_answers;

-- 3. Remove permissive insert on email_queue
DROP POLICY IF EXISTS "Anyone can enqueue email" ON public.email_queue;

-- 4. Storage policies for the wills bucket — restrict writes to service role
CREATE POLICY "Service role can upload wills"
ON storage.objects FOR INSERT TO public
WITH CHECK (bucket_id = 'wills' AND auth.role() = 'service_role');

CREATE POLICY "Service role can update wills"
ON storage.objects FOR UPDATE TO public
USING (bucket_id = 'wills' AND auth.role() = 'service_role')
WITH CHECK (bucket_id = 'wills' AND auth.role() = 'service_role');

CREATE POLICY "Service role can delete wills"
ON storage.objects FOR DELETE TO public
USING (bucket_id = 'wills' AND auth.role() = 'service_role');

-- 5. Set fixed search_path on email queue helper functions
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public, pgmq;
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public, pgmq;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public, pgmq;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public, pgmq;

-- 6. Restrict EXECUTE on email queue helpers to service_role only
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.delete_email(text, bigint) TO service_role;
GRANT EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) TO service_role;

-- 7. Revoke role-check helpers from anon (only signed-in users need them)
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated, service_role;
