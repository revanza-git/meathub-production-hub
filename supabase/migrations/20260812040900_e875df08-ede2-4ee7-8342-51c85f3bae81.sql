CREATE TABLE public.quote_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_name text NOT NULL,
  contact_name text NOT NULL,
  whatsapp text NOT NULL,
  email text,
  delivery_location text NOT NULL,
  product_cut text NOT NULL,
  category text,
  origin_preference text,
  brand_preference text,
  grade text,
  volume text NOT NULL,
  purchase_frequency text,
  current_supplier text,
  current_price text,
  target_price text,
  payment_terms text,
  required_delivery_date text NOT NULL,
  notes text,
  status text NOT NULL DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT INSERT ON public.quote_requests TO anon, authenticated;
GRANT ALL ON public.quote_requests TO service_role;
ALTER TABLE public.quote_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can submit a quote request"
  ON public.quote_requests FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE TABLE public.supplier_applications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_name text NOT NULL,
  contact_name text NOT NULL,
  whatsapp text NOT NULL,
  email text,
  brands_represented text,
  origins text,
  product_categories text,
  delivery_coverage text,
  moq text,
  payment_terms text,
  notes text,
  status text NOT NULL DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT INSERT ON public.supplier_applications TO anon, authenticated;
GRANT ALL ON public.supplier_applications TO service_role;
ALTER TABLE public.supplier_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can submit a supplier application"
  ON public.supplier_applications FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE TRIGGER quote_requests_set_updated_at
  BEFORE UPDATE ON public.quote_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER supplier_applications_set_updated_at
  BEFORE UPDATE ON public.supplier_applications
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();