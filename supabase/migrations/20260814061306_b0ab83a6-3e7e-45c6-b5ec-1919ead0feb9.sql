ALTER TABLE public.quote_requests
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS quote_requests_user_id_idx ON public.quote_requests (user_id);

CREATE POLICY "Buyers can read their own quote requests"
  ON public.quote_requests FOR SELECT TO authenticated
  USING (user_id = auth.uid());