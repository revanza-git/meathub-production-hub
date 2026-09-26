CREATE TABLE public.ml_payment_reconciliations (
  order_id uuid PRIMARY KEY REFERENCES public.storefront_orders(id) ON DELETE CASCADE,
  payment_ref text NOT NULL,
  transaction_id text,
  gateway_status text,
  gateway_amount numeric,
  order_amount numeric NOT NULL,
  order_status text NOT NULL,
  transaction_time timestamptz,
  settlement_time timestamptz,
  result text NOT NULL CHECK (result IN ('MATCHED','PENDING','REVIEW','FAILED')),
  reason text,
  checked_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.ml_payment_reconciliations TO authenticated;
GRANT ALL ON public.ml_payment_reconciliations TO service_role;
ALTER TABLE public.ml_payment_reconciliations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Only Meatlink admins view reconciliations" ON public.ml_payment_reconciliations FOR SELECT TO authenticated USING (public.ml_has_role(auth.uid(), 'admin'::public.ml_role));
CREATE TRIGGER ml_payment_reconciliations_touch BEFORE UPDATE ON public.ml_payment_reconciliations FOR EACH ROW EXECUTE FUNCTION public.ml_touch_updated_at();
CREATE INDEX ml_payment_reconciliations_result_checked_idx ON public.ml_payment_reconciliations(result, checked_at DESC);