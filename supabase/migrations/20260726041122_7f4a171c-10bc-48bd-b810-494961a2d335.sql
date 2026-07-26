
-- ============ ENUMS ============
CREATE TYPE public.fulfillment_status AS ENUM (
  'AWAITING_VENDOR_DISPATCH','AWAITING_HUB_INBOUND','HUB_RECEIVED',
  'READY_FOR_DISPATCH','OUT_FOR_DELIVERY','DELIVERED','EXCEPTION','CANCELLED'
);
CREATE TYPE public.delivery_status AS ENUM (
  'PENDING_ASSIGNMENT','ASSIGNED','STARTED','OUT_FOR_DELIVERY','DELIVERED','FAILED','CANCELLED'
);
CREATE TYPE public.return_status AS ENUM (
  'REQUESTED','RECEIVED_AT_HUB','QC_IN_REVIEW','APPROVED','REJECTED','REFUNDED','CANCELLED'
);
CREATE TYPE public.qc_decision AS ENUM ('APPROVED','REJECTED','NEEDS_EVIDENCE');
CREATE TYPE public.packaging_condition AS ENUM ('GOOD','MINOR_DAMAGE','MAJOR_DAMAGE','TEMPERATURE_BREACH');

-- ============ FULFILLMENTS ============
CREATE TABLE public.fulfillments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE CASCADE,
  buyer_org_id UUID NOT NULL REFERENCES public.organizations(id),
  delivery_address_id UUID NOT NULL REFERENCES public.addresses(id),
  status public.fulfillment_status NOT NULL DEFAULT 'AWAITING_VENDOR_DISPATCH',
  hub_deadline_at TIMESTAMPTZ,
  version BIGINT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_fulfillments_status ON public.fulfillments(status);
CREATE INDEX idx_fulfillments_buyer ON public.fulfillments(buyer_org_id);

GRANT SELECT, INSERT, UPDATE ON public.fulfillments TO authenticated;
GRANT ALL ON public.fulfillments TO service_role;
ALTER TABLE public.fulfillments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "buyer sees own fulfillments" ON public.fulfillments FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), buyer_org_id) OR public.is_internal(auth.uid())
    OR EXISTS (SELECT 1 FROM public.order_items oi
      WHERE oi.order_id = fulfillments.order_id
        AND public.is_org_member(auth.uid(), oi.vendor_id)));

CREATE TRIGGER trg_fulfillments_updated BEFORE UPDATE ON public.fulfillments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ HUB RECEIPTS ============
CREATE TABLE public.hub_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fulfillment_id UUID NOT NULL REFERENCES public.fulfillments(id) ON DELETE CASCADE,
  received_by UUID NOT NULL REFERENCES auth.users(id),
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  received_weight_kg NUMERIC(10,3) NOT NULL,
  temperature_c NUMERIC(5,2),
  packaging_condition public.packaging_condition NOT NULL,
  lot_expiry_json JSONB,
  notes TEXT,
  evidence_object_keys JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_hub_receipts_fulfillment ON public.hub_receipts(fulfillment_id);
GRANT SELECT, INSERT ON public.hub_receipts TO authenticated;
GRANT ALL ON public.hub_receipts TO service_role;
ALTER TABLE public.hub_receipts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hub receipts visibility" ON public.hub_receipts FOR SELECT TO authenticated
  USING (public.is_internal(auth.uid())
    OR EXISTS (SELECT 1 FROM public.fulfillments f WHERE f.id = hub_receipts.fulfillment_id
      AND (public.is_org_member(auth.uid(), f.buyer_org_id)
        OR EXISTS (SELECT 1 FROM public.order_items oi WHERE oi.order_id = f.order_id
          AND public.is_org_member(auth.uid(), oi.vendor_id)))));

