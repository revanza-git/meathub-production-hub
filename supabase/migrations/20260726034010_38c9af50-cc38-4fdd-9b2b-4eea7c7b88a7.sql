CREATE EXTENSION IF NOT EXISTS citext;

-- Enums
CREATE TYPE public.org_type AS ENUM ('BUYER', 'VENDOR', 'INTERNAL');
CREATE TYPE public.org_status AS ENUM ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'SUSPENDED');
CREATE TYPE public.membership_status AS ENUM ('ACTIVE', 'INVITED', 'SUSPENDED', 'REMOVED');
CREATE TYPE public.app_role AS ENUM (
  'buyer_owner','buyer_purchaser','buyer_finance',
  'vendor_admin','vendor_operator',
  'hub_operator','courier','qc_officer',
  'finance_operator','support','platform_admin','auditor'
);
CREATE TYPE public.service_zone AS ENUM ('JKT_INNER','JKT_OUTER','BODETABEK','OUT_OF_ZONE');
CREATE TYPE public.job_status AS ENUM ('PENDING','RUNNING','SUCCEEDED','FAILED','DEAD');

-- profiles
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email citext NOT NULL,
  display_name varchar(120),
  phone varchar(30),
  status varchar(20) NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles self select" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles self update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email,'@',1)))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- organizations
CREATE TABLE public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type public.org_type NOT NULL,
  legal_name varchar(200) NOT NULL,
  display_name varchar(120) NOT NULL,
  status public.org_status NOT NULL DEFAULT 'DRAFT',
  tax_profile_json jsonb,
  approved_at timestamptz,
  suspended_reason text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version bigint NOT NULL DEFAULT 1
);
GRANT SELECT, INSERT, UPDATE ON public.organizations TO authenticated;
GRANT ALL ON public.organizations TO service_role;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.organization_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  status public.membership_status NOT NULL DEFAULT 'ACTIVE',
  valid_from timestamptz NOT NULL DEFAULT now(),
  valid_to timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id, user_id, role)
);
CREATE INDEX idx_org_members_user ON public.organization_members(user_id) WHERE status = 'ACTIVE';
CREATE INDEX idx_org_members_org ON public.organization_members(organization_id) WHERE status = 'ACTIVE';
GRANT SELECT ON public.organization_members TO authenticated;
GRANT ALL ON public.organization_members TO service_role;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.organization_members
    WHERE user_id = _user_id AND role = _role AND status = 'ACTIVE'
      AND (valid_to IS NULL OR valid_to > now()));
$$;

CREATE OR REPLACE FUNCTION public.has_any_role(_user_id uuid, _roles public.app_role[])
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.organization_members
    WHERE user_id = _user_id AND role = ANY(_roles) AND status = 'ACTIVE'
      AND (valid_to IS NULL OR valid_to > now()));
$$;

CREATE OR REPLACE FUNCTION public.is_org_member(_user_id uuid, _org_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.organization_members
    WHERE user_id = _user_id AND organization_id = _org_id AND status = 'ACTIVE'
      AND (valid_to IS NULL OR valid_to > now()));
$$;

CREATE OR REPLACE FUNCTION public.is_internal(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_any_role(_user_id, ARRAY['hub_operator','courier','qc_officer','finance_operator','support','platform_admin','auditor']::public.app_role[]);
$$;

CREATE POLICY "orgs member read" ON public.organizations FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), id) OR public.is_internal(auth.uid()));
CREATE POLICY "orgs admin update" ON public.organizations FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'platform_admin'));
CREATE POLICY "orgs draft insert" ON public.organizations FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "members self read" ON public.organization_members FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_org_member(auth.uid(), organization_id) OR public.is_internal(auth.uid()));

-- addresses
CREATE TABLE public.addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  label varchar(80) NOT NULL,
  recipient_name varchar(120) NOT NULL,
  phone varchar(30) NOT NULL,
  address_lines text NOT NULL,
  city varchar(80) NOT NULL,
  district varchar(80),
  postal_code varchar(10),
  latitude numeric(10,6),
  longitude numeric(10,6),
  service_zone public.service_zone,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_addresses_org ON public.addresses(organization_id) WHERE is_active;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.addresses TO authenticated;
GRANT ALL ON public.addresses TO service_role;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "addresses org rw" ON public.addresses FOR ALL TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id) OR public.is_internal(auth.uid()))
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

-- agreements
CREATE TABLE public.agreements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  document_type varchar(30) NOT NULL,
  document_version varchar(20) NOT NULL,
  accepted_at timestamptz NOT NULL DEFAULT now(),
  ip_address inet,
  user_agent text
);
CREATE INDEX idx_agreements_user ON public.agreements(user_id, document_type);
GRANT SELECT, INSERT ON public.agreements TO authenticated;
GRANT ALL ON public.agreements TO service_role;
ALTER TABLE public.agreements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "agreements self read" ON public.agreements FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_internal(auth.uid()));
CREATE POLICY "agreements self insert" ON public.agreements FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- feature_flags
CREATE TABLE public.feature_flags (
  key varchar(80) PRIMARY KEY,
  enabled boolean NOT NULL DEFAULT false,
  description text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);
GRANT SELECT ON public.feature_flags TO authenticated, anon;
GRANT ALL ON public.feature_flags TO service_role;
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "flags public read" ON public.feature_flags FOR SELECT USING (true);
CREATE POLICY "flags admin write" ON public.feature_flags FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'platform_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'platform_admin'));

