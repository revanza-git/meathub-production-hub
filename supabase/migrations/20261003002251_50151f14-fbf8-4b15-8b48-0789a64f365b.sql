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
    AND NEW.payment_ref LIKE 'Midtrans %'
    AND (OLD.payment_ref IS NULL OR OLD.payment_ref NOT LIKE 'Midtrans %') THEN
    RAISE EXCEPTION 'Pembuatan pembayaran otomatis sedang dihentikan.';
  END IF;
  RETURN NEW;
END;
$function$;