-- ============ DELIVERY JOBS ============
CREATE TABLE public.delivery_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fulfillment_id UUID NOT NULL REFERENCES public.fulfillments(id) ON DELETE CASCADE,
  queue_number VARCHAR(20) NOT NULL UNIQUE,
  courier_user_id UUID REFERENCES auth.users(id),
  vehicle_label VARCHAR(50),
  status public.delivery_status NOT NULL DEFAULT 'PENDING_ASSIGNMENT',
  scheduled_date DATE NOT NULL,
  started_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  last_tracking_at TIMESTAMPTZ,
  proof_json JSONB,
  notes TEXT,
  version BIGINT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX uniq_delivery_active_per_fulfillment ON public.delivery_jobs(fulfillment_id)
  WHERE status NOT IN ('DELIVERED','CANCELLED','FAILED');
CREATE INDEX idx_delivery_courier ON public.delivery_jobs(courier_user_id);
CREATE INDEX idx_delivery_status ON public.delivery_jobs(status);

GRANT SELECT, INSERT, UPDATE ON public.delivery_jobs TO authenticated;
GRANT ALL ON public.delivery_jobs TO service_role;
ALTER TABLE public.delivery_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "delivery jobs visibility" ON public.delivery_jobs FOR SELECT TO authenticated
  USING (public.is_internal(auth.uid())
    OR courier_user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.fulfillments f WHERE f.id = delivery_jobs.fulfillment_id
      AND public.is_org_member(auth.uid(), f.buyer_org_id)));

CREATE TRIGGER trg_delivery_jobs_updated BEFORE UPDATE ON public.delivery_jobs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ TRACKING POINTS ============
CREATE TABLE public.delivery_tracking_points (
  id BIGSERIAL PRIMARY KEY,
  delivery_job_id UUID NOT NULL REFERENCES public.delivery_jobs(id) ON DELETE CASCADE,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  latitude NUMERIC(10,7) NOT NULL,
  longitude NUMERIC(10,7) NOT NULL,
  accuracy_m NUMERIC(6,2),
  speed_mps NUMERIC(6,2)
);
CREATE INDEX idx_tracking_job_time ON public.delivery_tracking_points(delivery_job_id, recorded_at DESC);
GRANT SELECT, INSERT ON public.delivery_tracking_points TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.delivery_tracking_points_id_seq TO authenticated;
GRANT ALL ON public.delivery_tracking_points TO service_role;
ALTER TABLE public.delivery_tracking_points ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tracking visibility" ON public.delivery_tracking_points FOR SELECT TO authenticated
  USING (public.is_internal(auth.uid())
    OR EXISTS (SELECT 1 FROM public.delivery_jobs dj WHERE dj.id = delivery_tracking_points.delivery_job_id
      AND (dj.courier_user_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.fulfillments f WHERE f.id = dj.fulfillment_id
          AND public.is_org_member(auth.uid(), f.buyer_org_id)))));

-- ============ RETURN REQUESTS ============
CREATE TABLE public.return_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  return_number VARCHAR(32) NOT NULL UNIQUE,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  buyer_org_id UUID NOT NULL REFERENCES public.organizations(id),
  requested_by UUID NOT NULL REFERENCES auth.users(id),
  status public.return_status NOT NULL DEFAULT 'REQUESTED',
  reason_code VARCHAR(50) NOT NULL,
  description TEXT,
  evidence_object_keys JSONB DEFAULT '[]'::jsonb,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  eligibility_deadline TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_returns_order ON public.return_requests(order_id);
CREATE INDEX idx_returns_status ON public.return_requests(status);
GRANT SELECT, INSERT, UPDATE ON public.return_requests TO authenticated;
GRANT ALL ON public.return_requests TO service_role;
ALTER TABLE public.return_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "return visibility" ON public.return_requests FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), buyer_org_id) OR public.is_internal(auth.uid())
    OR EXISTS (SELECT 1 FROM public.order_items oi WHERE oi.order_id = return_requests.order_id
      AND public.is_org_member(auth.uid(), oi.vendor_id)));
