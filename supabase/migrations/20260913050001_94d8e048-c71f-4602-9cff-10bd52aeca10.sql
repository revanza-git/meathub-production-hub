-- Remove broad/default execution inherited by any API role.
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC;

-- Anonymous callers only need the explicitly public storefront functions.
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM anon;
GRANT EXECUTE ON FUNCTION public.ml_confirm_store_receipt(text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.ml_place_order(jsonb, jsonb, public.ml_pay_method, text) TO anon;
GRANT EXECUTE ON FUNCTION public.ml_popular_products(integer) TO anon;
GRANT EXECUTE ON FUNCTION public.ml_public_catalog(text, public.ml_product_category, text, integer, integer, boolean, text[], text[], text[], text[], numeric, numeric, text, text[], text[], text[]) TO anon;
GRANT EXECUTE ON FUNCTION public.ml_public_catalog_facets(text, public.ml_product_category, boolean) TO anon;
GRANT EXECUTE ON FUNCTION public.ml_public_featured(integer) TO anon;
GRANT EXECUTE ON FUNCTION public.ml_public_product(text) TO anon;
GRANT EXECUTE ON FUNCTION public.ml_track_order(text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.ml_unit_margins() TO anon;
GRANT EXECUTE ON FUNCTION public.ml_validate_coupon(text, numeric) TO anon;

-- Role rows must not be directly enumerable by signed-in users.
REVOKE ALL ON TABLE public.ml_user_roles FROM anon;
REVOKE SELECT ON TABLE public.ml_user_roles FROM authenticated;
DROP POLICY IF EXISTS "own roles readable" ON public.ml_user_roles;

-- Keep management writes explicitly restricted to the existing admin policy.
GRANT INSERT, UPDATE, DELETE ON TABLE public.ml_user_roles TO authenticated;

-- Stop organization notifications from being broadcast through Realtime.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.notifications;
  END IF;
END
$$;

-- Make the quote-request ownership boundary explicit and deny anonymous reads.
REVOKE SELECT ON TABLE public.quote_requests FROM anon;
DROP POLICY IF EXISTS "Buyers can read their own quote requests" ON public.quote_requests;
CREATE POLICY "Buyers can read linked quote requests"
ON public.quote_requests
FOR SELECT
TO authenticated
USING (user_id IS NOT NULL AND user_id = auth.uid());