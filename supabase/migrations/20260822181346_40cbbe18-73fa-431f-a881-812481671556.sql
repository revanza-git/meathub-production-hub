DROP POLICY IF EXISTS "Anyone can upload payment proofs" ON storage.objects;

REVOKE EXECUTE ON FUNCTION public.ml_attach_payment_proof(text, text, text) FROM anon, authenticated, PUBLIC;