
-- =========================================================
-- kyb_documents
-- =========================================================
CREATE TYPE public.kyb_doc_type AS ENUM ('NPWP','NIB','KTP_DIREKTUR','REKENING_KORAN','SIUP','OTHER');
CREATE TYPE public.kyb_doc_status AS ENUM ('PENDING','ACCEPTED','REJECTED');

CREATE TABLE public.kyb_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  doc_type public.kyb_doc_type NOT NULL,
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT,
  size_bytes BIGINT,
  status public.kyb_doc_status NOT NULL DEFAULT 'PENDING',
  review_notes TEXT,
  uploaded_by UUID NOT NULL,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX kyb_documents_org_idx ON public.kyb_documents(organization_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.kyb_documents TO authenticated;
GRANT ALL ON public.kyb_documents TO service_role;

ALTER TABLE public.kyb_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "kyb_docs_org_read"
  ON public.kyb_documents FOR SELECT TO authenticated
  USING (
    public.is_org_member(auth.uid(), organization_id)
    OR public.has_any_role(auth.uid(), ARRAY['platform_admin','auditor','support']::public.app_role[])
  );

CREATE POLICY "kyb_docs_org_write"
  ON public.kyb_documents FOR INSERT TO authenticated
  WITH CHECK (
    public.is_org_member(auth.uid(), organization_id)
    AND uploaded_by = auth.uid()
  );

CREATE POLICY "kyb_docs_admin_update"
  ON public.kyb_documents FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'platform_admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'platform_admin'::public.app_role));

CREATE POLICY "kyb_docs_org_delete"
  ON public.kyb_documents FOR DELETE TO authenticated
  USING (
    public.is_org_member(auth.uid(), organization_id)
    AND status = 'PENDING'
  );

CREATE TRIGGER trg_kyb_documents_updated_at
  BEFORE UPDATE ON public.kyb_documents
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- org_state_history
-- =========================================================
CREATE TABLE public.org_state_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  from_state public.org_status,
  to_state public.org_status NOT NULL,
  actor_user_id UUID,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX org_state_history_org_idx ON public.org_state_history(organization_id, created_at DESC);

GRANT SELECT, INSERT ON public.org_state_history TO authenticated;
GRANT ALL ON public.org_state_history TO service_role;

ALTER TABLE public.org_state_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_history_read"
  ON public.org_state_history FOR SELECT TO authenticated
  USING (
    public.is_org_member(auth.uid(), organization_id)
    OR public.has_any_role(auth.uid(), ARRAY['platform_admin','auditor','support']::public.app_role[])
  );

-- =========================================================
-- State-machine functions
-- =========================================================
CREATE OR REPLACE FUNCTION public.create_organization(
  _display_name TEXT,
  _legal_name TEXT,
  _type public.org_type
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid UUID := auth.uid();
  _org_id UUID;
  _role public.app_role;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF _type NOT IN ('BUYER','VENDOR') THEN
    RAISE EXCEPTION 'Only BUYER or VENDOR orgs can be self-created';
  END IF;
  IF length(coalesce(_display_name,'')) < 2 OR length(coalesce(_legal_name,'')) < 2 THEN
    RAISE EXCEPTION 'display_name and legal_name required';
  END IF;

  INSERT INTO public.organizations(display_name, legal_name, type, status, created_by)
  VALUES (_display_name, _legal_name, _type, 'DRAFT', _uid)
  RETURNING id INTO _org_id;

  _role := CASE _type WHEN 'BUYER' THEN 'buyer_owner'::public.app_role
                      WHEN 'VENDOR' THEN 'vendor_admin'::public.app_role END;

  INSERT INTO public.organization_members(organization_id, user_id, role, status)
  VALUES (_org_id, _uid, _role, 'ACTIVE');

  INSERT INTO public.org_state_history(organization_id, from_state, to_state, actor_user_id, reason)
  VALUES (_org_id, NULL, 'DRAFT', _uid, 'created');

  INSERT INTO public.audit_events(action, entity_type, entity_id, organization_id, actor_user_id, to_state)
  VALUES ('org.create','organization', _org_id, _org_id, _uid, jsonb_build_object('status','DRAFT','type',_type));

  RETURN _org_id;
END $$;

REVOKE ALL ON FUNCTION public.create_organization(TEXT,TEXT,public.org_type) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_organization(TEXT,TEXT,public.org_type) TO authenticated;

CREATE OR REPLACE FUNCTION public.submit_organization(_org_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid UUID := auth.uid();
  _current public.org_status;
  _doc_count INT;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT public.has_any_role(_uid, ARRAY['buyer_owner','vendor_admin']::public.app_role[])
     OR NOT public.is_org_member(_uid, _org_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT status INTO _current FROM public.organizations WHERE id = _org_id FOR UPDATE;
  IF _current IS NULL THEN RAISE EXCEPTION 'Organization not found'; END IF;
  IF _current <> 'DRAFT' THEN
    RAISE EXCEPTION 'Only DRAFT organizations can be submitted (current: %)', _current;
  END IF;

  SELECT count(*) INTO _doc_count FROM public.kyb_documents WHERE organization_id = _org_id;
  IF _doc_count < 1 THEN
    RAISE EXCEPTION 'Upload at least one KYB document before submitting';
  END IF;

  UPDATE public.organizations
    SET status = 'SUBMITTED', version = version + 1, updated_at = now()
    WHERE id = _org_id;

  INSERT INTO public.org_state_history(organization_id, from_state, to_state, actor_user_id)
  VALUES (_org_id, _current, 'SUBMITTED', _uid);

  INSERT INTO public.audit_events(action, entity_type, entity_id, organization_id, actor_user_id, from_state, to_state)
  VALUES ('org.submit','organization', _org_id, _org_id, _uid,
          jsonb_build_object('status',_current), jsonb_build_object('status','SUBMITTED'));
END $$;

REVOKE ALL ON FUNCTION public.submit_organization(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_organization(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.review_organization(
  _org_id UUID,
  _decision TEXT,
  _reason TEXT DEFAULT NULL
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid UUID := auth.uid();
  _current public.org_status;
  _next public.org_status;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT public.has_role(_uid, 'platform_admin'::public.app_role) THEN
    RAISE EXCEPTION 'Only platform admins can review organizations';
  END IF;

  IF _decision NOT IN ('START_REVIEW','APPROVE','REJECT') THEN
    RAISE EXCEPTION 'Invalid decision: %', _decision;
  END IF;

  SELECT status INTO _current FROM public.organizations WHERE id = _org_id FOR UPDATE;
  IF _current IS NULL THEN RAISE EXCEPTION 'Organization not found'; END IF;

  IF _decision = 'START_REVIEW' THEN
    IF _current <> 'SUBMITTED' THEN
      RAISE EXCEPTION 'START_REVIEW requires SUBMITTED (current: %)', _current;
    END IF;
    _next := 'UNDER_REVIEW';
  ELSIF _decision = 'APPROVE' THEN
    IF _current NOT IN ('SUBMITTED','UNDER_REVIEW') THEN
      RAISE EXCEPTION 'APPROVE requires SUBMITTED/UNDER_REVIEW (current: %)', _current;
    END IF;
    _next := 'APPROVED';
  ELSIF _decision = 'REJECT' THEN
    IF _current NOT IN ('SUBMITTED','UNDER_REVIEW') THEN
      RAISE EXCEPTION 'REJECT requires SUBMITTED/UNDER_REVIEW (current: %)', _current;
    END IF;
    IF _reason IS NULL OR length(trim(_reason)) < 3 THEN
      RAISE EXCEPTION 'A reason is required to reject';
    END IF;
    _next := 'REJECTED';
  END IF;

  UPDATE public.organizations
    SET status = _next,
        approved_at = CASE WHEN _next='APPROVED' THEN now() ELSE approved_at END,
        suspended_reason = CASE WHEN _next='REJECTED' THEN _reason ELSE suspended_reason END,
        version = version + 1,
        updated_at = now()
    WHERE id = _org_id;

  INSERT INTO public.org_state_history(organization_id, from_state, to_state, actor_user_id, reason)
  VALUES (_org_id, _current, _next, _uid, _reason);

  INSERT INTO public.audit_events(action, entity_type, entity_id, organization_id, actor_user_id, from_state, to_state, reason)
  VALUES ('org.review','organization', _org_id, _org_id, _uid,
          jsonb_build_object('status',_current), jsonb_build_object('status',_next), _reason);
END $$;

REVOKE ALL ON FUNCTION public.review_organization(UUID,TEXT,TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.review_organization(UUID,TEXT,TEXT) TO authenticated;

-- =========================================================
-- Storage policies for the 'kyb' bucket
-- Files must be stored under: <organization_id>/<...>
-- =========================================================
CREATE POLICY "kyb_bucket_read"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'kyb'
    AND (
      public.has_any_role(auth.uid(), ARRAY['platform_admin','auditor','support']::public.app_role[])
      OR public.is_org_member(auth.uid(), ((storage.foldername(name))[1])::uuid)
    )
  );

CREATE POLICY "kyb_bucket_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'kyb'
    AND public.is_org_member(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );

CREATE POLICY "kyb_bucket_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'kyb'
    AND (
      public.has_role(auth.uid(), 'platform_admin'::public.app_role)
      OR public.is_org_member(auth.uid(), ((storage.foldername(name))[1])::uuid)
    )
  );
