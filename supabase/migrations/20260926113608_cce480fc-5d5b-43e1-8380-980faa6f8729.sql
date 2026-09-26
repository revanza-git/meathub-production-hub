CREATE OR REPLACE FUNCTION public.ml_expire_unpaid_orders()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_hours numeric;
  v_ids uuid[];
  v_rows jsonb;
BEGIN
  SELECT coalesce((value #>> '{}')::numeric, 48) INTO v_hours
  FROM public.admin_settings WHERE key = 'order_expiry_hours';
  IF v_hours IS NULL OR v_hours <= 0 THEN
    RETURN jsonb_build_object('expired', 0, 'skipped', true);
  END IF;

  WITH stale AS (
    SELECT id, order_no, status
    FROM public.storefront_orders
    WHERE status IN ('NEW','AWAITING_PAYMENT')
      AND payment_method <> 'TOP'
      AND (payment_ref IS NULL OR payment_ref NOT LIKE 'Midtrans %')
      AND payment_proof_url IS NULL
      AND paid_at IS NULL
      AND created_at < now() - make_interval(mins => (v_hours * 60)::int)
  ), upd AS (
    UPDATE public.storefront_orders o
       SET status = 'CANCELLED',
           admin_note = coalesce(o.admin_note || ' | ', '') || 'Auto-cancelled: unpaid past ' || v_hours || ' hours',
           updated_at = now()
      FROM stale s
     WHERE o.id = s.id AND o.status = s.status AND o.paid_at IS NULL
     RETURNING o.id, o.order_no, s.status AS from_status
  )
  SELECT coalesce(array_agg(id), '{}'::uuid[]),
         coalesce(jsonb_agg(jsonb_build_object('id', id, 'order_no', order_no)), '[]'::jsonb)
    INTO v_ids, v_rows FROM upd;

  IF array_length(v_ids, 1) IS NOT NULL THEN
    INSERT INTO public.storefront_order_events (order_id, from_status, to_status, note)
    SELECT u.id, u.from_status, 'CANCELLED', 'Dibatalkan otomatis: pembayaran tidak diterima dalam ' || v_hours || ' jam.'
    FROM (SELECT id, from_status FROM public.storefront_orders o JOIN LATERAL (SELECT NULL::public.ml_store_order_status AS from_status) x ON true WHERE false) u;
  END IF;
  RETURN jsonb_build_object('expired', coalesce(array_length(v_ids, 1), 0), 'orders', v_rows);
END;
$$;
REVOKE ALL ON FUNCTION public.ml_expire_unpaid_orders() FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ml_expire_unpaid_orders() TO service_role;