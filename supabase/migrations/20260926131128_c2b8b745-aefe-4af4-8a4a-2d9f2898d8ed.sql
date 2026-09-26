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
    'payment_environment', CASE WHEN _o.payment_ref LIKE 'Midtrans Live %' THEN 'production' WHEN _o.payment_ref LIKE 'Midtrans %' THEN 'sandbox' ELSE NULL END,
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