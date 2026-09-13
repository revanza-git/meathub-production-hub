DROP FUNCTION IF EXISTS public.ml_public_catalog_analysis(text, text, text, text);

CREATE MATERIALIZED VIEW public.ml_catalog_analysis_cache AS
WITH inventory AS (
  SELECT
    COALESCE(NULLIF(btrim(cut_type), ''), public.ml_guess_cut_type(name)) AS cut,
    grade_band::text AS grade,
    COALESCE(NULLIF(btrim(origin), ''), 'Other') AS origin,
    qty_on_hand_kg,
    CASE
      WHEN promo_price_idr IS NOT NULL
        AND (promo_until IS NULL OR promo_until >= CURRENT_DATE)
        AND promo_price_idr < sale_price_idr + COALESCE(markup_idr, 0)
      THEN promo_price_idr
      ELSE sale_price_idr + COALESCE(markup_idr, 0)
    END AS public_price
  FROM public.admin_inventory
  WHERE is_active = true AND is_published = true
),
rfq_items AS (
  SELECT
    public.ml_guess_cut_type(COALESCE(NULLIF(btrim(x.item->>'product_cut'), ''), q.product_cut)) AS cut,
    public.ml_guess_grade_band(concat_ws(' ', COALESCE(NULLIF(btrim(x.item->>'grade'), ''), q.grade, ''), COALESCE(NULLIF(btrim(x.item->>'product_cut'), ''), q.product_cut)))::text AS grade,
    COALESCE(NULLIF(btrim(x.item->>'origin_preference'), ''), q.origin_preference, 'Other') AS origin
  FROM public.quote_requests q
  CROSS JOIN LATERAL jsonb_array_elements(
    CASE
      WHEN jsonb_typeof(q.items) = 'array' AND jsonb_array_length(q.items) > 0 THEN q.items
      ELSE jsonb_build_array(jsonb_build_object(
        'product_cut', q.product_cut,
        'grade', q.grade,
        'origin_preference', q.origin_preference
      ))
    END
  ) AS x(item)
  WHERE q.created_at >= now() - interval '90 days'
),
combos AS (
  SELECT cut AS filter_cut, grade AS filter_grade, origin AS filter_origin
  FROM inventory
  GROUP BY CUBE(cut, grade, origin)
),
facets AS (
  SELECT jsonb_build_object(
    'cuts', COALESCE((SELECT jsonb_agg(v ORDER BY v) FROM (SELECT DISTINCT cut AS v FROM inventory) x), '[]'::jsonb),
    'grades', COALESCE((SELECT jsonb_agg(v ORDER BY CASE v WHEN 'UNGRADED' THEN 0 WHEN 'MB0_2' THEN 1 WHEN 'MB2_4' THEN 2 WHEN 'MB4_6' THEN 3 WHEN 'MB6_9' THEN 4 WHEN 'MB9_12' THEN 5 ELSE 6 END) FROM (SELECT DISTINCT grade AS v FROM inventory) x), '[]'::jsonb),
    'origins', COALESCE((SELECT jsonb_agg(v ORDER BY v) FROM (SELECT DISTINCT origin AS v FROM inventory) x), '[]'::jsonb)
  ) AS value
)
SELECT
  c.filter_cut,
  c.filter_grade,
  c.filter_origin,
  jsonb_build_object(
    'generated_at', now(),
    'window_days', 90,
    'summary', jsonb_build_object(
      'sku_count', summary.sku_count,
      'stock_kg', summary.stock_kg,
      'avg_price_idr', summary.avg_price_idr,
      'median_price_idr', summary.median_price_idr,
      'request_count', CASE WHEN demand_total.request_count >= 3 THEN demand_total.request_count ELSE NULL END,
      'demand_suppressed', demand_total.request_count > 0 AND demand_total.request_count < 3
    ),
    'facets', facets.value,
    'groups', groups.value
  ) AS payload
