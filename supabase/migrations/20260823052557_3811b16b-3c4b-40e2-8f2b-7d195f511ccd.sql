DO $$ BEGIN
  CREATE TYPE public.ml_grade_band AS ENUM ('UNGRADED','MB0_2','MB2_4','MB4_6','MB6_9','MB9_12');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.admin_inventory
  ADD COLUMN IF NOT EXISTS grade_band public.ml_grade_band NOT NULL DEFAULT 'UNGRADED',
  ADD COLUMN IF NOT EXISTS cut_type text;

CREATE OR REPLACE FUNCTION public.ml_guess_grade_band(_name text)
RETURNS public.ml_grade_band
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $$
DECLARE
  n text := lower(coalesce(_name, ''));
  m text;
  v numeric;
BEGIN
  m := substring(n from 'mb\s*([0-9]{1,2})');
  IF m IS NOT NULL THEN
    v := m::numeric;
    IF v >= 9 THEN RETURN 'MB9_12';
    ELSIF v >= 6 THEN RETURN 'MB6_9';
    ELSIF v >= 4 THEN RETURN 'MB4_6';
    ELSIF v >= 2 THEN RETURN 'MB2_4';
    ELSE RETURN 'MB0_2';
    END IF;
  END IF;
  IF n ~ '\ma5\M' OR n ~ 'a5\M' THEN RETURN 'MB9_12'; END IF;
  IF n ~ 'a4\M' THEN RETURN 'MB6_9'; END IF;
  IF n ~ 'a3\M' THEN RETURN 'MB4_6'; END IF;
  RETURN 'UNGRADED';
END;
$$;

