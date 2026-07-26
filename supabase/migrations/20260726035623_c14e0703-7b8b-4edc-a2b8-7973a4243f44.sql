
-- ============ ENUMS ============
CREATE TYPE public.product_tier AS ENUM ('COMMODITY_PREMIUM','SUPER_PREMIUM','UNDERVALUED_QC','SBMEAT_HOUSE');
CREATE TYPE public.catalog_status AS ENUM ('DRAFT','REVIEW','ACTIVE','SUSPENDED','ARCHIVED');
CREATE TYPE public.purchase_type AS ENUM ('LOAF','CARTON','RETAIL');
CREATE TYPE public.evidence_type AS ENUM ('AWARD','ASSOCIATION','QC','DISCLOSURE');
CREATE TYPE public.evidence_status AS ENUM ('PENDING','APPROVED','REJECTED');

-- ============ MASTERS ============
CREATE TABLE public.species (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(30) NOT NULL UNIQUE,
  name VARCHAR(80) NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.species TO authenticated;
GRANT ALL ON public.species TO service_role;
ALTER TABLE public.species ENABLE ROW LEVEL SECURITY;
CREATE POLICY "species_read_all_auth" ON public.species FOR SELECT TO authenticated USING (true);
CREATE POLICY "species_admin_write" ON public.species FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'platform_admin')) WITH CHECK (public.has_role(auth.uid(),'platform_admin'));

CREATE TABLE public.cuts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  species_id UUID NOT NULL REFERENCES public.species(id) ON DELETE RESTRICT,
  code VARCHAR(40) NOT NULL,
  name VARCHAR(120) NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (species_id, code)
);
GRANT SELECT ON public.cuts TO authenticated;
GRANT ALL ON public.cuts TO service_role;
ALTER TABLE public.cuts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cuts_read_all_auth" ON public.cuts FOR SELECT TO authenticated USING (true);
CREATE POLICY "cuts_admin_write" ON public.cuts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'platform_admin')) WITH CHECK (public.has_role(auth.uid(),'platform_admin'));

CREATE TABLE public.brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(40) NOT NULL UNIQUE,
  name VARCHAR(120) NOT NULL,
  country_origin VARCHAR(80),
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.brands TO authenticated;
GRANT ALL ON public.brands TO service_role;
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
CREATE POLICY "brands_read_all_auth" ON public.brands FOR SELECT TO authenticated USING (true);
CREATE POLICY "brands_admin_write" ON public.brands FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'platform_admin')) WITH CHECK (public.has_role(auth.uid(),'platform_admin'));

CREATE TABLE public.grades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(40) NOT NULL UNIQUE,
  name VARCHAR(120) NOT NULL,
  system VARCHAR(40),
  rank INT,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.grades TO authenticated;
GRANT ALL ON public.grades TO service_role;
ALTER TABLE public.grades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "grades_read_all_auth" ON public.grades FOR SELECT TO authenticated USING (true);
CREATE POLICY "grades_admin_write" ON public.grades FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'platform_admin')) WITH CHECK (public.has_role(auth.uid(),'platform_admin'));

-- ============ PRODUCTS ============
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku VARCHAR(64) NOT NULL UNIQUE,
  name VARCHAR(200) NOT NULL,
  species_id UUID NOT NULL REFERENCES public.species(id),
  cut_id UUID NOT NULL REFERENCES public.cuts(id),
  brand_id UUID NOT NULL REFERENCES public.brands(id),
  grade_id UUID NOT NULL REFERENCES public.grades(id),
  tier public.product_tier NOT NULL,
  description TEXT,
  status public.catalog_status NOT NULL DEFAULT 'DRAFT',
  primary_image_url TEXT,
  qc_standard_json JSONB,
  undervalued_disclosure TEXT,
  disclosure_version VARCHAR(20),
  version BIGINT NOT NULL DEFAULT 1,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX products_status_idx ON public.products(status);
CREATE INDEX products_tier_idx ON public.products(tier);
GRANT SELECT ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "products_active_read" ON public.products FOR SELECT TO authenticated
  USING (status = 'ACTIVE' OR public.has_role(auth.uid(),'platform_admin'));
CREATE POLICY "products_admin_write" ON public.products FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'platform_admin')) WITH CHECK (public.has_role(auth.uid(),'platform_admin'));