FROM combos c
CROSS JOIN facets
CROSS JOIN LATERAL (
  SELECT
    count(*)::int AS sku_count,
    round(COALESCE(sum(i.qty_on_hand_kg), 0), 2) AS stock_kg,
    round(avg(i.public_price)) AS avg_price_idr,
    round(percentile_cont(0.5) WITHIN GROUP (ORDER BY i.public_price)::numeric) AS median_price_idr
  FROM inventory i
  WHERE (c.filter_cut IS NULL OR i.cut = c.filter_cut)
    AND (c.filter_grade IS NULL OR i.grade = c.filter_grade)
    AND (c.filter_origin IS NULL OR i.origin = c.filter_origin)
) summary
CROSS JOIN LATERAL (
  SELECT count(*)::int AS request_count
  FROM rfq_items d
  WHERE (c.filter_cut IS NULL OR d.cut = c.filter_cut)
    AND (c.filter_grade IS NULL OR d.grade = c.filter_grade)
    AND (c.filter_origin IS NULL OR lower(d.origin) = lower(c.filter_origin))
) demand_total
CROSS JOIN LATERAL (
  SELECT jsonb_build_object(
    'cut', COALESCE((SELECT jsonb_agg(row_value ORDER BY stock_kg DESC, label) FROM (
      SELECT jsonb_build_object(
        'label', i.cut, 'sku_count', count(*)::int, 'stock_kg', round(sum(i.qty_on_hand_kg), 2),
        'min_price_idr', round(min(i.public_price)), 'avg_price_idr', round(avg(i.public_price)), 'max_price_idr', round(max(i.public_price)),
        'request_count', CASE WHEN count(d.*) >= 3 THEN count(d.*)::int ELSE NULL END,
        'demand_suppressed', count(d.*) > 0 AND count(d.*) < 3
      ) AS row_value, sum(i.qty_on_hand_kg) AS stock_kg, i.cut AS label
      FROM inventory i
      LEFT JOIN rfq_items d ON d.cut = i.cut
        AND (c.filter_grade IS NULL OR d.grade = c.filter_grade)
        AND (c.filter_origin IS NULL OR lower(d.origin) = lower(c.filter_origin))
      WHERE (c.filter_cut IS NULL OR i.cut = c.filter_cut)
        AND (c.filter_grade IS NULL OR i.grade = c.filter_grade)
        AND (c.filter_origin IS NULL OR i.origin = c.filter_origin)
      GROUP BY i.cut
    ) rows), '[]'::jsonb),
    'grade', COALESCE((SELECT jsonb_agg(row_value ORDER BY stock_kg DESC, label) FROM (
      SELECT jsonb_build_object(
        'label', i.grade, 'sku_count', count(*)::int, 'stock_kg', round(sum(i.qty_on_hand_kg), 2),
        'min_price_idr', round(min(i.public_price)), 'avg_price_idr', round(avg(i.public_price)), 'max_price_idr', round(max(i.public_price)),
        'request_count', CASE WHEN count(d.*) >= 3 THEN count(d.*)::int ELSE NULL END,
        'demand_suppressed', count(d.*) > 0 AND count(d.*) < 3
      ) AS row_value, sum(i.qty_on_hand_kg) AS stock_kg, i.grade AS label
      FROM inventory i
      LEFT JOIN rfq_items d ON d.grade = i.grade
        AND (c.filter_cut IS NULL OR d.cut = c.filter_cut)
        AND (c.filter_origin IS NULL OR lower(d.origin) = lower(c.filter_origin))
      WHERE (c.filter_cut IS NULL OR i.cut = c.filter_cut)
        AND (c.filter_grade IS NULL OR i.grade = c.filter_grade)
        AND (c.filter_origin IS NULL OR i.origin = c.filter_origin)
      GROUP BY i.grade
    ) rows), '[]'::jsonb),
    'origin', COALESCE((SELECT jsonb_agg(row_value ORDER BY stock_kg DESC, label) FROM (
      SELECT jsonb_build_object(
        'label', i.origin, 'sku_count', count(*)::int, 'stock_kg', round(sum(i.qty_on_hand_kg), 2),
        'min_price_idr', round(min(i.public_price)), 'avg_price_idr', round(avg(i.public_price)), 'max_price_idr', round(max(i.public_price)),
        'request_count', CASE WHEN count(d.*) >= 3 THEN count(d.*)::int ELSE NULL END,
        'demand_suppressed', count(d.*) > 0 AND count(d.*) < 3
      ) AS row_value, sum(i.qty_on_hand_kg) AS stock_kg, i.origin AS label
      FROM inventory i
      LEFT JOIN rfq_items d ON lower(d.origin) = lower(i.origin)
        AND (c.filter_cut IS NULL OR d.cut = c.filter_cut)
        AND (c.filter_grade IS NULL OR d.grade = c.filter_grade)
      WHERE (c.filter_cut IS NULL OR i.cut = c.filter_cut)
        AND (c.filter_grade IS NULL OR i.grade = c.filter_grade)
        AND (c.filter_origin IS NULL OR i.origin = c.filter_origin)
      GROUP BY i.origin
    ) rows), '[]'::jsonb)
  ) AS value
) groups;

CREATE UNIQUE INDEX ml_catalog_analysis_cache_filters_idx
  ON public.ml_catalog_analysis_cache (
    COALESCE(filter_cut, ''), COALESCE(filter_grade, ''), COALESCE(filter_origin, '')
  );

GRANT SELECT ON public.ml_catalog_analysis_cache TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.ml_public_catalog_analysis(
  _group_by text DEFAULT 'cut',
  _cut text DEFAULT NULL,
  _grade text DEFAULT NULL,
  _origin text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $function$
  SELECT jsonb_set(
    payload,
    '{rows}',
    COALESCE(payload->'groups'->_group_by, '[]'::jsonb),
    true
  ) - 'groups'
  FROM public.ml_catalog_analysis_cache
  WHERE filter_cut IS NOT DISTINCT FROM _cut
    AND filter_grade IS NOT DISTINCT FROM _grade
    AND filter_origin IS NOT DISTINCT FROM _origin
    AND _group_by IN ('cut', 'grade', 'origin')
  LIMIT 1;
$function$;

REVOKE ALL ON FUNCTION public.ml_public_catalog_analysis(text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ml_public_catalog_analysis(text, text, text, text) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.ml_refresh_catalog_analysis_cache()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  REFRESH MATERIALIZED VIEW public.ml_catalog_analysis_cache;
  RETURN NULL;
END;
$function$;

REVOKE ALL ON FUNCTION public.ml_refresh_catalog_analysis_cache() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ml_refresh_catalog_analysis_cache() TO service_role;

CREATE TRIGGER refresh_catalog_analysis_after_inventory
AFTER INSERT OR UPDATE OR DELETE ON public.admin_inventory
FOR EACH STATEMENT EXECUTE FUNCTION public.ml_refresh_catalog_analysis_cache();

CREATE TRIGGER refresh_catalog_analysis_after_rfq
AFTER INSERT OR UPDATE OR DELETE ON public.quote_requests
FOR EACH STATEMENT EXECUTE FUNCTION public.ml_refresh_catalog_analysis_cache();

COMMENT ON MATERIALIZED VIEW public.ml_catalog_analysis_cache IS 'Privacy-safe public catalog aggregates; contains no buyer identity, internal cost, markup, or individual RFQ rows.';
COMMENT ON FUNCTION public.ml_public_catalog_analysis(text, text, text, text) IS 'Reads privacy-safe cached catalog analysis by cut, grade, or origin.';