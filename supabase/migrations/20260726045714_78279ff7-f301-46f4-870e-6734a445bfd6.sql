
-- 1) feature_flags: restrict public read to authenticated users only
DROP POLICY IF EXISTS "flags public read" ON public.feature_flags;
CREATE POLICY "flags read authenticated" ON public.feature_flags
  FOR SELECT TO authenticated USING (true);

-- 2) Revoke EXECUTE on all public schema functions from PUBLIC and anon.
--    Authenticated retains access to RPCs that internally enforce auth.uid()/role checks.
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT n.nspname, p.proname,
           pg_catalog.pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%I(%s) FROM PUBLIC, anon',
                   r.proname, r.args);
  END LOOP;
END $$;

-- 3) organization_members: block all writes from authenticated users.
--    Only platform_admin (via SECURITY DEFINER RPCs) and service_role can mutate memberships.
CREATE POLICY "members admin insert" ON public.organization_members
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'platform_admin'::public.app_role));

CREATE POLICY "members admin update" ON public.organization_members
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'platform_admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'platform_admin'::public.app_role));

CREATE POLICY "members admin delete" ON public.organization_members
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'platform_admin'::public.app_role));
