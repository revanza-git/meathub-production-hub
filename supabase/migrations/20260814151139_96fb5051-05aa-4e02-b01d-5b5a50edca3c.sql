CREATE OR REPLACE FUNCTION public._caller_may_inspect(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT (auth.uid() IS NOT NULL AND auth.uid() = _user_id)
      OR current_user IN ('postgres','service_role','supabase_admin','supabase_auth_admin')
      OR (auth.uid() IS NOT NULL AND public._role_check_internal(
            auth.uid(),
            ARRAY['hub_operator','courier','qc_officer','finance_operator','support','platform_admin','auditor']::public.app_role[]));
$function$;

REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.orders FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.order_items FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.fulfillments FROM anon, authenticated;
REVOKE SELECT ON public.orders, public.order_items, public.fulfillments FROM anon;

DROP POLICY IF EXISTS "signed-in users read active stock" ON public.vendor_products;

DROP VIEW IF EXISTS public.ml_public_stock;

CREATE OR REPLACE FUNCTION public.ml_public_stock()
RETURNS TABLE (
  product_name text,
  category public.ml_product_category,
  qty_kg numeric,
  source_count integer,
  last_updated_at timestamptz
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT vp.name, vp.category, sum(vp.qty_kg), count(*)::integer, max(vp.updated_at)
  FROM public.vendor_products vp
  WHERE vp.is_active AND vp.qty_kg > 0
    AND auth.uid() IS NOT NULL
  GROUP BY vp.name, vp.category;
$function$;

REVOKE ALL ON FUNCTION public.ml_public_stock() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ml_public_stock() FROM anon;
GRANT EXECUTE ON FUNCTION public.ml_public_stock() TO authenticated;