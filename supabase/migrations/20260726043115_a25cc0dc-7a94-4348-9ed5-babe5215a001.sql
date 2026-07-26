-- Extend return status vocabulary
DO $$ BEGIN
  ALTER TYPE public.return_status ADD VALUE IF NOT EXISTS 'REFUNDED';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TYPE public.return_status ADD VALUE IF NOT EXISTS 'CLOSED';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Resolution tracking on return_requests
ALTER TABLE public.return_requests
  ADD COLUMN IF NOT EXISTS resolution TEXT,
  ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS resolved_by UUID REFERENCES auth.users(id);

-- Refunds table
CREATE TABLE IF NOT EXISTS public.refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  return_request_id UUID NOT NULL REFERENCES public.return_requests(id) ON DELETE RESTRICT,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE RESTRICT,
  buyer_org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  method public.payment_method NOT NULL,
  reference TEXT,
  notes TEXT,
  recorded_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS refunds_return_idx ON public.refunds(return_request_id);
CREATE INDEX IF NOT EXISTS refunds_buyer_idx ON public.refunds(buyer_org_id);
CREATE INDEX IF NOT EXISTS refunds_order_idx ON public.refunds(order_id);

GRANT SELECT, INSERT ON public.refunds TO authenticated;
GRANT ALL ON public.refunds TO service_role;
ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "refunds_finance_all" ON public.refunds
  FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['finance_operator','platform_admin','support','auditor']::public.app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['finance_operator','platform_admin']::public.app_role[]));

CREATE POLICY "refunds_buyer_view" ON public.refunds
  FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), buyer_org_id));

CREATE POLICY "refunds_vendor_view" ON public.refunds
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.order_items oi
    WHERE oi.order_id = refunds.order_id
      AND public.is_org_member(auth.uid(), oi.vendor_id)
  ));

-- process_return_refund: finance posts a refund for an APPROVED return
CREATE OR REPLACE FUNCTION public.process_return_refund(
  _return_id UUID,
  _amount NUMERIC,
  _method public.payment_method,
  _reference TEXT DEFAULT NULL,
  _notes TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _uid UUID := auth.uid();
  _ret RECORD;
  _refund_id UUID;
  _qc RECORD;
  _vendor_id UUID;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT public.has_any_role(_uid, ARRAY['finance_operator','platform_admin']::public.app_role[]) THEN
    RAISE EXCEPTION 'Only finance can process refunds';
  END IF;
  IF _amount IS NULL OR _amount <= 0 THEN RAISE EXCEPTION 'Amount must be > 0'; END IF;

  SELECT * INTO _ret FROM public.return_requests WHERE id = _return_id FOR UPDATE;
  IF _ret.id IS NULL THEN RAISE EXCEPTION 'Return not found'; END IF;
  IF _ret.status <> 'APPROVED' THEN
    RAISE EXCEPTION 'Only APPROVED returns can be refunded (current: %)', _ret.status;
  END IF;

  INSERT INTO public.refunds(return_request_id, order_id, buyer_org_id, amount, method, reference, notes, recorded_by)
  VALUES (_return_id, _ret.order_id, _ret.buyer_org_id, _amount, _method, _reference, _notes, _uid)
  RETURNING id INTO _refund_id;

  UPDATE public.return_requests
    SET status = 'REFUNDED', resolution = COALESCE(_notes, 'refund posted'),
        resolved_at = now(), resolved_by = _uid, updated_at = now()
    WHERE id = _return_id;

  -- Auto SP1 warning when QC flagged vendor fault
  SELECT qi.vendor_fault, oi.vendor_id INTO _qc
    FROM public.qc_inspections qi
    JOIN public.return_requests rr ON rr.id = qi.return_request_id
    JOIN public.order_items oi ON oi.order_id = rr.order_id
    WHERE qi.return_request_id = _return_id
    ORDER BY qi.created_at DESC LIMIT 1;

  IF _qc.vendor_fault IS TRUE THEN
    SELECT oi.vendor_id INTO _vendor_id
      FROM public.order_items oi WHERE oi.order_id = _ret.order_id LIMIT 1;
    IF _vendor_id IS NOT NULL THEN
      BEGIN
        PERFORM public.issue_sp_warning(_vendor_id, 'SP1', 'Refund kesalahan vendor pada return ' || _ret.return_number, _ret.order_id);
      EXCEPTION WHEN OTHERS THEN NULL;
      END;
    END IF;
  END IF;

  INSERT INTO public.audit_events(action, entity_type, entity_id, organization_id, actor_user_id, to_state)
  VALUES ('return.refund','return_request', _return_id, _ret.buyer_org_id, _uid,
          jsonb_build_object('amount', _amount, 'method', _method, 'refund_id', _refund_id));

  RETURN _refund_id;
END $$;

-- close_return: non-monetary closure
CREATE OR REPLACE FUNCTION public.close_return(_return_id UUID, _resolution TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _uid UUID := auth.uid(); _ret RECORD;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT public.has_any_role(_uid, ARRAY['qc_officer','support','platform_admin','finance_operator']::public.app_role[]) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF _resolution IS NULL OR length(trim(_resolution)) < 3 THEN
    RAISE EXCEPTION 'Resolution note required';
  END IF;
  SELECT * INTO _ret FROM public.return_requests WHERE id = _return_id FOR UPDATE;
  IF _ret.id IS NULL THEN RAISE EXCEPTION 'Return not found'; END IF;
  IF _ret.status IN ('CLOSED','REFUNDED','CANCELLED') THEN
    RAISE EXCEPTION 'Return already finalized (%)', _ret.status;
  END IF;
  UPDATE public.return_requests
    SET status='CLOSED', resolution=_resolution, resolved_at=now(), resolved_by=_uid, updated_at=now()
    WHERE id=_return_id;
  INSERT INTO public.audit_events(action, entity_type, entity_id, organization_id, actor_user_id, to_state)
  VALUES ('return.close','return_request', _return_id, _ret.buyer_org_id, _uid,
          jsonb_build_object('resolution', _resolution));
END $$;

REVOKE EXECUTE ON FUNCTION public.process_return_refund(UUID, NUMERIC, public.payment_method, TEXT, TEXT) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.close_return(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.process_return_refund(UUID, NUMERIC, public.payment_method, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.close_return(UUID, TEXT) TO authenticated;