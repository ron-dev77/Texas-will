-- Remove temporary open Demo RLS policies (unsafe for production).
-- Admin portal uses authenticated + has_role('admin').
-- Customer questionnaire writes go through Edge Function (service role + partner token).

DROP POLICY IF EXISTS "Demo: anon create orders" ON public.orders;
DROP POLICY IF EXISTS "Demo: anon read orders" ON public.orders;
DROP POLICY IF EXISTS "Demo: anon update orders" ON public.orders;
DROP POLICY IF EXISTS "Demo: anon insert answers" ON public.questionnaire_answers;
DROP POLICY IF EXISTS "Demo: anon read answers" ON public.questionnaire_answers;
DROP POLICY IF EXISTS "Demo: anon update answers" ON public.questionnaire_answers;

DROP POLICY IF EXISTS "Demo: anon read will_documents" ON public.will_documents;
DROP POLICY IF EXISTS "Demo: anon insert will_documents" ON public.will_documents;
DROP POLICY IF EXISTS "Demo: anon update will_documents" ON public.will_documents;
DROP POLICY IF EXISTS "Demo: anon read will_status_events" ON public.will_status_events;
DROP POLICY IF EXISTS "Demo: anon insert will_status_events" ON public.will_status_events;

-- Admins need INSERT for first will/trust draft generation
GRANT SELECT, INSERT, UPDATE ON public.will_documents TO authenticated;
GRANT SELECT, INSERT ON public.will_status_events TO authenticated;

DROP POLICY IF EXISTS "Admins insert will documents" ON public.will_documents;
CREATE POLICY "Admins insert will documents"
  ON public.will_documents FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Ensure has_role is callable by authenticated (needed by RLS)
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;
