CREATE OR REPLACE FUNCTION public.ml_place_order(_buyer jsonb, _items jsonb, _payment_method public.ml_pay_method, _coupon text DEFAULT NULL::text)
RETURNS TABLE(id uuid, order_no text, access_token text, total_idr numeric)
LANGUAGE plpgsql
SET search_path TO 'public', 'meatlink_private'
AS $function$
BEGIN
  IF _payment_method IS DISTINCT FROM 'BANK_TRANSFER'::public.ml_pay_method THEN
    RAISE EXCEPTION 'Metode pembayaran ini tidak tersedia. Pilih transfer bank.';
  END IF;
  RETURN QUERY SELECT * FROM meatlink_private.ml_place_order(_buyer, _items, _payment_method, _coupon);
END;
$function$;