INSERT INTO public.feature_flags (key, enabled, description) VALUES
  ('ai_consultant_enabled', false, 'AI consultant (P1) — read-only, never places or pays orders'),
  ('whatsapp_notifications', false, 'WhatsApp Business notifications (P1)'),
  ('csv_bulk_import', false, 'Vendor CSV catalog/inventory import (P1)'),
  ('buyer_approval_threshold', false, 'Purchase approval workflow (P1)');

-- config_versions
CREATE TABLE public.config_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope varchar(50) NOT NULL,
  version integer NOT NULL,
  payload jsonb NOT NULL,
  effective_from timestamptz NOT NULL DEFAULT now(),
  effective_to timestamptz,
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(scope, version)
);
GRANT SELECT ON public.config_versions TO authenticated;
GRANT ALL ON public.config_versions TO service_role;
ALTER TABLE public.config_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "config internal read" ON public.config_versions FOR SELECT TO authenticated
  USING (public.is_internal(auth.uid()));

INSERT INTO public.config_versions (scope, version, payload, notes) VALUES
  ('tax', 1, '{"ppn_rate":0.11,"mode":"exclusive","base":["subtotal","markup","shipping"]}'::jsonb, 'PPN 11% exclusive'),
  ('courier', 1, '{"zones":{"JKT_INNER":{"MOTOR":{"base":25000,"per_kg":3000,"max_kg":10},"MOBIL_BOX":{"base":60000,"per_kg":3000,"max_kg":200},"COLD_TRUCK":{"base":150000,"per_kg":3000}},"JKT_OUTER":{"MOTOR":{"base":30000,"per_kg":4500,"max_kg":10},"MOBIL_BOX":{"base":75000,"per_kg":4500,"max_kg":200},"COLD_TRUCK":{"base":180000,"per_kg":4500}},"BODETABEK":{"MOTOR":{"base":35000,"per_kg":6000,"max_kg":10},"MOBIL_BOX":{"base":90000,"per_kg":6000,"max_kg":200},"COLD_TRUCK":{"base":210000,"per_kg":6000}}},"free_shipping_kg":20}'::jsonb, 'Courier rate card + free shipping ≥ 20kg'),
  ('sp_thresholds', 1, '{"window_days":90,"levels":{"SP1":{"stock_failures":1,"late_responses":2},"SP2":{"stock_failures":3,"late_responses":5},"SP3":{"stock_failures":5,"late_responses":10,"vendor_fault_returns":1},"SP4":{"stock_failures":8,"vendor_fault_returns":3},"SP5":{"auto_suspend":true}},"reset_clean_days":90}'::jsonb, 'Unified vendor warning ladder'),
  ('inventory', 1, '{"stale_after_minutes":240}'::jsonb, 'Inventory freshness cutoff'),
  ('quote', 1, '{"expiry_minutes":30}'::jsonb, 'Final quote expiry'),
  ('payment', 1, '{"expiry_minutes":60}'::jsonb, 'Payment intent expiry'),
  ('return_window', 1, '{"hours_after_delivered":2}'::jsonb, 'Return request window'),
  ('vendor_settlement', 1, '{"days_after_delivered":3,"business_days":true,"hold_if_return_open":true}'::jsonb, 'T+3 vendor settlement'),
  ('numbering', 1, '{"order":"SB-YYYYMMDD-NNNNNN","invoice":"INV-YYYYMM-NNNNNN"}'::jsonb, 'Public number formats');

-- audit_events (append-only)
CREATE TABLE public.audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid REFERENCES auth.users(id),
  actor_role public.app_role,
  organization_id uuid REFERENCES public.organizations(id),
  entity_type varchar(50) NOT NULL,
  entity_id uuid,
  action varchar(80) NOT NULL,
  from_state jsonb,
  to_state jsonb,
  reason text,
  ip_address inet,
  correlation_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_entity ON public.audit_events(entity_type, entity_id, created_at DESC);
CREATE INDEX idx_audit_actor ON public.audit_events(actor_user_id, created_at DESC);
GRANT SELECT, INSERT ON public.audit_events TO authenticated;
GRANT ALL ON public.audit_events TO service_role;
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit internal read" ON public.audit_events FOR SELECT TO authenticated
  USING (public.is_internal(auth.uid()));

-- jobs
CREATE TABLE public.jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind varchar(80) NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  run_at timestamptz NOT NULL DEFAULT now(),
  status public.job_status NOT NULL DEFAULT 'PENDING',
  attempts integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 5,
  locked_by varchar(80),
  locked_until timestamptz,
  last_error text,
  correlation_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_jobs_due ON public.jobs(run_at) WHERE status = 'PENDING';
CREATE INDEX idx_jobs_kind_status ON public.jobs(kind, status);
GRANT ALL ON public.jobs TO service_role;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

-- idempotency
CREATE TABLE public.idempotency_keys (
  key varchar(200) PRIMARY KEY,
  scope varchar(80) NOT NULL,
  request_hash text NOT NULL,
  response_json jsonb,
  status_code integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '24 hours'
);
CREATE INDEX idx_idempotency_expires ON public.idempotency_keys(expires_at);
GRANT ALL ON public.idempotency_keys TO service_role;
ALTER TABLE public.idempotency_keys ENABLE ROW LEVEL SECURITY;

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_orgs_updated BEFORE UPDATE ON public.organizations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_addresses_updated BEFORE UPDATE ON public.addresses FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_jobs_updated BEFORE UPDATE ON public.jobs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();