CREATE TRIGGER trg_returns_updated BEFORE UPDATE ON public.return_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ QC INSPECTIONS ============
CREATE TABLE public.qc_inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  return_request_id UUID NOT NULL REFERENCES public.return_requests(id) ON DELETE CASCADE,
  decision public.qc_decision NOT NULL,
  checklist_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  packaging_condition public.packaging_condition,
  vendor_fault BOOLEAN,
  inspected_by UUID NOT NULL REFERENCES auth.users(id),
  inspected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT,
  evidence_object_keys JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_qc_return ON public.qc_inspections(return_request_id);
GRANT SELECT, INSERT ON public.qc_inspections TO authenticated;
GRANT ALL ON public.qc_inspections TO service_role;
ALTER TABLE public.qc_inspections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "qc visibility" ON public.qc_inspections FOR SELECT TO authenticated
  USING (public.is_internal(auth.uid())
    OR EXISTS (SELECT 1 FROM public.return_requests r WHERE r.id = qc_inspections.return_request_id
      AND (public.is_org_member(auth.uid(), r.buyer_org_id)
        OR EXISTS (SELECT 1 FROM public.order_items oi WHERE oi.order_id = r.order_id
          AND public.is_org_member(auth.uid(), oi.vendor_id)))));

-- ============ QUEUE / RETURN NUMBERING ============
CREATE OR REPLACE FUNCTION public.next_queue_no(_date DATE)
RETURNS VARCHAR LANGUAGE plpgsql SET search_path = public AS $$
DECLARE _n INT;
BEGIN
  SELECT COUNT(*)+1 INTO _n FROM public.delivery_jobs WHERE scheduled_date = _date;
  RETURN 'DLV-' || to_char(_date,'YYYYMMDD') || '-' || lpad(_n::text, 4, '0');
END $$;

CREATE OR REPLACE FUNCTION public.next_return_no()
RETURNS VARCHAR LANGUAGE plpgsql SET search_path = public AS $$
DECLARE _n INT;
BEGIN
  SELECT COUNT(*)+1 INTO _n FROM public.return_requests
    WHERE requested_at::date = current_date;
  RETURN 'RET-' || to_char(current_date,'YYYYMMDD') || '-' || lpad(_n::text, 4, '0');
END $$;

-- ============ AUTO-CREATE FULFILLMENT ============
CREATE OR REPLACE FUNCTION public._create_fulfillment_on_confirm()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status IN ('CONFIRMED','PARTIALLY_CONFIRMED')
     AND (OLD.status IS DISTINCT FROM NEW.status)
     AND NOT EXISTS (SELECT 1 FROM public.fulfillments WHERE order_id = NEW.id) THEN
    INSERT INTO public.fulfillments(order_id, buyer_org_id, delivery_address_id, hub_deadline_at)
    VALUES (NEW.id, NEW.buyer_org_id, NEW.delivery_address_id, now() + INTERVAL '24 hours');

    UPDATE public.orders SET status = 'FULFILLING', updated_at = now() WHERE id = NEW.id;

    INSERT INTO public.order_state_history(order_id, from_state, to_state, actor_user_id, reason)
    VALUES (NEW.id, NEW.status, 'FULFILLING', NULL, 'auto: fulfillment created');
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_orders_create_fulfillment
  AFTER UPDATE OF status ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public._create_fulfillment_on_confirm();

