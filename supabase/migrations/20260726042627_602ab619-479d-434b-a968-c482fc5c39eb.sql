
CREATE TYPE public.sp_severity AS ENUM ('SP1','SP2','SP3','SP4','SP5');
CREATE TYPE public.sp_category AS ENUM (
  'ORDER_REJECTION','LATE_DISPATCH','QC_FAIL','RETURN_VENDOR_FAULT',
  'DOCUMENT_MISSING','POLICY_VIOLATION','OTHER'
);

CREATE TABLE public.sp_warnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  severity public.sp_severity NOT NULL,
  category public.sp_category NOT NULL,
  reason TEXT NOT NULL,
  related_order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  related_entity TEXT,
  related_entity_id UUID,
  issued_by UUID REFERENCES auth.users(id),
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id),
  resolution_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX sp_warnings_vendor_idx ON public.sp_warnings(vendor_id);
CREATE INDEX sp_warnings_active_idx ON public.sp_warnings(vendor_id) WHERE resolved_at IS NULL;

GRANT SELECT, INSERT, UPDATE ON public.sp_warnings TO authenticated;
GRANT ALL ON public.sp_warnings TO service_role;
ALTER TABLE public.sp_warnings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sp_vendor_read_own" ON public.sp_warnings FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), vendor_id));
CREATE POLICY "sp_internal_read" ON public.sp_warnings FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['platform_admin','support','auditor','finance_operator']::public.app_role[]));
CREATE POLICY "sp_internal_write" ON public.sp_warnings FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['platform_admin','support']::public.app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['platform_admin','support']::public.app_role[]));

CREATE TRIGGER trg_sp_warnings_updated BEFORE UPDATE ON public.sp_warnings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Vendor reliability view
CREATE OR REPLACE VIEW public.vendor_reliability AS
SELECT
  o.id AS vendor_id,
  o.display_name,
  COUNT(w.*) FILTER (WHERE w.resolved_at IS NULL AND (w.expires_at IS NULL OR w.expires_at > now())) AS active_warnings,
  COUNT(w.*) FILTER (WHERE w.severity = 'SP5' AND w.resolved_at IS NULL) AS active_sp5,
  MAX(w.issued_at) FILTER (WHERE w.resolved_at IS NULL) AS last_issued_at,
  GREATEST(0, 100
    - COALESCE(SUM(CASE w.severity
        WHEN 'SP1' THEN 2 WHEN 'SP2' THEN 5 WHEN 'SP3' THEN 10
        WHEN 'SP4' THEN 20 WHEN 'SP5' THEN 40 END)
      FILTER (WHERE w.resolved_at IS NULL AND (w.expires_at IS NULL OR w.expires_at > now())), 0)
  ) AS reliability_score
FROM public.organizations o
LEFT JOIN public.sp_warnings w ON w.vendor_id = o.id
WHERE o.type = 'VENDOR'
GROUP BY o.id, o.display_name;

GRANT SELECT ON public.vendor_reliability TO authenticated;

-- RPCs
CREATE OR REPLACE FUNCTION public.issue_sp_warning(
  _vendor_id UUID, _severity public.sp_severity, _category public.sp_category,
  _reason TEXT, _related_order_id UUID DEFAULT NULL, _expires_at TIMESTAMPTZ DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid UUID := auth.uid(); _id UUID;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT public.has_any_role(_uid, ARRAY['platform_admin','support']::public.app_role[]) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF _reason IS NULL OR length(trim(_reason)) < 3 THEN RAISE EXCEPTION 'Reason required'; END IF;
  INSERT INTO public.sp_warnings(vendor_id, severity, category, reason, related_order_id, issued_by, expires_at)
  VALUES (_vendor_id, _severity, _category, _reason, _related_order_id, _uid, _expires_at)
  RETURNING id INTO _id;
  INSERT INTO public.audit_events(action, entity_type, entity_id, organization_id, actor_user_id, to_state)
  VALUES ('sp_warning.issue','sp_warning', _id, _vendor_id, _uid,
          jsonb_build_object('severity',_severity,'category',_category));
  RETURN _id;
END $$;

CREATE OR REPLACE FUNCTION public.resolve_sp_warning(_id UUID, _notes TEXT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid UUID := auth.uid(); _vendor UUID;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT public.has_any_role(_uid, ARRAY['platform_admin','support']::public.app_role[]) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  UPDATE public.sp_warnings
    SET resolved_at = now(), resolved_by = _uid, resolution_notes = _notes
    WHERE id = _id AND resolved_at IS NULL
    RETURNING vendor_id INTO _vendor;
  IF _vendor IS NULL THEN RAISE EXCEPTION 'Warning not found or already resolved'; END IF;
  INSERT INTO public.audit_events(action, entity_type, entity_id, organization_id, actor_user_id, reason)
  VALUES ('sp_warning.resolve','sp_warning', _id, _vendor, _uid, _notes);
END $$;

CREATE OR REPLACE FUNCTION public.set_feature_flag(_key TEXT, _enabled BOOLEAN, _description TEXT DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid UUID := auth.uid();
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT public.has_role(_uid, 'platform_admin'::public.app_role) THEN
    RAISE EXCEPTION 'Only platform admin';
  END IF;
  INSERT INTO public.feature_flags(key, enabled, description, updated_by, updated_at)
  VALUES (_key, _enabled, _description, _uid, now())
  ON CONFLICT (key) DO UPDATE SET
    enabled = EXCLUDED.enabled,
    description = COALESCE(EXCLUDED.description, public.feature_flags.description),
    updated_by = _uid,
    updated_at = now();
  INSERT INTO public.audit_events(action, entity_type, entity_id, actor_user_id, to_state)
  VALUES ('feature_flag.set','feature_flag', NULL, _uid,
          jsonb_build_object('key',_key,'enabled',_enabled));
END $$;

REVOKE EXECUTE ON FUNCTION public.issue_sp_warning(UUID, public.sp_severity, public.sp_category, TEXT, UUID, TIMESTAMPTZ) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.resolve_sp_warning(UUID, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.set_feature_flag(TEXT, BOOLEAN, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.issue_sp_warning(UUID, public.sp_severity, public.sp_category, TEXT, UUID, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_sp_warning(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_feature_flag(TEXT, BOOLEAN, TEXT) TO authenticated;

-- Seed a couple of feature flags for MVP
INSERT INTO public.feature_flags(key, enabled, description) VALUES
  ('ai.recommendations', false, 'AI product recommendations (P1, off in MVP)'),
  ('buyer.self_signup', true, 'Allow buyer organizations to self-register'),
  ('vendor.self_signup', true, 'Allow vendor organizations to self-register')
ON CONFLICT (key) DO NOTHING;
