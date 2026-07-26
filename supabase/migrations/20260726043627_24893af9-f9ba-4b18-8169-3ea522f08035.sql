
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  entity_type TEXT,
  entity_id UUID,
  url TEXT,
  severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info','success','warning','critical')),
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (recipient_user_id IS NOT NULL OR recipient_org_id IS NOT NULL)
);

GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications_select_own" ON public.notifications FOR SELECT TO authenticated
USING (
  recipient_user_id = auth.uid()
  OR (recipient_org_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.organization_members m
    WHERE m.organization_id = recipient_org_id AND m.user_id = auth.uid()
  ))
  OR public.has_role(auth.uid(), 'platform_admin')
);

CREATE POLICY "notifications_mark_read" ON public.notifications FOR UPDATE TO authenticated
USING (
  recipient_user_id = auth.uid()
  OR (recipient_org_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.organization_members m
    WHERE m.organization_id = recipient_org_id AND m.user_id = auth.uid()
  ))
) WITH CHECK (true);

CREATE INDEX notifications_user_created_idx ON public.notifications(recipient_user_id, created_at DESC) WHERE recipient_user_id IS NOT NULL;
CREATE INDEX notifications_org_created_idx  ON public.notifications(recipient_org_id, created_at DESC) WHERE recipient_org_id IS NOT NULL;
CREATE INDEX notifications_unread_idx       ON public.notifications(created_at DESC) WHERE read_at IS NULL;

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

