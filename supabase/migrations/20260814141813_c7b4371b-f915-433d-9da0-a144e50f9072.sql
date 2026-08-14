CREATE TABLE public.admin_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.admin_settings TO authenticated;
GRANT ALL ON public.admin_settings TO service_role;

ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage settings" ON public.admin_settings
FOR ALL TO authenticated
USING (public.ml_has_role(auth.uid(), 'admin'))
WITH CHECK (public.ml_has_role(auth.uid(), 'admin'));

CREATE TRIGGER admin_settings_updated_at
BEFORE UPDATE ON public.admin_settings
FOR EACH ROW EXECUTE FUNCTION public.ml_touch_updated_at();

INSERT INTO public.admin_settings (key, value) VALUES ('inventory_low_stock_kg', '10'::jsonb);