-- ============ FLOW RPCs ============
CREATE OR REPLACE FUNCTION public.vendor_dispatch_to_hub(_fulfillment_id UUID, _notes TEXT DEFAULT NULL)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid UUID := auth.uid(); _order UUID; _current fulfillment_status;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT order_id, status INTO _order, _current FROM public.fulfillments WHERE id = _fulfillment_id FOR UPDATE;
  IF _order IS NULL THEN RAISE EXCEPTION 'Fulfillment not found'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.order_items oi
    WHERE oi.order_id = _order AND public.is_org_member(_uid, oi.vendor_id)
      AND public.has_any_role(_uid, ARRAY['vendor_admin','vendor_operator']::app_role[])) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF _current <> 'AWAITING_VENDOR_DISPATCH' THEN
    RAISE EXCEPTION 'Invalid state: %', _current;
  END IF;
  UPDATE public.fulfillments SET status = 'AWAITING_HUB_INBOUND', version = version+1 WHERE id = _fulfillment_id;
  INSERT INTO public.audit_events(action, entity_type, entity_id, organization_id, actor_user_id, to_state, reason)
  VALUES ('fulfillment.dispatch','fulfillment', _fulfillment_id, NULL, _uid,
    jsonb_build_object('status','AWAITING_HUB_INBOUND'), _notes);
END $$;

