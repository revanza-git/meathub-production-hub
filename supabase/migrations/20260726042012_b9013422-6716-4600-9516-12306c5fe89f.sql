
-- Enums
CREATE TYPE public.invoice_status AS ENUM ('ISSUED','PARTIALLY_PAID','PAID','OVERDUE','VOID');
CREATE TYPE public.payment_method AS ENUM ('BANK_TRANSFER','VA','CASH','OTHER');
CREATE TYPE public.settlement_status AS ENUM ('DRAFT','APPROVED','PAID','CANCELLED');

-- Sequences
CREATE SEQUENCE IF NOT EXISTS public.invoice_no_seq START 1;
CREATE SEQUENCE IF NOT EXISTS public.settlement_no_seq START 1;

CREATE OR REPLACE FUNCTION public.next_invoice_no() RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _n BIGINT;
BEGIN
  _n := nextval('public.invoice_no_seq');
  RETURN 'INV-' || to_char(now(),'YYYYMM') || '-' || lpad(_n::text, 6, '0');
END $$;

CREATE OR REPLACE FUNCTION public.next_settlement_no() RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _n BIGINT;
BEGIN
  _n := nextval('public.settlement_no_seq');
  RETURN 'ST-' || to_char(now(),'YYYYMM') || '-' || lpad(_n::text, 6, '0');
END $$;

-- INVOICES
CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_no TEXT NOT NULL UNIQUE,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE RESTRICT,
  buyer_org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  subtotal NUMERIC(14,2) NOT NULL,
  shipping_fee NUMERIC(14,2) NOT NULL,
  tax_amount NUMERIC(14,2) NOT NULL,
  total_amount NUMERIC(14,2) NOT NULL,
  amount_paid NUMERIC(14,2) NOT NULL DEFAULT 0,
  status public.invoice_status NOT NULL DEFAULT 'ISSUED',
  due_date DATE NOT NULL,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  paid_at TIMESTAMPTZ,
  notes TEXT,
  issued_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX invoices_order_id_key ON public.invoices(order_id);
CREATE INDEX invoices_buyer_org_idx ON public.invoices(buyer_org_id);
CREATE INDEX invoices_status_idx ON public.invoices(status);

GRANT SELECT, INSERT, UPDATE ON public.invoices TO authenticated;
GRANT ALL ON public.invoices TO service_role;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "invoices_buyer_read" ON public.invoices FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), buyer_org_id));
CREATE POLICY "invoices_finance_read" ON public.invoices FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['finance_operator','platform_admin','auditor']::public.app_role[]));
CREATE POLICY "invoices_finance_write" ON public.invoices FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['finance_operator','platform_admin']::public.app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['finance_operator','platform_admin']::public.app_role[]));

CREATE TRIGGER trg_invoices_updated BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- PAYMENTS
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  method public.payment_method NOT NULL,
  reference TEXT,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  recorded_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX payments_invoice_idx ON public.payments(invoice_id);

GRANT SELECT, INSERT ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payments_buyer_read" ON public.payments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.invoices i
    WHERE i.id = invoice_id AND public.is_org_member(auth.uid(), i.buyer_org_id)));
CREATE POLICY "payments_finance_all" ON public.payments FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['finance_operator','platform_admin','auditor']::public.app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['finance_operator','platform_admin']::public.app_role[]));

-- SETTLEMENTS
CREATE TABLE public.settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  settlement_no TEXT NOT NULL UNIQUE,
  vendor_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  gross_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  commission_rate NUMERIC(5,4) NOT NULL DEFAULT 0.05,
  commission_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  net_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  status public.settlement_status NOT NULL DEFAULT 'DRAFT',
  scheduled_date DATE,
  paid_at TIMESTAMPTZ,
  payment_reference TEXT,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  paid_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX settlements_vendor_idx ON public.settlements(vendor_id);
CREATE INDEX settlements_status_idx ON public.settlements(status);

