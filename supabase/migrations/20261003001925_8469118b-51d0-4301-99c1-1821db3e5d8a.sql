CREATE OR REPLACE FUNCTION meatlink_private.ml_place_order(_buyer jsonb, _items jsonb, _payment_method public.ml_pay_method, _coupon text DEFAULT NULL::text)
RETURNS TABLE(id uuid, order_no text, access_token text, total_idr numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'meatlink_private'
AS $function$
BEGIN
  RAISE EXCEPTION 'Metode pembayaran ini tidak tersedia. Pilih transfer bank.';
END;
$function$;