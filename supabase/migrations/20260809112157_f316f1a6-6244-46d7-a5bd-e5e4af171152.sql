CREATE TYPE public.payment_intent_status AS ENUM ('PENDING','PROCESSING','PAID','FAILED','EXPIRED','CANCELLED');

CREATE TABLE public.payment_intents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_ref text NOT NULL,
  buyer_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  buyer_org_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  provider text NOT NULL DEFAULT 'ipaymu',
  channel text NOT NULL,
  channel_code text,
  amount numeric(14,2) NOT NULL CHECK (amount > 0),
  fee numeric(14,2) NOT NULL DEFAULT 0,
  reference text,
  payment_no text,
  payment_name text,
  qr_string text,
  status public.payment_intent_status NOT NULL DEFAULT 'PENDING',
  expires_at timestamptz,
  paid_at timestamptz,
  request_payload jsonb,
  response_payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_payment_intents_order_ref ON public.payment_intents(order_ref);
CREATE UNIQUE INDEX idx_payment_intents_reference ON public.payment_intents(provider, reference) WHERE reference IS NOT NULL;
CREATE INDEX idx_payment_intents_buyer ON public.payment_intents(buyer_user_id);

GRANT SELECT ON public.payment_intents TO authenticated;
GRANT ALL ON public.payment_intents TO service_role;

ALTER TABLE public.payment_intents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Buyers read own payment intents"
  ON public.payment_intents FOR SELECT TO authenticated
  USING (buyer_user_id = auth.uid());

CREATE POLICY "Internal staff read payment intents"
  ON public.payment_intents FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['platform_admin','finance_operator','auditor']::app_role[]));

CREATE TRIGGER trg_payment_intents_updated_at
  BEFORE UPDATE ON public.payment_intents
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.payment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_intent_id uuid REFERENCES public.payment_intents(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'ipaymu',
  reference text,
  event_type text NOT NULL,
  status text,
  payload jsonb NOT NULL,
  verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_payment_events_intent ON public.payment_events(payment_intent_id);

GRANT SELECT ON public.payment_events TO authenticated;
GRANT ALL ON public.payment_events TO service_role;

ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Internal staff read payment events"
  ON public.payment_events FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['platform_admin','finance_operator','auditor']::app_role[]));