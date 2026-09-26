ALTER TABLE public.payment_intents ALTER COLUMN provider SET DEFAULT 'midtrans';
ALTER TABLE public.payment_events ALTER COLUMN provider SET DEFAULT 'midtrans';