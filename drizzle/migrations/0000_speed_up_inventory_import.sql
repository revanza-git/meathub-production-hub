CREATE INDEX IF NOT EXISTS admin_inventory_slug_key_idx ON public.admin_inventory ((public.ml_slugify(brand || '-' || name)));

ALTER FUNCTION public.ml_import_inventory_append(text, jsonb, integer) SET statement_timeout = '120s';