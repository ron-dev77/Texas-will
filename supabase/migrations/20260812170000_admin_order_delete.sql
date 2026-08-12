-- Allow admins (via RLS) to delete orders and related rows from the client.

GRANT DELETE ON public.orders TO authenticated;
GRANT DELETE ON public.questionnaire_answers TO authenticated;
GRANT DELETE ON public.will_documents TO authenticated;
GRANT DELETE ON public.will_status_events TO authenticated;
GRANT DELETE ON public.will_document_versions TO authenticated;

-- Ensure admin delete policies exist (RLS). is_admin / has_role already used elsewhere.
DROP POLICY IF EXISTS "Admins delete orders" ON public.orders;
CREATE POLICY "Admins delete orders"
  ON public.orders FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins delete questionnaire answers" ON public.questionnaire_answers;
CREATE POLICY "Admins delete questionnaire answers"
  ON public.questionnaire_answers FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins delete will documents" ON public.will_documents;
CREATE POLICY "Admins delete will documents"
  ON public.will_documents FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins delete will status events" ON public.will_status_events;
CREATE POLICY "Admins delete will status events"
  ON public.will_status_events FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins delete will document versions" ON public.will_document_versions;
CREATE POLICY "Admins delete will document versions"
  ON public.will_document_versions FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'admin'));
