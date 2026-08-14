-- Market insights ------------------------------------------------------------
CREATE TABLE public.market_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL,
  category text NOT NULL DEFAULT 'demand',
  region text NOT NULL DEFAULT 'Nasional',
  period_label text,
  source text NOT NULL DEFAULT 'admin',
  confidence text NOT NULL DEFAULT 'medium',
  data_refs jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft',
  display_rank smallint,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT market_insights_source_chk CHECK (source IN ('agent','admin')),
  CONSTRAINT market_insights_status_chk CHECK (status IN ('draft','published','archived')),
  CONSTRAINT market_insights_confidence_chk CHECK (confidence IN ('low','medium','high'))
);

GRANT SELECT ON public.market_insights TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.market_insights TO authenticated;
GRANT ALL ON public.market_insights TO service_role;

ALTER TABLE public.market_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Published insights are public"
  ON public.market_insights FOR SELECT
  USING (status = 'published');

CREATE POLICY "Admins read all insights"
  ON public.market_insights FOR SELECT TO authenticated
  USING (public.ml_has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins insert insights"
  ON public.market_insights FOR INSERT TO authenticated
  WITH CHECK (public.ml_has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update insights"
  ON public.market_insights FOR UPDATE TO authenticated
  USING (public.ml_has_role(auth.uid(), 'admin'))
  WITH CHECK (public.ml_has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete insights"
  ON public.market_insights FOR DELETE TO authenticated
  USING (public.ml_has_role(auth.uid(), 'admin'));

CREATE TRIGGER market_insights_touch
  BEFORE UPDATE ON public.market_insights
  FOR EACH ROW EXECUTE FUNCTION public.ml_touch_updated_at();

CREATE INDEX market_insights_public_idx
  ON public.market_insights (status, display_rank NULLS LAST, created_at DESC);

-- Market metrics --------------------------------------------------------------
CREATE TABLE public.market_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_key text NOT NULL,
  region text NOT NULL DEFAULT 'Nasional',
  observed_on date NOT NULL DEFAULT CURRENT_DATE,
  value numeric NOT NULL,
  unit text,
  notes text,
  source text NOT NULL DEFAULT 'agent',
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT market_metrics_source_chk CHECK (source IN ('agent','admin')),
  UNIQUE (metric_key, region, observed_on)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.market_metrics TO authenticated;
GRANT ALL ON public.market_metrics TO service_role;

ALTER TABLE public.market_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage metrics"
  ON public.market_metrics FOR ALL TO authenticated
  USING (public.ml_has_role(auth.uid(), 'admin'))
  WITH CHECK (public.ml_has_role(auth.uid(), 'admin'));

CREATE TRIGGER market_metrics_touch
  BEFORE UPDATE ON public.market_metrics
  FOR EACH ROW EXECUTE FUNCTION public.ml_touch_updated_at();

-- Aggregated snapshot for analysis (no PII, no vendor identities) --------------
CREATE OR REPLACE FUNCTION public.ml_market_snapshot(_days integer DEFAULT 90)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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
        SELECT COALESCE(NULLIF(btrim(category), ''), 'Uncategorised') AS category,
               COALESCE(NULLIF(btrim(delivery_location), ''), 'Unknown') AS region,
               count(*)::int AS requests
        FROM quote_requests
        WHERE created_at >= _since
        GROUP BY 1, 2
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
$$;

REVOKE ALL ON FUNCTION public.ml_market_snapshot(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ml_market_snapshot(integer) TO authenticated, service_role;