-- 1) feature_flags: restrict reads to internal/admin only
DROP POLICY IF EXISTS "flags read authenticated" ON public.feature_flags;
CREATE POLICY "flags read internal" ON public.feature_flags
  FOR SELECT TO authenticated
  USING (public.is_internal(auth.uid()) OR public.has_role(auth.uid(), 'platform_admin'::public.app_role));
REVOKE ALL ON public.feature_flags FROM anon;

-- 2) financial tables: explicit read-only for clients, writes only via SECURITY DEFINER RPCs
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.orders FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.order_items FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.fulfillments FROM anon, authenticated;
REVOKE ALL ON public.orders FROM anon;
REVOKE ALL ON public.order_items FROM anon;
REVOKE ALL ON public.fulfillments FROM anon;
GRANT SELECT ON public.orders TO authenticated;
GRANT SELECT ON public.order_items TO authenticated;
GRANT SELECT ON public.fulfillments TO authenticated;
GRANT ALL ON public.orders TO service_role;
GRANT ALL ON public.order_items TO service_role;
GRANT ALL ON public.fulfillments TO service_role;

-- explicit restrictive guards so no future permissive policy can enable client writes
CREATE POLICY "orders_no_client_write" ON public.orders AS RESTRICTIVE
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (false);
CREATE POLICY "order_items_no_client_write" ON public.order_items AS RESTRICTIVE
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (false);
CREATE POLICY "fulfillments_no_client_write" ON public.fulfillments AS RESTRICTIVE
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (false);

-- 3) notifications: no anonymous access, keep recipient-scoped reads
REVOKE ALL ON public.notifications FROM anon;
GRANT SELECT, UPDATE ON public.notifications TO authenticated;

-- 4) SECURITY DEFINER functions: never callable by anonymous visitors
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', r.sig);
  END LOOP;
END $$;
