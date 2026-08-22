CREATE OR REPLACE FUNCTION public.ml_request_credit(_limit numeric, _note text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Harus masuk terlebih dahulu';
  END IF;
  IF coalesce(_limit,0) <= 0 OR _limit > 1000000000 THEN
    RAISE EXCEPTION 'Nilai limit tidak valid';
  END IF;

  INSERT INTO public.ml_credit_accounts (user_id, limit_idr, status, note)
  VALUES (auth.uid(), round(_limit,2), 'PENDING', left(nullif(btrim(coalesce(_note,'')),''), 500))
  ON CONFLICT (user_id) DO UPDATE
    SET note = coalesce(excluded.note, public.ml_credit_accounts.note),
        updated_at = now()
  WHERE public.ml_credit_accounts.status <> 'APPROVED';
END;
$$;

REVOKE EXECUTE ON FUNCTION public.ml_request_credit(numeric, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ml_request_credit(numeric, text) TO authenticated;