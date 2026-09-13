REVOKE INSERT ON public.profiles FROM authenticated;

CREATE TABLE public.quote_request_access_tokens (
  quote_request_id uuid PRIMARY KEY REFERENCES public.quote_requests(id) ON DELETE CASCADE,
  access_token_hash text,
  email_access_token_hash text
);

GRANT ALL ON public.quote_request_access_tokens TO service_role;
ALTER TABLE public.quote_request_access_tokens ENABLE ROW LEVEL SECURITY;

CREATE INDEX quote_request_access_tokens_access_hash_idx
  ON public.quote_request_access_tokens (access_token_hash)
  WHERE access_token_hash IS NOT NULL;

CREATE INDEX quote_request_access_tokens_email_hash_idx
  ON public.quote_request_access_tokens (email_access_token_hash)
  WHERE email_access_token_hash IS NOT NULL;

INSERT INTO public.quote_request_access_tokens (
  quote_request_id,
  access_token_hash,
  email_access_token_hash
)
SELECT id, access_token_hash, email_access_token_hash
FROM public.quote_requests
WHERE access_token_hash IS NOT NULL
   OR email_access_token_hash IS NOT NULL
ON CONFLICT (quote_request_id) DO UPDATE
SET access_token_hash = EXCLUDED.access_token_hash,
    email_access_token_hash = EXCLUDED.email_access_token_hash;

ALTER TABLE public.quote_requests
  DROP COLUMN access_token_hash,
  DROP COLUMN email_access_token_hash;

COMMENT ON TABLE public.quote_request_access_tokens IS
  'Server-only hashes used to validate private quote tracking links.';