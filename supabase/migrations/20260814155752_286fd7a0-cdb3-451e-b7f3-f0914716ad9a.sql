DROP POLICY IF EXISTS "Public can view featured inventory" ON public.admin_inventory;
REVOKE SELECT ON public.admin_inventory FROM anon;

CREATE OR REPLACE FUNCTION public.ml_public_featured(_limit integer DEFAULT 5)
RETURNS TABLE (
  id uuid,
  name text,
  origin text,
  brand text,
  condition text,
  avg_weight_text text,
  public_price_idr numeric,
  featured_rank integer,
  image_url text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT i.id, i.name, i.origin, i.brand, i.condition, i.avg_weight_text,
         (COALESCE(i.sale_price_idr,0) + COALESCE(i.markup_idr,0))::numeric,
         i.featured_rank, i.image_url
  FROM public.admin_inventory i
  WHERE i.featured_rank IS NOT NULL AND i.is_active
  ORDER BY i.featured_rank
  LIMIT GREATEST(LEAST(COALESCE(_limit,5), 20), 1);
$$;

REVOKE ALL ON FUNCTION public.ml_public_featured(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ml_public_featured(integer) TO anon, authenticated, service_role;