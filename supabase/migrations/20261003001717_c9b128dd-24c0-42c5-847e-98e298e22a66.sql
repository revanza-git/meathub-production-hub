CREATE OR REPLACE FUNCTION public.ml_place_order(_buyer jsonb, _items jsonb, _payment_method public.ml_pay_method, _coupon text DEFAULT NULL::text)
RETURNS TABLE(id uuid, order_no text, access_token text, total_idr numeric)
LANGUAGE plpgsql
SET search_path TO 'public', 'meatlink_private'
AS $function$
BEGIN
  IF _payment_method IS NULL OR _payment_method NOT IN ('BANK_TRANSFER', 'TERMS_REQUEST') THEN
    RAISE EXCEPTION 'Metode pembayaran ini tidak tersedia. Pilih transfer bank.';
  END IF;
  RETURN QUERY SELECT * FROM meatlink_private.ml_place_order(_buyer, _items, _payment_method, _coupon);
END;
$function$;

UPDATE public.storefront_orders
SET payment_method = 'BANK_TRANSFER',
    payment_channel = NULL,
    payment_va = NULL,
    payment_qr_url = NULL,
    payment_url = NULL,
    payment_expires_at = NULL,
    payment_ref = NULL,
    updated_at = now()
WHERE status IN ('NEW', 'AWAITING_PAYMENT')
  AND paid_at IS NULL
  AND payment_method NOT IN ('BANK_TRANSFER', 'TERMS_REQUEST')
  AND payment_trx_id IS NULL;

UPDATE public.storefront_orders
SET payment_channel = NULL,
    payment_va = NULL,
    payment_qr_url = NULL,
    payment_url = NULL,
    payment_expires_at = NULL,
    updated_at = now()
WHERE status IN ('NEW', 'AWAITING_PAYMENT')
  AND paid_at IS NULL
  AND payment_method = 'BANK_TRANSFER'
  AND payment_ref IS NULL
  AND payment_trx_id IS NULL;