-- Ensure trigram extension for search
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;
CREATE INDEX products_name_trgm_idx ON public.products USING gin (name extensions.gin_trgm_ops);

CREATE TABLE public.product_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  kind VARCHAR(20) NOT NULL DEFAULT 'IMAGE',
  url TEXT NOT NULL,
  alt TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.product_media TO authenticated;
GRANT ALL ON public.product_media TO service_role;
ALTER TABLE public.product_media ENABLE ROW LEVEL SECURITY;
CREATE POLICY "product_media_read" ON public.product_media FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND (p.status='ACTIVE' OR public.has_role(auth.uid(),'platform_admin'))));
CREATE POLICY "product_media_admin_write" ON public.product_media FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'platform_admin')) WITH CHECK (public.has_role(auth.uid(),'platform_admin'));

CREATE TABLE public.product_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  type public.evidence_type NOT NULL,
  title VARCHAR(200),
  source_url TEXT,
  object_key TEXT,
  status public.evidence_status NOT NULL DEFAULT 'PENDING',
  verified_by UUID REFERENCES auth.users(id),
  verified_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.product_evidence TO authenticated;
GRANT ALL ON public.product_evidence TO service_role;
ALTER TABLE public.product_evidence ENABLE ROW LEVEL SECURITY;
CREATE POLICY "evidence_read_approved" ON public.product_evidence FOR SELECT TO authenticated
  USING (status='APPROVED' OR public.has_role(auth.uid(),'platform_admin'));
CREATE POLICY "evidence_admin_write" ON public.product_evidence FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'platform_admin')) WITH CHECK (public.has_role(auth.uid(),'platform_admin'));

-- ============ VENDOR OFFERS ============
CREATE TABLE public.vendor_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  purchase_type public.purchase_type NOT NULL,
  base_price_per_kg BIGINT NOT NULL CHECK (base_price_per_kg >= 0),
  min_qty NUMERIC(12,3) NOT NULL DEFAULT 1,
  qty_step NUMERIC(12,3) NOT NULL DEFAULT 1,
  expected_min_kg NUMERIC(12,3),
  expected_max_kg NUMERIC(12,3),
  service_zones public.service_zone[] NOT NULL DEFAULT ARRAY['JKT_INNER','JKT_OUTER','BODETABEK']::public.service_zone[],
  status public.catalog_status NOT NULL DEFAULT 'DRAFT',
  effective_from TIMESTAMPTZ,
  effective_to TIMESTAMPTZ,
  version BIGINT NOT NULL DEFAULT 1,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (vendor_id, product_id, purchase_type)
);
CREATE INDEX offers_product_idx ON public.vendor_offers(product_id);
CREATE INDEX offers_vendor_idx ON public.vendor_offers(vendor_id);
CREATE INDEX offers_status_idx ON public.vendor_offers(status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendor_offers TO authenticated;
GRANT ALL ON public.vendor_offers TO service_role;
ALTER TABLE public.vendor_offers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "offers_public_active_read" ON public.vendor_offers FOR SELECT TO authenticated
  USING (status='ACTIVE' OR public.is_org_member(auth.uid(), vendor_id) OR public.has_role(auth.uid(),'platform_admin'));
CREATE POLICY "offers_vendor_write" ON public.vendor_offers FOR ALL TO authenticated
  USING (public.is_org_member(auth.uid(), vendor_id) AND public.has_any_role(auth.uid(), ARRAY['vendor_admin','vendor_operator']::public.app_role[]))
  WITH CHECK (public.is_org_member(auth.uid(), vendor_id) AND public.has_any_role(auth.uid(), ARRAY['vendor_admin','vendor_operator']::public.app_role[]));
CREATE POLICY "offers_admin_write" ON public.vendor_offers FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'platform_admin')) WITH CHECK (public.has_role(auth.uid(),'platform_admin'));

-- ============ INVENTORY SNAPSHOTS ============
CREATE TABLE public.inventory_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id UUID NOT NULL REFERENCES public.vendor_offers(id) ON DELETE CASCADE,
  on_hand_kg NUMERIC(12,3) NOT NULL CHECK (on_hand_kg >= 0),
  available_kg NUMERIC(12,3) NOT NULL CHECK (available_kg >= 0),
  pack_count INT,
  as_of TIMESTAMPTZ NOT NULL DEFAULT now(),
  source VARCHAR(30) NOT NULL DEFAULT 'portal',
  version BIGINT NOT NULL DEFAULT 1,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX inv_offer_asof_idx ON public.inventory_snapshots(offer_id, as_of DESC);
