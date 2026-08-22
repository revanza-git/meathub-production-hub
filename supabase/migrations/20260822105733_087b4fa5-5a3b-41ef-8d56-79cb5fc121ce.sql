ALTER TABLE public.storefront_orders
  ADD COLUMN IF NOT EXISTS payment_proof_url text,
  ADD COLUMN IF NOT EXISTS payment_proof_at timestamptz;

CREATE OR REPLACE FUNCTION public.ml_attach_payment_proof(_order_no text, _token text, _url text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _id uuid;
BEGIN
  IF _url IS NULL OR _url !~* '^https?://' THEN
    RAISE EXCEPTION 'Invalid proof URL';
  END IF;

  SELECT id INTO _id
  FROM public.storefront_orders
  WHERE order_no = _order_no
    AND access_token = _token
    AND status IN ('NEW','AWAITING_PAYMENT','PAID');

  IF _id IS NULL THEN
    RAISE EXCEPTION 'Order not found or no longer accepts payment proof';
  END IF;

  UPDATE public.storefront_orders
  SET payment_proof_url = _url,
      payment_proof_at = now(),
      updated_at = now()
  WHERE id = _id;

  INSERT INTO public.storefront_order_events (order_id, to_status, note)
  SELECT _id, status, 'Bukti pembayaran diunggah pembeli' FROM public.storefront_orders WHERE id = _id;
END;
$$;

REVOKE ALL ON FUNCTION public.ml_attach_payment_proof(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ml_attach_payment_proof(text, text, text) TO anon, authenticated;