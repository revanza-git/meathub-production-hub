CREATE TABLE public.public_market_observations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_name text NOT NULL,
  source_url text NOT NULL,
  signal_type text NOT NULL,
  commodity text NOT NULL DEFAULT 'Daging Sapi',
  market_level text NOT NULL,
  region text NOT NULL DEFAULT 'Nasional',
  observed_on date NOT NULL,
  price_idr_per_kg numeric,
  value numeric,
  unit text,
  summary text NOT NULL,
  verification_status text NOT NULL DEFAULT 'candidate',
  review_notes text,
  created_by uuid REFERENCES auth.users(id),
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT public_market_observations_source_chk CHECK (
    source_name IN ('pihps_bi','sp2kp_kemendag','bapanas','kementan','bps','bank_indonesia')
  ),
  CONSTRAINT public_market_observations_signal_chk CHECK (
    signal_type IN ('price','industry','policy','seasonal','macro')
  ),
  CONSTRAINT public_market_observations_level_chk CHECK (
    market_level IN ('producer','rph_wholesale','retail','import','industry','policy','macro')
  ),
  CONSTRAINT public_market_observations_status_chk CHECK (
    verification_status IN ('candidate','verified','rejected')
  ),
  CONSTRAINT public_market_observations_price_chk CHECK (
    price_idr_per_kg IS NULL OR price_idr_per_kg >= 0
  ),
  CONSTRAINT public_market_observations_price_signal_chk CHECK (
    signal_type <> 'price' OR price_idr_per_kg IS NOT NULL
  )
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.public_market_observations TO authenticated;
GRANT ALL ON public.public_market_observations TO service_role;

ALTER TABLE public.public_market_observations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users read usable public observations"
  ON public.public_market_observations FOR SELECT TO authenticated
  USING (
    verification_status IN ('candidate','verified')
    OR public.ml_has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admins insert public observations"
  ON public.public_market_observations FOR INSERT TO authenticated
  WITH CHECK (public.ml_has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update public observations"
  ON public.public_market_observations FOR UPDATE TO authenticated
  USING (public.ml_has_role(auth.uid(), 'admin'))
  WITH CHECK (public.ml_has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete public observations"
  ON public.public_market_observations FOR DELETE TO authenticated
  USING (public.ml_has_role(auth.uid(), 'admin'));

CREATE TRIGGER public_market_observations_touch
  BEFORE UPDATE ON public.public_market_observations
  FOR EACH ROW EXECUTE FUNCTION public.ml_touch_updated_at();

CREATE INDEX public_market_observations_recent_idx
  ON public.public_market_observations
  (verification_status, signal_type, observed_on DESC);

CREATE INDEX public_market_observations_region_idx
  ON public.public_market_observations (region, observed_on DESC);