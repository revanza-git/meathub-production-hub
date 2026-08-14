CREATE OR REPLACE FUNCTION public.ml_normalise_region(_raw text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $$
  SELECT COALESCE((
    SELECT c FROM unnest(ARRAY[
      'Jakarta','Bogor','Depok','Tangerang','Bekasi','Bandung','Semarang','Yogyakarta',
      'Solo','Surakarta','Surabaya','Malang','Sidoarjo','Denpasar','Bali','Lombok',
      'Mataram','Medan','Palembang','Pekanbaru','Batam','Padang','Lampung','Makassar',
      'Manado','Balikpapan','Samarinda','Banjarmasin','Pontianak','Kupang','Jayapura',
      'Ambon','Cirebon','Karawang','Serang','Cilegon','Jawa Barat','Jawa Tengah',
      'Jawa Timur','Sumatera Utara','Sumatera Selatan','Sumatera Barat','Kalimantan',
      'Sulawesi','Banten','Nasional'
    ]) AS c
    WHERE btrim(COALESCE(_raw, '')) ILIKE '%' || c || '%'
    ORDER BY length(c) DESC
    LIMIT 1
  ), 'Lainnya');
$$;

REVOKE ALL ON FUNCTION public.ml_normalise_region(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ml_normalise_region(text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.ml_market_snapshot(_days integer DEFAULT 90)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _since timestamptz := now() - (GREATEST(COALESCE(_days, 90), 1) || ' days')::interval;
  _result jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentication required';
  END IF;

  SELECT jsonb_build_object(
    'window_days', GREATEST(COALESCE(_days, 90), 1),
    'generated_at', now(),
    'house_inventory', COALESCE((
      SELECT jsonb_agg(x) FROM (
        SELECT origin,
               count(*)::int AS items,
               round(sum(qty_on_hand_kg), 2) AS total_kg,
               round(avg(sale_price_idr)) AS avg_base_price_idr,
               round(avg(sale_price_idr + COALESCE(markup_idr, 0))) AS avg_public_price_idr,
               count(*) FILTER (WHERE qty_on_hand_kg < 10)::int AS low_stock_items
        FROM admin_inventory
        WHERE is_active
        GROUP BY origin
        ORDER BY total_kg DESC
      ) x), '[]'::jsonb),
    'vendor_stock', COALESCE((
      SELECT jsonb_agg(x) FROM (
        SELECT category::text AS category,
               count(*)::int AS listings,
               round(sum(qty_kg), 2) AS total_kg
        FROM vendor_products
        WHERE is_active
        GROUP BY category
        ORDER BY total_kg DESC
      ) x), '[]'::jsonb),
    'rfq_demand', COALESCE((
      SELECT jsonb_agg(x) FROM (
        SELECT category, region, requests FROM (
          SELECT CASE WHEN count(*) >= 3
                   THEN COALESCE(NULLIF(btrim(category), ''), 'Uncategorised')
                   ELSE 'Other' END AS category,
                 CASE WHEN count(*) >= 3
                   THEN ml_normalise_region(delivery_location)
                   ELSE 'Other' END AS region,
                 count(*)::int AS requests
          FROM quote_requests
          WHERE created_at >= _since
          GROUP BY COALESCE(NULLIF(btrim(category), ''), 'Uncategorised'),
                   ml_normalise_region(delivery_location)
        ) g
        ORDER BY requests DESC
        LIMIT 50
      ) x), '[]'::jsonb),
    'orders', COALESCE((
      SELECT jsonb_agg(x) FROM (
        SELECT status::text AS status,
               payment_term::text AS payment_term,
               count(*)::int AS orders,
               round(sum(qty_kg), 2) AS total_kg
        FROM buyer_orders
        WHERE created_at >= _since
        GROUP BY 1, 2
        ORDER BY orders DESC
      ) x), '[]'::jsonb),
    'metrics', COALESCE((
      SELECT jsonb_agg(x) FROM (
        SELECT metric_key, region, observed_on, value, unit
        FROM market_metrics
        WHERE observed_on >= _since::date
        ORDER BY observed_on DESC
        LIMIT 200
      ) x), '[]'::jsonb)
  ) INTO _result;

  RETURN _result;
END;
$function$;