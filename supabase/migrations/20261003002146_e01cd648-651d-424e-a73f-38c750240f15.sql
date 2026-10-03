CREATE OR REPLACE FUNCTION public.ml_place_order(_buyer jsonb, _items jsonb, _payment_method public.ml_pay_method, _coupon text DEFAULT NULL::text)
RETURNS TABLE(id uuid, order_no text, access_token text, total_idr numeric)
LANGUAGE plpgsql
SET search_path TO 'public', 'meatlink_private'
AS $function$
BEGIN
  IF _payment_method IS NULL OR _payment_method NOT IN ('BANK_TRANSFER', 'TERMS_REQUEST') THEN
    RAISE EXCEPTION 'Metode pembayaran ini tidak tersedia. Pilih transfer bank atau ajukan termin via WhatsApp.';
  END IF;
  RETURN QUERY SELECT * FROM meatlink_private.ml_place_order(_buyer, _items, _payment_method, _coupon);
END;
$function$;

CREATE OR REPLACE FUNCTION public.ml_prevent_new_gateway_attempt()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.payment_method IS NULL OR NEW.payment_method NOT IN ('BANK_TRANSFER', 'TERMS_REQUEST') THEN
      RAISE EXCEPTION 'Metode pembayaran ini tidak tersedia. Pilih transfer bank atau ajukan termin via WhatsApp.';
    END IF;
    IF NEW.payment_ref LIKE 'Midtrans %' THEN
      RAISE EXCEPTION 'Pembuatan pembayaran otomatis sedang dihentikan.';
    END IF;
  ELSIF NEW.payment_ref IS DISTINCT FROM OLD.payment_ref
    AND NEW.payment_ref LIKE 'Midtrans %' THEN
    RAISE EXCEPTION 'Pembuatan pembayaran otomatis sedang dihentikan.';
  END IF;
  RETURN NEW;
END;
$function$;