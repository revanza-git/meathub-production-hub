INSERT INTO public.admin_settings (key, value)
VALUES ('unit_margin_idr', '{"retail":150000,"loaf":60000,"ctn":55000,"ton":45000}'::jsonb)
ON CONFLICT (key) DO NOTHING;

UPDATE public.admin_inventory
SET markup_idr = 60000
WHERE markup_idr IS NULL OR markup_idr <= 0;

CREATE OR REPLACE FUNCTION public.ml_unit_margins()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(
    (SELECT value FROM public.admin_settings WHERE key = 'unit_margin_idr'),
    '{"retail":150000,"loaf":60000,"ctn":55000,"ton":45000}'::jsonb
  );
$$;

REVOKE ALL ON FUNCTION public.ml_unit_margins() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ml_unit_margins() TO anon, authenticated, service_role;