GRANT SELECT, INSERT, UPDATE ON public.settlements TO authenticated;
GRANT ALL ON public.settlements TO service_role;
ALTER TABLE public.settlements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "settlements_vendor_read" ON public.settlements FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), vendor_id));
CREATE POLICY "settlements_finance_all" ON public.settlements FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['finance_operator','platform_admin','auditor']::public.app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['finance_operator','platform_admin']::public.app_role[]));

CREATE TRIGGER trg_settlements_updated BEFORE UPDATE ON public.settlements
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- SETTLEMENT ITEMS
CREATE TABLE public.settlement_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  settlement_id UUID NOT NULL REFERENCES public.settlements(id) ON DELETE CASCADE,
  order_item_id UUID NOT NULL REFERENCES public.order_items(id) ON DELETE RESTRICT,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE RESTRICT,
  vendor_id UUID NOT NULL REFERENCES public.organizations(id),
  line_gross NUMERIC(14,2) NOT NULL,
  commission_amount NUMERIC(14,2) NOT NULL,
  line_net NUMERIC(14,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX settlement_items_order_item_key ON public.settlement_items(order_item_id);
CREATE INDEX settlement_items_settlement_idx ON public.settlement_items(settlement_id);

GRANT SELECT, INSERT ON public.settlement_items TO authenticated;
GRANT ALL ON public.settlement_items TO service_role;
ALTER TABLE public.settlement_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "settle_items_vendor_read" ON public.settlement_items FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), vendor_id));
CREATE POLICY "settle_items_finance_all" ON public.settlement_items FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['finance_operator','platform_admin','auditor']::public.app_role[]))
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['finance_operator','platform_admin']::public.app_role[]));

-- RPCs
CREATE OR REPLACE FUNCTION public.issue_invoice(_order_id UUID)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid UUID := auth.uid();
  _order RECORD;
  _existing UUID;
  _invoice_id UUID;
  _invoice_no TEXT;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT public.has_any_role(_uid, ARRAY['finance_operator','platform_admin']::public.app_role[]) THEN
    RAISE EXCEPTION 'Only finance can issue invoices';
  END IF;

  SELECT * INTO _order FROM public.orders WHERE id = _order_id FOR UPDATE;
  IF _order.id IS NULL THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF _order.status NOT IN ('DELIVERED','CLOSED') THEN
    RAISE EXCEPTION 'Invoice requires DELIVERED order (current: %)', _order.status;
  END IF;

  SELECT id INTO _existing FROM public.invoices WHERE order_id = _order_id;
  IF _existing IS NOT NULL THEN RETURN _existing; END IF;

  _invoice_no := public.next_invoice_no();

  INSERT INTO public.invoices(invoice_no, order_id, buyer_org_id, subtotal, shipping_fee, tax_amount, total_amount, due_date, issued_by)
  VALUES (_invoice_no, _order_id, _order.buyer_org_id, _order.subtotal, _order.shipping_fee, _order.tax_amount, _order.total_amount,
          (now() + interval '14 days')::date, _uid)
  RETURNING id INTO _invoice_id;

  INSERT INTO public.audit_events(action, entity_type, entity_id, organization_id, actor_user_id, to_state)
  VALUES ('invoice.issue','invoice', _invoice_id, _order.buyer_org_id, _uid,
          jsonb_build_object('invoice_no', _invoice_no, 'total', _order.total_amount));

  RETURN _invoice_id;
END $$;

