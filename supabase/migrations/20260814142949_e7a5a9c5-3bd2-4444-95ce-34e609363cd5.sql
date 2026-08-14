ALTER TABLE public.admin_inventory
  ADD COLUMN IF NOT EXISTS featured_rank smallint,
  ADD COLUMN IF NOT EXISTS image_url text;

ALTER TABLE public.admin_inventory
  ADD CONSTRAINT admin_inventory_featured_rank_range CHECK (featured_rank IS NULL OR (featured_rank BETWEEN 1 AND 5));

CREATE UNIQUE INDEX IF NOT EXISTS admin_inventory_featured_rank_key
  ON public.admin_inventory (featured_rank) WHERE featured_rank IS NOT NULL;

GRANT SELECT ON public.admin_inventory TO anon;

CREATE POLICY "Public can view featured inventory"
  ON public.admin_inventory FOR SELECT TO anon, authenticated
  USING (featured_rank IS NOT NULL AND is_active);