CREATE OR REPLACE FUNCTION public.hub_receive(
  _fulfillment_id UUID, _weight NUMERIC, _temperature NUMERIC,
  _packaging packaging_condition, _notes TEXT DEFAULT NULL,
  _evidence JSONB DEFAULT '[]'::jsonb, _lot_expiry JSONB DEFAULT NULL
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid UUID := auth.uid(); _rid UUID; _current fulfillment_status;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT public.has_any_role(_uid, ARRAY['hub_operator','platform_admin']::app_role[]) THEN
    RAISE EXCEPTION 'Only hub operators can receive';
  END IF;
  SELECT status INTO _current FROM public.fulfillments WHERE id = _fulfillment_id FOR UPDATE;
  IF _current IS NULL THEN RAISE EXCEPTION 'Fulfillment not found'; END IF;
  IF _current NOT IN ('AWAITING_HUB_INBOUND','AWAITING_VENDOR_DISPATCH') THEN
    RAISE EXCEPTION 'Invalid state: %', _current;
  END IF;
  IF _weight IS NULL OR _weight <= 0 THEN RAISE EXCEPTION 'Weight required'; END IF;

  INSERT INTO public.hub_receipts(fulfillment_id, received_by, received_weight_kg,
    temperature_c, packaging_condition, lot_expiry_json, notes, evidence_object_keys)
  VALUES (_fulfillment_id, _uid, _weight, _temperature, _packaging, _lot_expiry, _notes, _evidence)
  RETURNING id INTO _rid;

  UPDATE public.fulfillments SET
    status = CASE WHEN _packaging IN ('MAJOR_DAMAGE','TEMPERATURE_BREACH') THEN 'EXCEPTION'::fulfillment_status
                  ELSE 'READY_FOR_DISPATCH'::fulfillment_status END,
    version = version+1
    WHERE id = _fulfillment_id;

  INSERT INTO public.audit_events(action, entity_type, entity_id, actor_user_id, to_state)
  VALUES ('hub.receive','fulfillment', _fulfillment_id, _uid,
    jsonb_build_object('weight',_weight,'packaging',_packaging));
  RETURN _rid;
END $$;

CREATE OR REPLACE FUNCTION public.create_delivery_job(_fulfillment_id UUID, _scheduled DATE)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid UUID := auth.uid(); _jid UUID; _qn VARCHAR; _current fulfillment_status;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT public.has_any_role(_uid, ARRAY['hub_operator','platform_admin','support']::app_role[]) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  SELECT status INTO _current FROM public.fulfillments WHERE id = _fulfillment_id FOR UPDATE;
  IF _current <> 'READY_FOR_DISPATCH' THEN RAISE EXCEPTION 'Fulfillment not ready: %', _current; END IF;

  _qn := public.next_queue_no(_scheduled);
  INSERT INTO public.delivery_jobs(fulfillment_id, queue_number, scheduled_date)
  VALUES (_fulfillment_id, _qn, _scheduled) RETURNING id INTO _jid;
  INSERT INTO public.audit_events(action, entity_type, entity_id, actor_user_id, to_state)
  VALUES ('delivery.create','delivery_job', _jid, _uid, jsonb_build_object('queue_number',_qn));
  RETURN _jid;
END $$;

CREATE OR REPLACE FUNCTION public.assign_courier(_job_id UUID, _courier UUID, _vehicle VARCHAR DEFAULT NULL)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid UUID := auth.uid();
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT public.has_any_role(_uid, ARRAY['hub_operator','platform_admin','support']::app_role[]) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF NOT public.has_role(_courier, 'courier'::app_role) THEN
    RAISE EXCEPTION 'Target user is not a courier';
  END IF;
  UPDATE public.delivery_jobs SET courier_user_id = _courier, vehicle_label = _vehicle,
    status = 'ASSIGNED', version = version+1
    WHERE id = _job_id AND status IN ('PENDING_ASSIGNMENT','ASSIGNED');
  IF NOT FOUND THEN RAISE EXCEPTION 'Delivery job not assignable'; END IF;
  INSERT INTO public.audit_events(action, entity_type, entity_id, actor_user_id, to_state)
  VALUES ('delivery.assign','delivery_job', _job_id, _uid,
    jsonb_build_object('courier',_courier,'vehicle',_vehicle));
END $$;

CREATE OR REPLACE FUNCTION public.courier_start_delivery(_job_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid UUID := auth.uid(); _f UUID;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  UPDATE public.delivery_jobs SET status = 'OUT_FOR_DELIVERY', started_at = now(), version=version+1
    WHERE id = _job_id AND courier_user_id = _uid AND status = 'ASSIGNED'
    RETURNING fulfillment_id INTO _f;
  IF _f IS NULL THEN RAISE EXCEPTION 'Cannot start this job'; END IF;
  UPDATE public.fulfillments SET status = 'OUT_FOR_DELIVERY', version=version+1 WHERE id = _f;
  INSERT INTO public.audit_events(action, entity_type, entity_id, actor_user_id)
  VALUES ('delivery.start','delivery_job', _job_id, _uid);
END $$;

CREATE OR REPLACE FUNCTION public.courier_post_location(
  _job_id UUID, _lat NUMERIC, _lng NUMERIC, _accuracy NUMERIC DEFAULT NULL, _speed NUMERIC DEFAULT NULL
) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid UUID := auth.uid();
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.delivery_jobs WHERE id = _job_id
    AND courier_user_id = _uid AND status = 'OUT_FOR_DELIVERY') THEN
    RAISE EXCEPTION 'Not authorized or job not active';
  END IF;
  INSERT INTO public.delivery_tracking_points(delivery_job_id, latitude, longitude, accuracy_m, speed_mps)
  VALUES (_job_id, _lat, _lng, _accuracy, _speed);
  UPDATE public.delivery_jobs SET last_tracking_at = now() WHERE id = _job_id;
END $$;

CREATE OR REPLACE FUNCTION public.courier_complete_delivery(_job_id UUID, _proof JSONB)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid UUID := auth.uid(); _f UUID; _order UUID;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _proof IS NULL OR NOT (_proof ? 'recipient_name') THEN
    RAISE EXCEPTION 'Proof must include recipient_name';
  END IF;
  UPDATE public.delivery_jobs SET status='DELIVERED', delivered_at=now(), proof_json=_proof, version=version+1
    WHERE id = _job_id AND courier_user_id = _uid AND status = 'OUT_FOR_DELIVERY'
    RETURNING fulfillment_id INTO _f;
  IF _f IS NULL THEN RAISE EXCEPTION 'Cannot complete this job'; END IF;
  UPDATE public.fulfillments SET status='DELIVERED', version=version+1 WHERE id = _f
    RETURNING order_id INTO _order;
  UPDATE public.orders SET status='DELIVERED', updated_at=now() WHERE id = _order;
  INSERT INTO public.order_state_history(order_id, from_state, to_state, actor_user_id, reason)
  VALUES (_order, 'FULFILLING', 'DELIVERED', _uid, 'delivery completed');
  INSERT INTO public.audit_events(action, entity_type, entity_id, actor_user_id, to_state)
  VALUES ('delivery.complete','delivery_job', _job_id, _uid, _proof);
END $$;

CREATE OR REPLACE FUNCTION public.request_return(
  _order_id UUID, _reason VARCHAR, _description TEXT DEFAULT NULL, _evidence JSONB DEFAULT '[]'::jsonb
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid UUID := auth.uid(); _buyer UUID; _delivered TIMESTAMPTZ; _rid UUID; _window_hours INT := 2;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT o.buyer_org_id, dj.delivered_at INTO _buyer, _delivered
    FROM public.orders o
    JOIN public.fulfillments f ON f.order_id = o.id
    JOIN public.delivery_jobs dj ON dj.fulfillment_id = f.id
    WHERE o.id = _order_id AND dj.status = 'DELIVERED';
  IF _buyer IS NULL THEN RAISE EXCEPTION 'Order not eligible (not delivered)'; END IF;
  IF NOT public.is_org_member(_uid, _buyer) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF _delivered + (_window_hours || ' hours')::interval < now() THEN
    RAISE EXCEPTION 'Return window (% hours) has expired', _window_hours;
  END IF;
  IF EXISTS (SELECT 1 FROM public.return_requests WHERE order_id = _order_id
    AND status NOT IN ('REJECTED','CANCELLED')) THEN
    RAISE EXCEPTION 'Active return already exists';
  END IF;
  INSERT INTO public.return_requests(return_number, order_id, buyer_org_id, requested_by,
    reason_code, description, evidence_object_keys, eligibility_deadline)
  VALUES (public.next_return_no(), _order_id, _buyer, _uid, _reason, _description, _evidence,
    _delivered + (_window_hours || ' hours')::interval)
  RETURNING id INTO _rid;
  INSERT INTO public.audit_events(action, entity_type, entity_id, organization_id, actor_user_id)
  VALUES ('return.request','return_request', _rid, _buyer, _uid);
  RETURN _rid;
END $$;

CREATE OR REPLACE FUNCTION public.qc_decide(
  _return_id UUID, _decision qc_decision, _checklist JSONB DEFAULT '{}'::jsonb,
  _packaging packaging_condition DEFAULT NULL, _vendor_fault BOOLEAN DEFAULT NULL,
  _notes TEXT DEFAULT NULL, _evidence JSONB DEFAULT '[]'::jsonb
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid UUID := auth.uid(); _qcid UUID; _next return_status;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT public.has_any_role(_uid, ARRAY['qc_officer','platform_admin']::app_role[]) THEN
    RAISE EXCEPTION 'Only QC officers can decide';
  END IF;
  INSERT INTO public.qc_inspections(return_request_id, decision, checklist_json,
    packaging_condition, vendor_fault, inspected_by, notes, evidence_object_keys)
  VALUES (_return_id, _decision, _checklist, _packaging, _vendor_fault, _uid, _notes, _evidence)
  RETURNING id INTO _qcid;
  _next := CASE _decision
    WHEN 'APPROVED' THEN 'APPROVED'::return_status
    WHEN 'REJECTED' THEN 'REJECTED'::return_status
    ELSE 'QC_IN_REVIEW'::return_status END;
  UPDATE public.return_requests SET status = _next WHERE id = _return_id;
  INSERT INTO public.audit_events(action, entity_type, entity_id, actor_user_id, to_state)
  VALUES ('return.qc_decide','return_request', _return_id, _uid,
    jsonb_build_object('decision',_decision,'vendor_fault',_vendor_fault));
  RETURN _qcid;
END $$;

-- Revoke unsafe defaults
REVOKE EXECUTE ON FUNCTION public._create_fulfillment_on_confirm() FROM public;
