CREATE OR REPLACE FUNCTION public.ml_buyer_cancel_store_order(_order_no text, _token text, _reason text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE _o record;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Masuk ke akun Anda untuk membatalkan pesanan.';
  END IF;
  SELECT id, status, paid_at, payment_proof_url, user_id INTO _o
  FROM public.storefront_orders
  WHERE order_no = _order_no AND access_token = _token
  FOR UPDATE;
  IF _o.id IS NULL OR _o.user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Pesanan ini tidak terdaftar di akun Anda.';
  END IF;
  IF _o.status NOT IN ('NEW','AWAITING_PAYMENT') OR _o.paid_at IS NOT NULL THEN
    RAISE EXCEPTION 'Pesanan ini sudah diproses dan tidak bisa dibatalkan sendiri. Hubungi tim kami lewat WhatsApp.';
  END IF;
  IF _o.payment_proof_url IS NOT NULL THEN
    RAISE EXCEPTION 'Bukti transfer sudah diunggah. Hubungi tim kami lewat WhatsApp untuk pembatalan dan pengembalian dana.';
  END IF;
  UPDATE public.storefront_orders SET status = 'CANCELLED', updated_at = now() WHERE id = _o.id;
  INSERT INTO public.storefront_order_events (order_id, to_status, note)
  VALUES (_o.id, 'CANCELLED', left('Dibatalkan oleh pembeli' || COALESCE(': ' || NULLIF(btrim(_reason), ''), ''), 300));
END;
$function$;
REVOKE ALL ON FUNCTION public.ml_buyer_cancel_store_order(text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ml_buyer_cancel_store_order(text, text, text) TO authenticated;