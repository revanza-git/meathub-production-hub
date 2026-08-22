CREATE OR REPLACE FUNCTION public.ml_attach_payment_proof(_order_no text, _token text, _url text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _id uuid;
BEGIN
  IF _url IS NULL OR length(trim(_url)) = 0 OR length(_url) > 500 THEN
    RAISE EXCEPTION 'Invalid proof reference';
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

CREATE POLICY "Anyone can upload payment proofs"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'payment-proofs');

CREATE POLICY "Admins read payment proofs"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'payment-proofs' AND public.ml_has_role(auth.uid(), 'admin'));