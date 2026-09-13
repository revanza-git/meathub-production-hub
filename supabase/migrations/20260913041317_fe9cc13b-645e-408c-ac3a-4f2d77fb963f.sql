CREATE OR REPLACE FUNCTION public.ml_public_catalog_analysis(
  _group_by text DEFAULT 'cut',
  _cut text DEFAULT NULL,
  _grade text DEFAULT NULL,
  _origin text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
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
    q.created_at,
    COALESCE(NULLIF(btrim(x.item->>'product_cut'), ''), q.product_cut) AS product_cut,
    COALESCE(NULLIF(btrim(x.item->>'grade'), ''), q.grade, '') AS grade_text,
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
demand AS (
  SELECT
    public.ml_guess_cut_type(product_cut) AS cut,
    public.ml_guess_grade_band(concat_ws(' ', grade_text, product_cut))::text AS grade,
    COALESCE(NULLIF(btrim(origin), ''), 'Other') AS origin
  FROM rfq_items
),
filtered_inventory AS (
  SELECT * FROM inventory
  WHERE (_cut IS NULL OR cut = _cut)
    AND (_grade IS NULL OR grade = _grade)
    AND (_origin IS NULL OR lower(origin) = lower(_origin))
),
filtered_demand AS (
  SELECT * FROM demand
  WHERE (_cut IS NULL OR cut = _cut)
    AND (_grade IS NULL OR grade = _grade)
    AND (_origin IS NULL OR lower(origin) = lower(_origin))
),
inv_groups AS (
  SELECT
    CASE _group_by WHEN 'grade' THEN grade WHEN 'origin' THEN origin ELSE cut END AS label,
    count(*)::int AS sku_count,
    round(sum(qty_on_hand_kg), 2) AS stock_kg,
    round(min(public_price)) AS min_price_idr,
    round(avg(public_price)) AS avg_price_idr,
    round(max(public_price)) AS max_price_idr
  FROM filtered_inventory
  GROUP BY 1
),
demand_groups AS (
  SELECT
    CASE _group_by WHEN 'grade' THEN grade WHEN 'origin' THEN origin ELSE cut END AS label,
    count(*)::int AS request_count
  FROM filtered_demand
  GROUP BY 1
),
joined_groups AS (
  SELECT
    COALESCE(i.label, d.label) AS label,
    COALESCE(i.sku_count, 0) AS sku_count,
    COALESCE(i.stock_kg, 0) AS stock_kg,
    i.min_price_idr,
    i.avg_price_idr,
    i.max_price_idr,
    CASE WHEN COALESCE(d.request_count, 0) >= 3 THEN d.request_count ELSE NULL END AS request_count,
    COALESCE(d.request_count, 0) > 0 AND COALESCE(d.request_count, 0) < 3 AS demand_suppressed
  FROM inv_groups i
  FULL JOIN demand_groups d ON lower(d.label) = lower(i.label)
),
summary AS (
  SELECT
    count(*)::int AS sku_count,
    round(COALESCE(sum(qty_on_hand_kg), 0), 2) AS stock_kg,
    round(avg(public_price)) AS avg_price_idr,
    percentile_cont(0.5) WITHIN GROUP (ORDER BY public_price)::numeric AS median_price_idr
  FROM filtered_inventory
),
demand_summary AS (
  SELECT count(*)::int AS request_count FROM filtered_demand
),
facets AS (
  SELECT jsonb_build_object(
    'cuts', COALESCE((SELECT jsonb_agg(v ORDER BY v) FROM (SELECT DISTINCT cut AS v FROM inventory WHERE cut IS NOT NULL) s), '[]'::jsonb),
    'grades', COALESCE((SELECT jsonb_agg(v ORDER BY CASE v WHEN 'UNGRADED' THEN 0 WHEN 'MB0_2' THEN 1 WHEN 'MB2_4' THEN 2 WHEN 'MB4_6' THEN 3 WHEN 'MB6_9' THEN 4 WHEN 'MB9_12' THEN 5 ELSE 6 END) FROM (SELECT DISTINCT grade AS v FROM inventory WHERE grade IS NOT NULL) s), '[]'::jsonb),
    'origins', COALESCE((SELECT jsonb_agg(v ORDER BY v) FROM (SELECT DISTINCT origin AS v FROM inventory WHERE origin IS NOT NULL) s), '[]'::jsonb)
  ) AS value
)
SELECT jsonb_build_object(
  'generated_at', now(),
  'window_days', 90,
  'summary', jsonb_build_object(
    'sku_count', s.sku_count,
    'stock_kg', s.stock_kg,
    'avg_price_idr', s.avg_price_idr,
    'median_price_idr', round(s.median_price_idr),
    'request_count', CASE WHEN ds.request_count >= 3 THEN ds.request_count ELSE NULL END,
    'demand_suppressed', ds.request_count > 0 AND ds.request_count < 3
  ),
  'facets', f.value,
  'rows', COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'label', label,
      'sku_count', sku_count,
      'stock_kg', stock_kg,
      'min_price_idr', min_price_idr,
      'avg_price_idr', avg_price_idr,
      'max_price_idr', max_price_idr,
      'request_count', request_count,
      'demand_suppressed', demand_suppressed
    ) ORDER BY stock_kg DESC, label)
    FROM joined_groups
  ), '[]'::jsonb)
)
FROM summary s CROSS JOIN demand_summary ds CROSS JOIN facets f;
$function$;

REVOKE ALL ON FUNCTION public.ml_public_catalog_analysis(text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ml_public_catalog_analysis(text, text, text, text) TO anon, authenticated, service_role;

COMMENT ON FUNCTION public.ml_public_catalog_analysis(text, text, text, text) IS 'Public privacy-safe catalog price, stock, and 90-day RFQ demand aggregates by cut, grade, or origin.';