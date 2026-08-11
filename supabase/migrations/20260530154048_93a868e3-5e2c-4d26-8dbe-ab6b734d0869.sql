
REVOKE EXECUTE ON FUNCTION public.is_admin(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_admin(UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_admin(UUID) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin(UUID) TO service_role;
