ALTER TABLE public.quote_requests
  ADD COLUMN IF NOT EXISTS reference_no text,
  ADD COLUMN IF NOT EXISTS access_token_hash text,
  ADD COLUMN IF NOT EXISTS admin_response text,
  ADD COLUMN IF NOT EXISTS responded_at timestamptz,
  ADD COLUMN IF NOT EXISTS response_valid_until date,
  ADD COLUMN IF NOT EXISTS responded_by uuid;

UPDATE public.quote_requests
SET reference_no = 'RFQ-' || upper(substr(replace(id::text, '-', ''), 1, 10))
WHERE reference_no IS NULL;

ALTER TABLE public.quote_requests
  ALTER COLUMN reference_no SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS quote_requests_reference_no_key
  ON public.quote_requests (reference_no);

CREATE INDEX IF NOT EXISTS quote_requests_access_token_hash_idx
  ON public.quote_requests (access_token_hash)
  WHERE access_token_hash IS NOT NULL;

REVOKE INSERT ON public.quote_requests FROM anon, authenticated;
DROP POLICY IF EXISTS "Anyone can submit a quote request" ON public.quote_requests;

COMMENT ON COLUMN public.quote_requests.reference_no IS 'Public-facing reference number for a quote request.';
COMMENT ON COLUMN public.quote_requests.access_token_hash IS 'SHA-256 hash of the private tracking token; the plaintext token is never stored.';
COMMENT ON COLUMN public.quote_requests.admin_response IS 'Admin-authored response visible through the private tracking link.';
COMMENT ON COLUMN public.quote_requests.responded_at IS 'Time the latest admin response was sent.';
COMMENT ON COLUMN public.quote_requests.response_valid_until IS 'Optional validity date for the response.';