CREATE TABLE public.admin_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  origin text NOT NULL,
  brand text NOT NULL DEFAULT '',
  name text NOT NULL,
  condition text,
  avg_weight_text text,
  avg_weight_kg numeric,
  sale_price_idr numeric NOT NULL DEFAULT 0,
  qty_on_hand_kg numeric NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_inventory TO authenticated;
GRANT ALL ON public.admin_inventory TO service_role;

ALTER TABLE public.admin_inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage inventory" ON public.admin_inventory
  FOR ALL TO authenticated
  USING (public.ml_has_role(auth.uid(), 'admin'))
  WITH CHECK (public.ml_has_role(auth.uid(), 'admin'));

CREATE INDEX admin_inventory_origin_idx ON public.admin_inventory (origin);
CREATE INDEX admin_inventory_name_idx ON public.admin_inventory (name);

CREATE TRIGGER admin_inventory_touch
  BEFORE UPDATE ON public.admin_inventory
  FOR EACH ROW EXECUTE FUNCTION public.ml_touch_updated_at();