ALTER TABLE public.storefront_orders
  ADD COLUMN IF NOT EXISTS courier_name text,
  ADD COLUMN IF NOT EXISTS tracking_no text,
  ADD COLUMN IF NOT EXISTS eta_date date,
  ADD COLUMN IF NOT EXISTS shipped_at timestamptz,
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz,
  ADD COLUMN IF NOT EXISTS buyer_confirmed_at timestamptz;

-- Admin: set logistics details
CREATE OR REPLACE FUNCTION public.ml_set_store_delivery(
  _order_id uuid,
  _courier text DEFAULT NULL,
  _tracking_no text DEFAULT NULL,
  _eta date DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.ml_has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  UPDATE public.storefront_orders
     SET courier_name = coalesce(nullif(btrim(coalesce(_courier,'')),''), courier_name),
         tracking_no  = coalesce(nullif(btrim(coalesce(_tracking_no,'')),''), tracking_no),
         eta_date     = coalesce(_eta, eta_date),
         updated_at   = now()
   WHERE id = _order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.ml_set_store_delivery(uuid, text, text, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ml_set_store_delivery(uuid, text, text, date) TO authenticated;

-- Stamp shipped/delivered timestamps on status change
CREATE OR REPLACE FUNCTION public.ml_update_store_order(
  _order_id uuid,
  _status public.ml_store_order_status,
  _payment_ref text DEFAULT NULL,
  _note text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _old public.storefront_orders%ROWTYPE;
BEGIN
  IF NOT public.ml_has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  SELECT * INTO _old FROM public.storefront_orders WHERE id = _order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  UPDATE public.storefront_orders
     SET status = _status,
         payment_ref = coalesce(nullif(btrim(coalesce(_payment_ref,'')),''), payment_ref),
         admin_note = coalesce(nullif(btrim(coalesce(_note,'')),''), admin_note),
         shipped_at = CASE WHEN _status = 'SHIPPED' AND shipped_at IS NULL THEN now() ELSE shipped_at END,
         delivered_at = CASE WHEN _status = 'COMPLETED' AND delivered_at IS NULL THEN now() ELSE delivered_at END,
         updated_at = now()
   WHERE id = _order_id;

  IF _status IN ('SHIPPED','COMPLETED') AND _old.stock_deducted_at IS NULL THEN
    UPDATE public.admin_inventory ai
       SET qty_on_hand_kg = greatest(coalesce(ai.qty_on_hand_kg,0) - i.qty_kg, 0),
           updated_at = now()
      FROM (
        SELECT inventory_id, sum(qty_kg) AS qty_kg
          FROM public.storefront_order_items
         WHERE order_id = _order_id AND inventory_id IS NOT NULL
         GROUP BY inventory_id
      ) i
     WHERE ai.id = i.inventory_id;

    UPDATE public.storefront_orders SET stock_deducted_at = now() WHERE id = _order_id;
  END IF;

  INSERT INTO public.storefront_order_events (order_id, from_status, to_status, note, actor_id)
  VALUES (_order_id, _old.status, _status, nullif(btrim(coalesce(_note,'')),''), auth.uid());
END;
$$;

-- Buyer confirms receipt using the tracking link
CREATE OR REPLACE FUNCTION public.ml_confirm_store_receipt(_order_no text, _token text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _o public.storefront_orders%ROWTYPE;
BEGIN
  SELECT * INTO _o FROM public.storefront_orders
   WHERE order_no = _order_no AND access_token = _token FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF _o.status <> 'SHIPPED' THEN RAISE EXCEPTION 'Order is not in transit'; END IF;

  UPDATE public.storefront_orders
     SET status = 'COMPLETED',
         delivered_at = coalesce(delivered_at, now()),
         buyer_confirmed_at = now(),
         updated_at = now()
   WHERE id = _o.id;

  INSERT INTO public.storefront_order_events (order_id, from_status, to_status, note)
  VALUES (_o.id, _o.status, 'COMPLETED', 'Dikonfirmasi diterima oleh pembeli');
END;
$$;

REVOKE EXECUTE ON FUNCTION public.ml_confirm_store_receipt(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ml_confirm_store_receipt(text, text) TO anon, authenticated;

-- Tracking payload now includes logistics + timeline
CREATE OR REPLACE FUNCTION public.ml_track_order(_order_no text, _token text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _o public.storefront_orders%ROWTYPE; _items jsonb; _timeline jsonb;
BEGIN
  SELECT * INTO _o FROM public.storefront_orders
   WHERE order_no = _order_no AND access_token = _token;
  IF NOT FOUND THEN RETURN NULL; END IF;

  SELECT coalesce(jsonb_agg(jsonb_build_object(
           'product_name', i.product_name, 'slug', i.slug, 'category', i.category,
           'unit_price_idr', i.unit_price_idr, 'qty_kg', i.qty_kg, 'line_total_idr', i.line_total_idr
         ) ORDER BY i.created_at), '[]'::jsonb)
    INTO _items FROM public.storefront_order_items i WHERE i.order_id = _o.id;

  SELECT coalesce(jsonb_agg(jsonb_build_object(
           'to_status', e.to_status, 'from_status', e.from_status,
           'note', e.note, 'created_at', e.created_at
         ) ORDER BY e.created_at), '[]'::jsonb)
    INTO _timeline FROM public.storefront_order_events e WHERE e.order_id = _o.id;

  RETURN jsonb_build_object(
    'order_no', _o.order_no, 'status', _o.status, 'payment_method', _o.payment_method,
    'buyer_name', _o.buyer_name, 'address', _o.address, 'city', _o.city,
    'subtotal_idr', _o.subtotal_idr, 'total_idr', _o.total_idr,
    'created_at', _o.created_at,
    'payment_channel', _o.payment_channel,
    'payment_va', _o.payment_va,
    'payment_qr_url', _o.payment_qr_url,
    'payment_url', _o.payment_url,
    'payment_expires_at', _o.payment_expires_at,
    'paid_at', _o.paid_at,
    'courier_name', _o.courier_name,
    'tracking_no', _o.tracking_no,
    'eta_date', _o.eta_date,
    'shipped_at', _o.shipped_at,
    'delivered_at', _o.delivered_at,
    'buyer_confirmed_at', _o.buyer_confirmed_at,
    'items', _items,
    'timeline', _timeline
  );
END;
$$;
REVOKE EXECUTE ON FUNCTION public.ml_track_order(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ml_track_order(text, text) TO anon, authenticated;