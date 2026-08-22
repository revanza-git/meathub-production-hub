-- 1. Catalog fields on the canonical house inventory
ALTER TABLE public.admin_inventory
  ADD COLUMN IF NOT EXISTS category public.ml_product_category NOT NULL DEFAULT 'PRIME_CUT',
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS is_published boolean NOT NULL DEFAULT true;

-- 2. Slug helper
CREATE OR REPLACE FUNCTION public.ml_slugify(_text text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT trim(both '-' from regexp_replace(lower(coalesce(_text, '')), '[^a-z0-9]+', '-', 'g'))
$$;

REVOKE ALL ON FUNCTION public.ml_slugify(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ml_slugify(text) TO authenticated, service_role;

-- 3. Category heuristic for backfill
UPDATE public.admin_inventory SET category =
  CASE
    WHEN name ~* '(tongue|lidah|liver|hati|tripe|babat|heart|jantung|kidney|ginjal|intestine|usus|offal|oxtail|buntut)' THEN 'OFFAL'
    WHEN name ~* '(bone|tulang|marrow|sumsum)' THEN 'BONE'
    WHEN name ~* '(tenderloin|striploin|ribeye|rib eye|sirloin|cube roll|short rib|wagyu|a5|picanha|rump)' THEN 'PRIME_CUT'
    ELSE 'SECOND_CUT'
  END::public.ml_product_category;

-- 4. Backfill slugs, unique-safe
UPDATE public.admin_inventory ai
SET slug = public.ml_slugify(concat_ws('-', ai.brand, ai.name, left(ai.id::text, 6)))
WHERE ai.slug IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS admin_inventory_slug_key ON public.admin_inventory (slug);
CREATE INDEX IF NOT EXISTS admin_inventory_category_idx ON public.admin_inventory (category);

CREATE OR REPLACE FUNCTION public.ml_inventory_slug()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := public.ml_slugify(concat_ws('-', NEW.brand, NEW.name, left(NEW.id::text, 6)));
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.ml_inventory_slug() FROM PUBLIC;

DROP TRIGGER IF EXISTS admin_inventory_slug ON public.admin_inventory;
CREATE TRIGGER admin_inventory_slug
  BEFORE INSERT OR UPDATE ON public.admin_inventory
  FOR EACH ROW EXECUTE FUNCTION public.ml_inventory_slug();

-- 5. Sanitized public catalog listing
CREATE OR REPLACE FUNCTION public.ml_public_catalog(
  _search text DEFAULT NULL,
  _category public.ml_product_category DEFAULT NULL,
  _origin text DEFAULT NULL,
  _limit integer DEFAULT 24,
  _offset integer DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  slug text,
  name text,
  brand text,
  origin text,
  category public.ml_product_category,
  condition text,
  avg_weight_text text,
  image_url text,
  public_price_idr numeric,
  availability text,
  total_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH base AS (
    SELECT ai.*
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
  )
  SELECT
    b.id,
    b.slug,
    b.name,
    b.brand,
    b.origin,
    b.category,
    b.condition,
    b.avg_weight_text,
    b.image_url,
    CASE WHEN b.sale_price_idr > 0 THEN b.sale_price_idr + coalesce(b.markup_idr, 0) ELSE 0 END,
    CASE
      WHEN b.qty_on_hand_kg >= 50 THEN 'IN_STOCK'
      WHEN b.qty_on_hand_kg > 0 THEN 'LIMITED'
      ELSE 'PRE_ORDER'
    END,
    (SELECT count(*) FROM base)
  FROM base b
  ORDER BY coalesce(b.featured_rank, 999), b.name
  LIMIT greatest(1, least(coalesce(_limit, 24), 100))
  OFFSET greatest(0, coalesce(_offset, 0));
$$;

REVOKE ALL ON FUNCTION public.ml_public_catalog(text, public.ml_product_category, text, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ml_public_catalog(text, public.ml_product_category, text, integer, integer) TO anon, authenticated, service_role;

-- 6. Sanitized public product detail
CREATE OR REPLACE FUNCTION public.ml_public_product(_slug text)
RETURNS TABLE (
  id uuid,
  slug text,
  name text,
  brand text,
  origin text,
  category public.ml_product_category,
  condition text,
  avg_weight_text text,
  avg_weight_kg numeric,
  description text,
  image_url text,
  public_price_idr numeric,
  availability text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    ai.id, ai.slug, ai.name, ai.brand, ai.origin, ai.category, ai.condition,
    ai.avg_weight_text, ai.avg_weight_kg, ai.description, ai.image_url,
    CASE WHEN ai.sale_price_idr > 0 THEN ai.sale_price_idr + coalesce(ai.markup_idr, 0) ELSE 0 END,
    CASE
      WHEN ai.qty_on_hand_kg >= 50 THEN 'IN_STOCK'
      WHEN ai.qty_on_hand_kg > 0 THEN 'LIMITED'
      ELSE 'PRE_ORDER'
    END
  FROM public.admin_inventory ai
  WHERE ai.is_published AND ai.slug = _slug
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.ml_public_product(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ml_public_product(text) TO anon, authenticated, service_role;