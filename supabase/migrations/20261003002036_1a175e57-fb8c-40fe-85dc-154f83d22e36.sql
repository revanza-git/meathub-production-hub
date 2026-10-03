CREATE OR REPLACE FUNCTION public.ml_prevent_new_gateway_attempt()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.payment_method IS DISTINCT FROM 'BANK_TRANSFER'::public.ml_pay_method THEN
      RAISE EXCEPTION 'Metode pembayaran ini tidak tersedia. Pilih transfer bank.';
    END IF;
  ELSIF NEW.payment_ref IS DISTINCT FROM OLD.payment_ref
    AND (NEW.payment_ref LIKE 'Midtrans %' OR NEW.payment_ref LIKE 'Midtrans Live %') THEN
    RAISE EXCEPTION 'Pembuatan pembayaran otomatis sedang dihentikan.';
  END IF;
  RETURN NEW;
END;
$function$;
CREATE TRIGGER ml_prevent_new_gateway_attempt
BEFORE INSERT OR UPDATE ON public.storefront_orders
FOR EACH ROW EXECUTE FUNCTION public.ml_prevent_new_gateway_attempt();