DROP FUNCTION IF EXISTS public.ml_public_catalog(text, ml_product_category, text, integer, integer, boolean);

CREATE OR REPLACE FUNCTION public.ml_public_catalog(
  _search text DEFAULT NULL,
  _category ml_product_category DEFAULT NULL,
  _origin text DEFAULT NULL,
  _limit integer DEFAULT 24,
  _offset integer DEFAULT 0,
  _promo_only boolean DEFAULT false,
  _origins text[] DEFAULT NULL,
  _brands text[] DEFAULT NULL,
  _conditions text[] DEFAULT NULL,
  _availability text[] DEFAULT NULL,
  _min_price numeric DEFAULT NULL,
  _max_price numeric DEFAULT NULL,
  _sort text DEFAULT 'featured'
)
RETURNS TABLE(id uuid, slug text, name text, brand text, origin text, category ml_product_category, condition text, avg_weight_text text, image_url text, public_price_idr numeric, list_price_idr numeric, promo_until date, availability text, total_count bigint)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  WITH base AS (
    SELECT ai.*,
           CASE WHEN ai.sale_price_idr > 0 THEN ai.sale_price_idr + coalesce(ai.markup_idr, 0) ELSE 0 END AS list_price,
           CASE
             WHEN ai.qty_on_hand_kg >= 50 THEN 'IN_STOCK'
             WHEN ai.qty_on_hand_kg > 0 THEN 'LIMITED'
             ELSE 'PRE_ORDER'
           END AS avail
    FROM public.admin_inventory ai
    WHERE ai.is_published
      AND (_category IS NULL OR ai.category = _category)
      AND (_origin IS NULL OR ai.origin = _origin)
      AND (_origins IS NULL OR array_length(_origins, 1) IS NULL OR ai.origin = ANY(_origins))
      AND (_brands IS NULL OR array_length(_brands, 1) IS NULL OR ai.brand = ANY(_brands))
      AND (_conditions IS NULL OR array_length(_conditions, 1) IS NULL OR ai.condition = ANY(_conditions))
      AND (
        _search IS NULL OR _search = ''
        OR ai.name ILIKE '%' || _search || '%'
        OR ai.brand ILIKE '%' || _search || '%'
        OR ai.origin ILIKE '%' || _search || '%'
      )
  ), filtered AS (
    SELECT b.*,
           public.ml_promo_active(b.promo_price_idr, b.promo_until, b.list_price) AS on_promo,
           CASE WHEN public.ml_promo_active(b.promo_price_idr, b.promo_until, b.list_price)
                THEN b.promo_price_idr ELSE b.list_price END AS eff_price
    FROM base b
    WHERE (NOT coalesce(_promo_only, false)
       OR public.ml_promo_active(b.promo_price_idr, b.promo_until, b.list_price))
      AND (_availability IS NULL OR array_length(_availability, 1) IS NULL OR b.avail = ANY(_availability))
  ), priced AS (
    SELECT f.* FROM filtered f
    WHERE (_min_price IS NULL OR f.eff_price >= _min_price)
      AND (_max_price IS NULL OR f.eff_price <= _max_price)
  )
  SELECT
    p.id, p.slug, p.name, p.brand, p.origin, p.category, p.condition,
    p.avg_weight_text, p.image_url,
    p.eff_price,
    p.list_price,
    CASE WHEN p.on_promo THEN p.promo_until ELSE NULL END,
    p.avail,
    (SELECT count(*) FROM priced)
  FROM priced p
  ORDER BY
    CASE WHEN coalesce(_sort,'featured') = 'price_asc' THEN p.eff_price END ASC NULLS LAST,
    CASE WHEN _sort = 'price_desc' THEN p.eff_price END DESC NULLS LAST,
    CASE WHEN _sort = 'name_asc' THEN p.name END ASC,
    CASE WHEN _sort = 'newest' THEN p.created_at END DESC,
    CASE WHEN coalesce(_sort,'featured') = 'featured' THEN coalesce(p.featured_rank, 999) END ASC,
    p.name
  LIMIT greatest(1, least(coalesce(_limit, 24), 100))
  OFFSET greatest(0, coalesce(_offset, 0));
$function$;

REVOKE ALL ON FUNCTION public.ml_public_catalog(text, ml_product_category, text, integer, integer, boolean, text[], text[], text[], text[], numeric, numeric, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ml_public_catalog(text, ml_product_category, text, integer, integer, boolean, text[], text[], text[], text[], numeric, numeric, text) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.ml_public_catalog_facets(
  _search text DEFAULT NULL,
  _category ml_product_category DEFAULT NULL,
  _promo_only boolean DEFAULT false
)
RETURNS TABLE(kind text, value text, cnt bigint, min_price numeric, max_price numeric)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  WITH base AS (
    SELECT ai.*,
           CASE WHEN ai.sale_price_idr > 0 THEN ai.sale_price_idr + coalesce(ai.markup_idr, 0) ELSE 0 END AS list_price
    FROM public.admin_inventory ai
    WHERE ai.is_published
      AND (_category IS NULL OR ai.category = _category)
      AND (
        _search IS NULL OR _search = ''
        OR ai.name ILIKE '%' || _search || '%'
        OR ai.brand ILIKE '%' || _search || '%'
        OR ai.origin ILIKE '%' || _search || '%'
      )
  ), f AS (
    SELECT b.*,
           CASE WHEN public.ml_promo_active(b.promo_price_idr, b.promo_until, b.list_price)
                THEN b.promo_price_idr ELSE b.list_price END AS eff_price,
           CASE
             WHEN b.qty_on_hand_kg >= 50 THEN 'IN_STOCK'
             WHEN b.qty_on_hand_kg > 0 THEN 'LIMITED'
             ELSE 'PRE_ORDER'
           END AS avail
    FROM base b
    WHERE NOT coalesce(_promo_only, false)
       OR public.ml_promo_active(b.promo_price_idr, b.promo_until, b.list_price)
  )
  SELECT 'origin', f.origin, count(*), NULL::numeric, NULL::numeric FROM f WHERE coalesce(f.origin,'') <> '' GROUP BY f.origin
  UNION ALL
  SELECT 'brand', f.brand, count(*), NULL, NULL FROM f WHERE coalesce(f.brand,'') <> '' GROUP BY f.brand
  UNION ALL
  SELECT 'condition', f.condition, count(*), NULL, NULL FROM f WHERE coalesce(f.condition,'') <> '' GROUP BY f.condition
  UNION ALL
  SELECT 'availability', f.avail, count(*), NULL, NULL FROM f GROUP BY f.avail
  UNION ALL
  SELECT 'category', f.category::text, count(*), NULL, NULL FROM f GROUP BY f.category
  UNION ALL
  SELECT 'price', NULL, count(*), min(f.eff_price), max(f.eff_price) FROM f WHERE f.eff_price > 0;
$function$;

REVOKE ALL ON FUNCTION public.ml_public_catalog_facets(text, ml_product_category, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ml_public_catalog_facets(text, ml_product_category, boolean) TO anon, authenticated, service_role;