CREATE OR REPLACE FUNCTION public.notify(
  _user_id UUID, _org_id UUID, _kind TEXT, _title TEXT, _body TEXT,
  _entity_type TEXT, _entity_id UUID, _url TEXT, _severity TEXT DEFAULT 'info'
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF _user_id IS NULL AND _org_id IS NULL THEN RETURN; END IF;
  INSERT INTO public.notifications(recipient_user_id, recipient_org_id, kind, title, body, entity_type, entity_id, url, severity)
  VALUES (_user_id, _org_id, _kind, _title, _body, _entity_type, _entity_id, _url, _severity);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.notify(UUID, UUID, TEXT, TEXT, TEXT, TEXT, UUID, TEXT, TEXT) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.trg_notify_order() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _vendor_org UUID;
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.notify(NULL, NEW.buyer_org_id, 'ORDER_PLACED',
      'Pesanan ' || NEW.order_no || ' dibuat',
      'Menunggu konfirmasi vendor.', 'order', NEW.id,
      '/buyer/orders/' || NEW.id, 'info');
    FOR _vendor_org IN SELECT DISTINCT vendor_org_id FROM public.order_items WHERE order_id = NEW.id LOOP
      PERFORM public.notify(NULL, _vendor_org, 'ORDER_RECEIVED',
        'Pesanan baru ' || NEW.order_no,
        'Ada order menunggu konfirmasi Anda.', 'order', NEW.id,
        '/partner/vendor/orders', 'info');
    END LOOP;
  ELSIF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    PERFORM public.notify(NULL, NEW.buyer_org_id, 'ORDER_STATUS',
      'Pesanan ' || NEW.order_no || ' → ' || NEW.status::text,
      NULL, 'order', NEW.id, '/buyer/orders/' || NEW.id,
      CASE WHEN NEW.status::text IN ('CANCELLED','REJECTED') THEN 'warning' ELSE 'info' END);
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER notify_orders AFTER INSERT OR UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.trg_notify_order();

CREATE OR REPLACE FUNCTION public.trg_notify_order_item() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _order_no TEXT; _buyer_org UUID;
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    SELECT order_no, buyer_org_id INTO _order_no, _buyer_org FROM public.orders WHERE id = NEW.order_id;
    PERFORM public.notify(NULL, NEW.vendor_org_id, 'ORDER_ITEM_STATUS',
      'Item pesanan ' || _order_no || ' → ' || NEW.status::text,
      NULL, 'order_item', NEW.id, '/partner/vendor/orders', 'info');
    PERFORM public.notify(NULL, _buyer_org, 'ORDER_ITEM_STATUS',
      'Item pesanan ' || _order_no || ' → ' || NEW.status::text,
      NULL, 'order_item', NEW.id, '/buyer/orders/' || NEW.order_id, 'info');
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER notify_order_items AFTER UPDATE ON public.order_items
FOR EACH ROW EXECUTE FUNCTION public.trg_notify_order_item();

CREATE OR REPLACE FUNCTION public.trg_notify_delivery() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _order_no TEXT; _buyer_org UUID; _order_id UUID;
BEGIN
  IF TG_OP = 'INSERT' OR NEW.status IS DISTINCT FROM OLD.status THEN
    SELECT o.id, o.order_no, o.buyer_org_id INTO _order_id, _order_no, _buyer_org
    FROM public.orders o JOIN public.fulfillments f ON f.order_id = o.id
    WHERE f.id = NEW.fulfillment_id;
    PERFORM public.notify(NULL, _buyer_org, 'DELIVERY_STATUS',
      'Pengiriman ' || _order_no || ' → ' || NEW.status::text,
      NULL, 'delivery_job', NEW.id, '/buyer/orders/' || _order_id,
      CASE WHEN NEW.status::text = 'DELIVERED' THEN 'success'
           WHEN NEW.status::text IN ('FAILED','EXCEPTION') THEN 'warning' ELSE 'info' END);
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER notify_delivery_jobs AFTER INSERT OR UPDATE ON public.delivery_jobs
FOR EACH ROW EXECUTE FUNCTION public.trg_notify_delivery();

CREATE OR REPLACE FUNCTION public.trg_notify_invoice() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _order_no TEXT;
BEGIN
  SELECT order_no INTO _order_no FROM public.orders WHERE id = NEW.order_id;
  IF TG_OP = 'INSERT' THEN
    PERFORM public.notify(NULL, NEW.buyer_org_id, 'INVOICE_ISSUED',
      'Invoice diterbitkan untuk ' || _order_no,
      'Jatuh tempo ' || NEW.due_date::text, 'invoice', NEW.id,
      '/buyer/orders/' || NEW.order_id, 'info');
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    PERFORM public.notify(NULL, NEW.buyer_org_id, 'INVOICE_STATUS',
      'Invoice ' || _order_no || ' → ' || NEW.status::text,
      NULL, 'invoice', NEW.id, '/buyer/orders/' || NEW.order_id,
      CASE WHEN NEW.status::text = 'PAID' THEN 'success' ELSE 'info' END);
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER notify_invoices AFTER INSERT OR UPDATE ON public.invoices
FOR EACH ROW EXECUTE FUNCTION public.trg_notify_invoice();

CREATE OR REPLACE FUNCTION public.trg_notify_settlement() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.notify(NULL, NEW.vendor_org_id, 'SETTLEMENT_CREATED',
      'Settlement baru dibuat', NULL, 'settlement', NEW.id,
      '/partner/vendor/payouts', 'info');
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    PERFORM public.notify(NULL, NEW.vendor_org_id, 'SETTLEMENT_STATUS',
      'Settlement → ' || NEW.status::text, NULL, 'settlement', NEW.id,
      '/partner/vendor/payouts',
      CASE WHEN NEW.status::text = 'PAID' THEN 'success' ELSE 'info' END);
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER notify_settlements AFTER INSERT OR UPDATE ON public.settlements
FOR EACH ROW EXECUTE FUNCTION public.trg_notify_settlement();

CREATE OR REPLACE FUNCTION public.trg_notify_sp() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.notify(NULL, NEW.vendor_org_id, 'SP_WARNING',
    'Peringatan ' || NEW.severity::text || ' diterbitkan',
    NEW.reason, 'sp_warning', NEW.id, '/partner/vendor/reliability',
    CASE WHEN NEW.severity::text IN ('SP4','SP5') THEN 'critical' ELSE 'warning' END);
  RETURN NEW;
END; $$;
CREATE TRIGGER notify_sp_warnings AFTER INSERT ON public.sp_warnings
FOR EACH ROW EXECUTE FUNCTION public.trg_notify_sp();

CREATE OR REPLACE FUNCTION public.trg_notify_return() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.notify(NULL, NEW.buyer_org_id, 'RETURN_CREATED',
      'Permintaan retur ' || NEW.return_number || ' dibuat',
      NULL, 'return_request', NEW.id, '/buyer/orders/' || NEW.order_id, 'info');
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    PERFORM public.notify(NULL, NEW.buyer_org_id, 'RETURN_STATUS',
      'Retur ' || NEW.return_number || ' → ' || NEW.status::text,
      NULL, 'return_request', NEW.id, '/buyer/orders/' || NEW.order_id,
      CASE WHEN NEW.status::text = 'REJECTED' THEN 'warning'
           WHEN NEW.status::text IN ('REFUNDED','APPROVED') THEN 'success' ELSE 'info' END);
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER notify_return_requests AFTER INSERT OR UPDATE ON public.return_requests
FOR EACH ROW EXECUTE FUNCTION public.trg_notify_return();

CREATE OR REPLACE FUNCTION public.trg_notify_refund() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.notify(NULL, NEW.buyer_org_id, 'REFUND_RECORDED',
    'Refund dicatat: Rp ' || NEW.amount::text,
    NEW.method, 'refund', NEW.id, '/buyer/orders/' || NEW.order_id, 'success');
  RETURN NEW;
END; $$;
CREATE TRIGGER notify_refunds AFTER INSERT ON public.refunds
FOR EACH ROW EXECUTE FUNCTION public.trg_notify_refund();

CREATE OR REPLACE FUNCTION public.mark_notification_read(_id UUID)
RETURNS VOID LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.notifications SET read_at = now()
  WHERE id = _id AND read_at IS NULL AND (
    recipient_user_id = auth.uid()
    OR (recipient_org_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.organization_members m
      WHERE m.organization_id = recipient_org_id AND m.user_id = auth.uid()
    ))
  );
$$;

CREATE OR REPLACE FUNCTION public.mark_all_notifications_read()
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _n INTEGER;
BEGIN
  WITH upd AS (
    UPDATE public.notifications SET read_at = now()
    WHERE read_at IS NULL AND (
      recipient_user_id = auth.uid()
      OR (recipient_org_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.organization_members m
        WHERE m.organization_id = recipient_org_id AND m.user_id = auth.uid()
      ))
    ) RETURNING 1
  ) SELECT count(*) INTO _n FROM upd;
  RETURN _n;
END; $$;

GRANT EXECUTE ON FUNCTION public.mark_notification_read(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_all_notifications_read() TO authenticated;