CREATE OR REPLACE FUNCTION public.record_payment(_invoice_id UUID, _amount NUMERIC, _method public.payment_method, _reference TEXT DEFAULT NULL, _notes TEXT DEFAULT NULL)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid UUID := auth.uid();
  _inv RECORD;
  _pay_id UUID;
  _new_paid NUMERIC(14,2);
  _new_status public.invoice_status;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT public.has_any_role(_uid, ARRAY['finance_operator','platform_admin']::public.app_role[]) THEN
    RAISE EXCEPTION 'Only finance can record payments';
  END IF;
  IF _amount IS NULL OR _amount <= 0 THEN RAISE EXCEPTION 'Amount must be > 0'; END IF;

  SELECT * INTO _inv FROM public.invoices WHERE id = _invoice_id FOR UPDATE;
  IF _inv.id IS NULL THEN RAISE EXCEPTION 'Invoice not found'; END IF;
  IF _inv.status = 'VOID' THEN RAISE EXCEPTION 'Invoice is void'; END IF;

  INSERT INTO public.payments(invoice_id, amount, method, reference, recorded_by, notes)
  VALUES (_invoice_id, _amount, _method, _reference, _uid, _notes)
  RETURNING id INTO _pay_id;

  _new_paid := _inv.amount_paid + _amount;
  IF _new_paid >= _inv.total_amount THEN _new_status := 'PAID';
  ELSE _new_status := 'PARTIALLY_PAID';
  END IF;

  UPDATE public.invoices SET
    amount_paid = _new_paid,
    status = _new_status,
    paid_at = CASE WHEN _new_status='PAID' THEN now() ELSE paid_at END,
    updated_at = now()
  WHERE id = _invoice_id;

  INSERT INTO public.audit_events(action, entity_type, entity_id, organization_id, actor_user_id, to_state)
  VALUES ('invoice.payment','invoice', _invoice_id, _inv.buyer_org_id, _uid,
          jsonb_build_object('amount', _amount, 'status', _new_status));

  RETURN _pay_id;
END $$;

CREATE OR REPLACE FUNCTION public.generate_settlements(_period_end DATE DEFAULT NULL, _commission_rate NUMERIC DEFAULT 0.05)
RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid UUID := auth.uid();
  _end DATE := COALESCE(_period_end, CURRENT_DATE);
  _cutoff DATE := _end - INTERVAL '3 days';
  _vendor RECORD;
  _settlement_id UUID;
  _gross NUMERIC(14,2);
  _commission NUMERIC(14,2);
  _net NUMERIC(14,2);
  _period_start DATE;
  _count INT := 0;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT public.has_any_role(_uid, ARRAY['finance_operator','platform_admin']::public.app_role[]) THEN
    RAISE EXCEPTION 'Only finance can generate settlements';
  END IF;

  FOR _vendor IN
    SELECT DISTINCT oi.vendor_id
    FROM public.order_items oi
    JOIN public.orders o ON o.id = oi.order_id
    LEFT JOIN public.settlement_items si ON si.order_item_id = oi.id
    WHERE oi.vendor_status = 'CONFIRMED'
      AND o.status IN ('DELIVERED','CLOSED')
      AND o.updated_at::date <= _cutoff::date
      AND si.id IS NULL
  LOOP
    SELECT COALESCE(sum(oi.line_total),0),
           COALESCE(min(o.updated_at::date), _cutoff::date)
      INTO _gross, _period_start
      FROM public.order_items oi
      JOIN public.orders o ON o.id = oi.order_id
      LEFT JOIN public.settlement_items si ON si.order_item_id = oi.id
      WHERE oi.vendor_id = _vendor.vendor_id
        AND oi.vendor_status = 'CONFIRMED'
        AND o.status IN ('DELIVERED','CLOSED')
        AND o.updated_at::date <= _cutoff::date
        AND si.id IS NULL;

    IF _gross <= 0 THEN CONTINUE; END IF;

    _commission := round(_gross * _commission_rate, 2);
    _net := _gross - _commission;

    INSERT INTO public.settlements(settlement_no, vendor_id, period_start, period_end,
      gross_amount, commission_rate, commission_amount, net_amount, scheduled_date)
    VALUES (public.next_settlement_no(), _vendor.vendor_id, _period_start, _end,
      _gross, _commission_rate, _commission, _net, _end + INTERVAL '1 day')
    RETURNING id INTO _settlement_id;

    INSERT INTO public.settlement_items(settlement_id, order_item_id, order_id, vendor_id,
      line_gross, commission_amount, line_net)
    SELECT _settlement_id, oi.id, oi.order_id, oi.vendor_id,
           oi.line_total,
           round(oi.line_total * _commission_rate, 2),
           oi.line_total - round(oi.line_total * _commission_rate, 2)
    FROM public.order_items oi
    JOIN public.orders o ON o.id = oi.order_id
    LEFT JOIN public.settlement_items si ON si.order_item_id = oi.id
    WHERE oi.vendor_id = _vendor.vendor_id
      AND oi.vendor_status = 'CONFIRMED'
      AND o.status IN ('DELIVERED','CLOSED')
      AND o.updated_at::date <= _cutoff::date
      AND si.id IS NULL;

    INSERT INTO public.audit_events(action, entity_type, entity_id, organization_id, actor_user_id, to_state)
    VALUES ('settlement.create','settlement', _settlement_id, _vendor.vendor_id, _uid,
            jsonb_build_object('gross', _gross, 'net', _net));

    _count := _count + 1;
  END LOOP;

  RETURN _count;
