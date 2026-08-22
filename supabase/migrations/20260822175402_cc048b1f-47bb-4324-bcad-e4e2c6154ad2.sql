CREATE TABLE public.ml_buyer_addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label text NOT NULL DEFAULT 'Alamat utama',
  buyer_name text NOT NULL,
  company text,
  phone text NOT NULL,
  email text,
  address text NOT NULL,
  city text,
  notes text,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ml_buyer_addresses TO authenticated;
GRANT ALL ON public.ml_buyer_addresses TO service_role;

ALTER TABLE public.ml_buyer_addresses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Buyers manage their own addresses"
  ON public.ml_buyer_addresses FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE UNIQUE INDEX ml_buyer_addresses_one_default
  ON public.ml_buyer_addresses (user_id) WHERE is_default;

CREATE INDEX ml_buyer_addresses_user_idx ON public.ml_buyer_addresses (user_id, created_at DESC);

CREATE TRIGGER ml_buyer_addresses_touch
  BEFORE UPDATE ON public.ml_buyer_addresses
  FOR EACH ROW EXECUTE FUNCTION public.ml_touch_updated_at();