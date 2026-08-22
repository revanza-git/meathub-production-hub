ALTER TABLE public.admin_inventory
  ADD COLUMN IF NOT EXISTS promo_price_idr numeric,
  ADD COLUMN IF NOT EXISTS promo_until date;

CREATE OR REPLACE FUNCTION public.ml_promo_active(_promo numeric, _until date, _list numeric)
RETURNS boolean
LANGUAGE sql IMMUTABLE
SET search_path TO 'public'
AS $$
  SELECT coalesce(_promo, 0) > 0
     AND coalesce(_list, 0) > 0
     AND _promo < _list
     AND (_until IS NULL OR _until >= current_date);
$$;

DROP FUNCTION IF EXISTS public.ml_public_catalog(text, ml_product_category, text, integer, integer);
DROP FUNCTION IF EXISTS public.ml_public_catalog(text, ml_product_category, text, integer, integer, boolean);
DROP FUNCTION IF EXISTS public.ml_public_product(text);
DROP FUNCTION IF EXISTS public.ml_public_featured(integer);

CREATE FUNCTION public.ml_public_catalog(
  _search text DEFAULT NULL::text,
  _category ml_product_category DEFAULT NULL::ml_product_category,
  _origin text DEFAULT NULL::text,
  _limit integer DEFAULT 24,
  _offset integer DEFAULT 0,
  _promo_only boolean DEFAULT false
)
RETURNS TABLE(id uuid, slug text, name text, brand text, origin text, category ml_product_category, condition text, avg_weight_text text, image_url text, public_price_idr numeric, list_price_idr numeric, promo_until date, availability text, total_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  WITH base AS (
    SELECT ai.*,
           CASE WHEN ai.sale_price_idr > 0 THEN ai.sale_price_idr + coalesce(ai.markup_idr, 0) ELSE 0 END AS list_price
    FROM public.admin_inventory ai
    WHERE ai.is_published
      AND (_category IS NULL OR ai.category = _category)
      AND (_origin IS NULL OR ai.origin = _origin)
      AND (
        _search IS NULL OR _search = ''
        OR ai.name ILIKE '%' || _search || '%'
        OR ai.brand ILIKE '%' || _search || '%'
        OR ai.origin ILIKE '%' || _search || '%'
      )
  ), filtered AS (
    SELECT b.*, public.ml_promo_active(b.promo_price_idr, b.promo_until, b.list_price) AS on_promo
    FROM base b
    WHERE NOT coalesce(_promo_only, false)
       OR public.ml_promo_active(b.promo_price_idr, b.promo_until, b.list_price)
  )
  SELECT
    f.id, f.slug, f.name, f.brand, f.origin, f.category, f.condition,
    f.avg_weight_text, f.image_url,
    CASE WHEN f.on_promo THEN f.promo_price_idr ELSE f.list_price END,
    f.list_price,
    CASE WHEN f.on_promo THEN f.promo_until ELSE NULL END,
    CASE
      WHEN f.qty_on_hand_kg >= 50 THEN 'IN_STOCK'
      WHEN f.qty_on_hand_kg > 0 THEN 'LIMITED'
      ELSE 'PRE_ORDER'
    END,
    (SELECT count(*) FROM filtered)
  FROM filtered f
  ORDER BY coalesce(f.featured_rank, 999), f.name
  LIMIT greatest(1, least(coalesce(_limit, 24), 100))
  OFFSET greatest(0, coalesce(_offset, 0));
$function$;

CREATE FUNCTION public.ml_public_product(_slug text)
RETURNS TABLE(id uuid, slug text, name text, brand text, origin text, category ml_product_category, condition text, avg_weight_text text, avg_weight_kg numeric, description text, image_url text, public_price_idr numeric, list_price_idr numeric, promo_until date, availability text)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  WITH b AS (
    SELECT ai.*,
           CASE WHEN ai.sale_price_idr > 0 THEN ai.sale_price_idr + coalesce(ai.markup_idr, 0) ELSE 0 END AS list_price
    FROM public.admin_inventory ai
    WHERE ai.is_published AND ai.slug = _slug
    LIMIT 1
  )
  SELECT
    b.id, b.slug, b.name, b.brand, b.origin, b.category, b.condition,
    b.avg_weight_text, b.avg_weight_kg, b.description, b.image_url,
    CASE WHEN public.ml_promo_active(b.promo_price_idr, b.promo_until, b.list_price)
         THEN b.promo_price_idr ELSE b.list_price END,
    b.list_price,
    CASE WHEN public.ml_promo_active(b.promo_price_idr, b.promo_until, b.list_price)
         THEN b.promo_until ELSE NULL END,
    CASE
      WHEN b.qty_on_hand_kg >= 50 THEN 'IN_STOCK'
      WHEN b.qty_on_hand_kg > 0 THEN 'LIMITED'
      ELSE 'PRE_ORDER'
    END
  FROM b;
$function$;

CREATE FUNCTION public.ml_public_featured(_limit integer DEFAULT 5)
RETURNS TABLE(id uuid, name text, origin text, brand text, condition text, avg_weight_text text, public_price_idr numeric, list_price_idr numeric, featured_rank integer, image_url text)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT i.id, i.name, i.origin, i.brand, i.condition, i.avg_weight_text,
         CASE WHEN public.ml_promo_active(i.promo_price_idr, i.promo_until,
                (COALESCE(i.sale_price_idr,0) + COALESCE(i.markup_idr,0)))
              THEN i.promo_price_idr
              ELSE (COALESCE(i.sale_price_idr,0) + COALESCE(i.markup_idr,0)) END::numeric,
         (COALESCE(i.sale_price_idr,0) + COALESCE(i.markup_idr,0))::numeric,
         i.featured_rank, i.image_url
  FROM public.admin_inventory i
  WHERE i.featured_rank IS NOT NULL AND i.is_active
  ORDER BY i.featured_rank
  LIMIT GREATEST(LEAST(COALESCE(_limit,5), 20), 1);
$function$;

REVOKE ALL ON FUNCTION public.ml_promo_active(numeric, date, numeric) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ml_public_catalog(text, ml_product_category, text, integer, integer, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ml_public_product(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ml_public_featured(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ml_public_catalog(text, ml_product_category, text, integer, integer, boolean) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ml_public_product(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ml_public_featured(integer) TO anon, authenticated;