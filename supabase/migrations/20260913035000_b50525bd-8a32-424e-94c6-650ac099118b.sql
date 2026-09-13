ALTER TABLE public.quote_requests
  ADD COLUMN IF NOT EXISTS email_access_token_hash text;

CREATE INDEX IF NOT EXISTS quote_requests_email_access_token_hash_idx
  ON public.quote_requests (email_access_token_hash)
  WHERE email_access_token_hash IS NOT NULL;

COMMENT ON COLUMN public.quote_requests.email_access_token_hash IS 'SHA-256 hash of a separately issued response-email tracking token.';