END $$;

CREATE OR REPLACE FUNCTION public.approve_settlement(_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid UUID := auth.uid(); _s RECORD;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT public.has_any_role(_uid, ARRAY['finance_operator','platform_admin']::public.app_role[]) THEN
    RAISE EXCEPTION 'Only finance can approve';
  END IF;
  SELECT * INTO _s FROM public.settlements WHERE id = _id FOR UPDATE;
  IF _s.id IS NULL THEN RAISE EXCEPTION 'Not found'; END IF;
  IF _s.status <> 'DRAFT' THEN RAISE EXCEPTION 'Only DRAFT can be approved'; END IF;
  UPDATE public.settlements SET status='APPROVED', approved_by=_uid, approved_at=now() WHERE id=_id;
  INSERT INTO public.audit_events(action, entity_type, entity_id, organization_id, actor_user_id, to_state)
  VALUES ('settlement.approve','settlement', _id, _s.vendor_id, _uid, jsonb_build_object('status','APPROVED'));
END $$;

CREATE OR REPLACE FUNCTION public.mark_settlement_paid(_id UUID, _reference TEXT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid UUID := auth.uid(); _s RECORD;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT public.has_any_role(_uid, ARRAY['finance_operator','platform_admin']::public.app_role[]) THEN
    RAISE EXCEPTION 'Only finance can mark paid';
  END IF;
  IF _reference IS NULL OR length(trim(_reference)) < 3 THEN RAISE EXCEPTION 'Reference required'; END IF;
  SELECT * INTO _s FROM public.settlements WHERE id = _id FOR UPDATE;
  IF _s.id IS NULL THEN RAISE EXCEPTION 'Not found'; END IF;
  IF _s.status <> 'APPROVED' THEN RAISE EXCEPTION 'Only APPROVED can be paid'; END IF;
  UPDATE public.settlements SET status='PAID', paid_at=now(), paid_by=_uid, payment_reference=_reference WHERE id=_id;
  INSERT INTO public.audit_events(action, entity_type, entity_id, organization_id, actor_user_id, to_state)
  VALUES ('settlement.paid','settlement', _id, _s.vendor_id, _uid, jsonb_build_object('reference', _reference));
END $$;

REVOKE EXECUTE ON FUNCTION public.issue_invoice(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.record_payment(UUID, NUMERIC, public.payment_method, TEXT, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.generate_settlements(DATE, NUMERIC) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.approve_settlement(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.mark_settlement_paid(UUID, TEXT) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.issue_invoice(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_payment(UUID, NUMERIC, public.payment_method, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_settlements(DATE, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_settlement(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_settlement_paid(UUID, TEXT) TO authenticated;