CREATE OR REPLACE FUNCTION public.ml_guess_cut_type(_name text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $$
  SELECT CASE
    WHEN lower(coalesce(_name,'')) ~ 'tomahawk' THEN 'Tomahawk'
    WHEN lower(coalesce(_name,'')) ~ '(op ribs|op rib|ribeye b/in|rib eye bone)' THEN 'OP Ribs'
    WHEN lower(coalesce(_name,'')) ~ '(tenderloin|tndrloin|tender loin|fillet mignon|filet mignon|chateaubriand)' THEN 'Tenderloin'
    WHEN lower(coalesce(_name,'')) ~ '(striploin|strip loin|ny strip|sirloin|contra fil)' THEN 'Striploin / Sirloin'
    WHEN lower(coalesce(_name,'')) ~ '(ribeye|rib eye|rib-eye|cuberoll|cube roll|bife ancho)' THEN 'Ribeye / Cuberoll'
    WHEN lower(coalesce(_name,'')) ~ '(shortloin|short loin|t-bone|tbone|t bone|porterhouse)' THEN 'Shortloin'
    WHEN lower(coalesce(_name,'')) ~ '(flat iron|flatiron)' THEN 'Flat Iron'
    WHEN lower(coalesce(_name,'')) ~ '(oyster bl|misuji)' THEN 'Oyster Blade'
    WHEN lower(coalesce(_name,'')) ~ '(chk eye roll|chuck eye roll)' THEN 'Chuck Eye Roll'
    WHEN lower(coalesce(_name,'')) ~ '(flap tail|chuck flap)' THEN 'Chuck Flap Tail'
    WHEN lower(coalesce(_name,'')) ~ '(chk roll|chuck roll|chk crest|chuck)' THEN 'Chuck'
    WHEN lower(coalesce(_name,'')) ~ '(short rib|s-rib|chk ribs|rib finger|intercostal)' THEN 'Short Ribs'
    WHEN lower(coalesce(_name,'')) ~ '(short plate|s-plate|plate)' THEN 'Short Plate'
    WHEN lower(coalesce(_name,'')) ~ 'brisket' THEN 'Brisket'
    WHEN lower(coalesce(_name,'')) ~ '(picanha|rump cap|d-rump|rump)' THEN 'Rump / Picanha'
    WHEN lower(coalesce(_name,'')) ~ 'knuckle' THEN 'Knuckle'
    WHEN lower(coalesce(_name,'')) ~ '(topside|inside)' THEN 'Topside'
    WHEN lower(coalesce(_name,'')) ~ '(silverside|outside|eye round)' THEN 'Silverside'
    WHEN lower(coalesce(_name,'')) ~ '(bolar|blade)' THEN 'Blade / Bolar'
    WHEN lower(coalesce(_name,'')) ~ '(shank|shin|sengkel)' THEN 'Shank'
    WHEN lower(coalesce(_name,'')) ~ '(skirt|hanger|onglet)' THEN 'Skirt'
    WHEN lower(coalesce(_name,'')) ~ 'flank' THEN 'Flank'
    WHEN lower(coalesce(_name,'')) ~ '(minced|mince|ground|cl ?[0-9]|trim|patty|burger|slice|shabu|yakiniku)' THEN 'Minced / Prepared'
    WHEN lower(coalesce(_name,'')) ~ '(fat|abura|tallow|suet)' THEN 'Fat'
    WHEN lower(coalesce(_name,'')) ~ '(tongue|lidah|liver|hati|tripe|babat|heart|jantung|kidney|usus|oxtail|buntut|offal)' THEN 'Offal'
    WHEN lower(coalesce(_name,'')) ~ '(bone|tulang|marrow|sumsum)' THEN 'Bone'
    ELSE 'Lainnya'
  END;
$$;

UPDATE public.admin_inventory
SET grade_band = public.ml_guess_grade_band(name),
    cut_type = public.ml_guess_cut_type(name);

CREATE INDEX IF NOT EXISTS admin_inventory_grade_band_idx ON public.admin_inventory (grade_band);
CREATE INDEX IF NOT EXISTS admin_inventory_cut_type_idx ON public.admin_inventory (cut_type);

DROP FUNCTION IF EXISTS public.ml_public_catalog(text, ml_product_category, text, integer, integer, boolean, text[], text[], text[], text[], numeric, numeric, text);

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
  _sort text DEFAULT 'featured',
  _grades text[] DEFAULT NULL,
  _cuts text[] DEFAULT NULL
)
RETURNS TABLE(id uuid, slug text, name text, brand text, origin text, category ml_product_category, condition text, avg_weight_text text, image_url text, public_price_idr numeric, list_price_idr numeric, promo_until date, availability text, grade_band text, cut_type text, total_count bigint)
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
      AND (_grades IS NULL OR array_length(_grades, 1) IS NULL OR ai.grade_band::text = ANY(_grades))
      AND (_cuts IS NULL OR array_length(_cuts, 1) IS NULL OR ai.cut_type = ANY(_cuts))
      AND (
        _search IS NULL OR _search = ''
        OR ai.name ILIKE '%' || _search || '%'
        OR ai.brand ILIKE '%' || _search || '%'
        OR ai.origin ILIKE '%' || _search || '%'
        OR coalesce(ai.cut_type,'') ILIKE '%' || _search || '%'
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
    p.grade_band::text,
    p.cut_type,
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

CREATE OR REPLACE FUNCTION public.ml_public_catalog_facets(_search text DEFAULT NULL, _category ml_product_category DEFAULT NULL, _promo_only boolean DEFAULT false)
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
        OR coalesce(ai.cut_type,'') ILIKE '%' || _search || '%'
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
  SELECT 'grade', f.grade_band::text, count(*), NULL, NULL FROM f GROUP BY f.grade_band
  UNION ALL
  SELECT 'cut', f.cut_type, count(*), NULL, NULL FROM f WHERE coalesce(f.cut_type,'') <> '' GROUP BY f.cut_type
  UNION ALL
  SELECT 'price', NULL, count(*), min(f.eff_price), max(f.eff_price) FROM f WHERE f.eff_price > 0;
$function$;

DROP FUNCTION IF EXISTS public.ml_public_product(text);

CREATE OR REPLACE FUNCTION public.ml_public_product(_slug text)
RETURNS TABLE(id uuid, slug text, name text, brand text, origin text, category ml_product_category, condition text, avg_weight_text text, avg_weight_kg numeric, description text, image_url text, public_price_idr numeric, list_price_idr numeric, promo_until date, availability text, grade_band text, cut_type text)
LANGUAGE sql
STABLE SECURITY DEFINER
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
    END,
    b.grade_band::text,
    b.cut_type
  FROM b;
$function$;

REVOKE ALL ON FUNCTION public.ml_public_catalog(text, ml_product_category, text, integer, integer, boolean, text[], text[], text[], text[], numeric, numeric, text, text[], text[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ml_public_product(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ml_guess_grade_band(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ml_guess_cut_type(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ml_public_catalog(text, ml_product_category, text, integer, integer, boolean, text[], text[], text[], text[], numeric, numeric, text, text[], text[]) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ml_public_product(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ml_guess_grade_band(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.ml_guess_cut_type(text) TO authenticated, service_role;