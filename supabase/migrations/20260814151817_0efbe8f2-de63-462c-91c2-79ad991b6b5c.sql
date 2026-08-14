ALTER TABLE public.admin_inventory ADD COLUMN IF NOT EXISTS markup_idr numeric NOT NULL DEFAULT 0;

UPDATE public.admin_inventory
SET markup_idr = CASE WHEN name ILIKE '%A5%' OR brand ILIKE '%A5%' THEN 150000 ELSE 60000 END;

ALTER TABLE public.admin_inventory ALTER COLUMN markup_idr SET DEFAULT 60000;