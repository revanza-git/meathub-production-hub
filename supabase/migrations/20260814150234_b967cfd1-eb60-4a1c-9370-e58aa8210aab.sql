-- 1. Make the public stock view respect the caller's RLS
ALTER VIEW public.ml_public_stock SET (security_invoker = on);
REVOKE ALL ON public.ml_public_stock FROM anon;
GRANT SELECT ON public.ml_public_stock TO authenticated;

-- Supporting policy so signed-in users can still read the aggregate
CREATE POLICY "signed-in users read active stock"
ON public.vendor_products
FOR SELECT
TO authenticated
USING (is_active AND qty_kg > 0);

-- 2. Trigger-only SECURITY DEFINER functions must not be callable via the API
REVOKE ALL ON FUNCTION public.ml_handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ml_track_order_status() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ml_track_stock() FROM PUBLIC, anon, authenticated;