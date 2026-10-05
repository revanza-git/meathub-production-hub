CREATE OR REPLACE FUNCTION public.ml_require_buyer_contact_on_order()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.user_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.ml_user_roles WHERE user_id = NEW.user_id AND role IN ('admin', 'vendor'))
    AND NOT EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = NEW.user_id
        AND email IS NOT NULL AND btrim(email::text) <> ''
        AND phone IS NOT NULL AND btrim(phone) ~ '^\+?[0-9][0-9 ()-]{6,28}$'
        AND length(btrim(phone)) BETWEEN 8 AND 30
    ) THEN
    RAISE EXCEPTION 'Lengkapi email dan nomor telepon akun sebelum memesan.';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.ml_require_buyer_contact_on_order() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER ml_require_buyer_contact_on_order BEFORE INSERT ON public.storefront_orders FOR EACH ROW EXECUTE FUNCTION public.ml_require_buyer_contact_on_order();