GRANT SELECT, INSERT ON public.inventory_snapshots TO authenticated;
GRANT ALL ON public.inventory_snapshots TO service_role;
ALTER TABLE public.inventory_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "inv_read" ON public.inventory_snapshots FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.vendor_offers o WHERE o.id = offer_id
      AND (o.status='ACTIVE' OR public.is_org_member(auth.uid(), o.vendor_id) OR public.has_role(auth.uid(),'platform_admin')))
  );
CREATE POLICY "inv_vendor_write" ON public.inventory_snapshots FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.vendor_offers o WHERE o.id = offer_id
      AND public.is_org_member(auth.uid(), o.vendor_id)
      AND public.has_any_role(auth.uid(), ARRAY['vendor_admin','vendor_operator']::public.app_role[]))
  );

-- ============ TIMESTAMP TRIGGERS ============
CREATE TRIGGER species_set_updated BEFORE UPDATE ON public.species FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER cuts_set_updated BEFORE UPDATE ON public.cuts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER brands_set_updated BEFORE UPDATE ON public.brands FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER grades_set_updated BEFORE UPDATE ON public.grades FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER products_set_updated BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER evidence_set_updated BEFORE UPDATE ON public.product_evidence FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER offers_set_updated BEFORE UPDATE ON public.vendor_offers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ AUDIT TRIGGER ============
CREATE OR REPLACE FUNCTION public.audit_catalog_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _org UUID;
BEGIN
  IF TG_TABLE_NAME = 'vendor_offers' THEN
    _org := COALESCE(NEW.vendor_id, OLD.vendor_id);
  END IF;
  INSERT INTO public.audit_events(action, entity_type, entity_id, organization_id, actor_user_id, from_state, to_state)
  VALUES (
    TG_TABLE_NAME || '.' || lower(TG_OP),
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    _org,
    auth.uid(),
    CASE WHEN TG_OP <> 'INSERT' THEN to_jsonb(OLD) END,
    CASE WHEN TG_OP <> 'DELETE' THEN to_jsonb(NEW) END
  );
  RETURN COALESCE(NEW, OLD);
END $$;

CREATE TRIGGER products_audit AFTER INSERT OR UPDATE OR DELETE ON public.products FOR EACH ROW EXECUTE FUNCTION public.audit_catalog_change();
CREATE TRIGGER offers_audit AFTER INSERT OR UPDATE OR DELETE ON public.vendor_offers FOR EACH ROW EXECUTE FUNCTION public.audit_catalog_change();
CREATE TRIGGER evidence_audit AFTER INSERT OR UPDATE OR DELETE ON public.product_evidence FOR EACH ROW EXECUTE FUNCTION public.audit_catalog_change();
CREATE TRIGGER inv_audit AFTER INSERT ON public.inventory_snapshots FOR EACH ROW EXECUTE FUNCTION public.audit_catalog_change();

-- ============ SEED MASTERS ============
INSERT INTO public.species(code,name) VALUES
  ('BEEF','Beef'),('LAMB','Lamb'),('CHICKEN','Chicken')
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.brands(code,name,country_origin) VALUES
  ('ANGUS_PRIDE','Angus Pride','Australia'),
  ('WAGYU_SELECT','Wagyu Select','Japan'),
  ('SBMEAT_HOUSE','SBMEAT House Line','Indonesia')
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.grades(code,name,system,rank) VALUES
  ('PRIME','Prime','USDA',3),
  ('CHOICE','Choice','USDA',2),
  ('SELECT','Select','USDA',1),
  ('MB4','MB4+','AUS-MSA',4),
  ('MB7','MB7+','AUS-MSA',7),
  ('A5','A5','JMGA',5)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.cuts(species_id,code,name)
SELECT s.id, c.code, c.name FROM public.species s
CROSS JOIN (VALUES
  ('RIBEYE','Ribeye'),('STRIPLOIN','Striploin'),('TENDERLOIN','Tenderloin'),
  ('BRISKET','Brisket'),('CHUCK','Chuck'),('SHORTRIB','Short Rib')
) AS c(code,name)
WHERE s.code='BEEF'
ON CONFLICT (species_id,code) DO NOTHING;
