-- ROLES
CREATE TYPE public.ml_role AS ENUM ('buyer','vendor','admin');

CREATE TABLE public.ml_user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.ml_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.ml_user_roles TO authenticated;
GRANT ALL ON public.ml_user_roles TO service_role;
ALTER TABLE public.ml_user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.ml_has_role(_user_id uuid, _role public.ml_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.ml_user_roles WHERE user_id = _user_id AND role = _role)
$$;
REVOKE EXECUTE ON FUNCTION public.ml_has_role(uuid, public.ml_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ml_has_role(uuid, public.ml_role) TO authenticated, service_role;

CREATE POLICY "own roles readable" ON public.ml_user_roles
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.ml_has_role(auth.uid(),'admin'));
CREATE POLICY "admins manage roles" ON public.ml_user_roles
  FOR ALL TO authenticated USING (public.ml_has_role(auth.uid(),'admin')) WITH CHECK (public.ml_has_role(auth.uid(),'admin'));

-- default buyer role on signup
CREATE OR REPLACE FUNCTION public.ml_handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.ml_user_roles (user_id, role)
  VALUES (NEW.id, COALESCE(NULLIF(NEW.raw_user_meta_data->>'ml_role',''),'buyer')::public.ml_role)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER ml_on_auth_user_created
  AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.ml_handle_new_user();

-- ORDERS
CREATE TYPE public.ml_payment_term AS ENUM ('CBD','TOP7','TOP14','TOP30');
CREATE TYPE public.ml_order_status AS ENUM ('PENDING','CONFIRMED','ON_HOLD','REJECTED','DELIVERED');
CREATE TYPE public.ml_top_decision AS ENUM ('APPROVE','CUT','FORWARD');
CREATE TYPE public.ml_product_category AS ENUM ('PRIME_CUT','SECOND_CUT','OFFAL','BONE');

CREATE SEQUENCE public.ml_order_seq;

CREATE OR REPLACE FUNCTION public.ml_next_order_no()
RETURNS text LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path = public AS $$
  SELECT 'ML-' || to_char(now(),'YYMM') || '-' || lpad(nextval('public.ml_order_seq')::text, 4, '0')
$$;
REVOKE EXECUTE ON FUNCTION public.ml_next_order_no() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ml_next_order_no() TO authenticated, service_role;

CREATE TABLE public.buyer_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_no text NOT NULL UNIQUE DEFAULT public.ml_next_order_no(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  buyer_name text NOT NULL,
  product_text text NOT NULL,
  qty_kg numeric NOT NULL CHECK (qty_kg > 0),
  payment_term public.ml_payment_term NOT NULL,
  status public.ml_order_status NOT NULL DEFAULT 'PENDING',
  vendor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  vendor_note text,
  admin_notes text,
  top_decision public.ml_top_decision,
  buyer_notes text,
  needed_by date,
  delivery_location text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.buyer_orders TO authenticated;
GRANT ALL ON public.buyer_orders TO service_role;
ALTER TABLE public.buyer_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "buyers read own orders" ON public.buyer_orders
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.ml_has_role(auth.uid(),'admin'));
CREATE POLICY "buyers create own orders" ON public.buyer_orders
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND status = 'PENDING');
CREATE POLICY "admins update orders" ON public.buyer_orders
  FOR UPDATE TO authenticated USING (public.ml_has_role(auth.uid(),'admin')) WITH CHECK (public.ml_has_role(auth.uid(),'admin'));
CREATE POLICY "admins delete orders" ON public.buyer_orders
  FOR DELETE TO authenticated USING (public.ml_has_role(auth.uid(),'admin'));

CREATE TABLE public.buyer_order_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.buyer_orders(id) ON DELETE CASCADE,
  from_status public.ml_order_status,
  to_status public.ml_order_status NOT NULL,
  actor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.buyer_order_status_history TO authenticated;
GRANT ALL ON public.buyer_order_status_history TO service_role;
ALTER TABLE public.buyer_order_status_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "history visible to order owner and admin" ON public.buyer_order_status_history
  FOR SELECT TO authenticated USING (
    public.ml_has_role(auth.uid(),'admin')
    OR EXISTS (SELECT 1 FROM public.buyer_orders o WHERE o.id = order_id AND o.user_id = auth.uid())
  );

CREATE OR REPLACE FUNCTION public.ml_track_order_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.buyer_order_status_history(order_id, from_status, to_status, actor_user_id)
    VALUES (NEW.id, NULL, NEW.status, auth.uid());
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.buyer_order_status_history(order_id, from_status, to_status, actor_user_id, reason)
    VALUES (NEW.id, OLD.status, NEW.status, auth.uid(), NEW.admin_notes);
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER ml_orders_track_status
  AFTER INSERT OR UPDATE ON public.buyer_orders FOR EACH ROW EXECUTE FUNCTION public.ml_track_order_status();

CREATE OR REPLACE FUNCTION public.ml_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER ml_orders_touch BEFORE UPDATE ON public.buyer_orders
  FOR EACH ROW EXECUTE FUNCTION public.ml_touch_updated_at();

-- VENDOR CATALOG / STOCK
CREATE TABLE public.vendor_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  category public.ml_product_category NOT NULL,
  qty_kg numeric NOT NULL DEFAULT 0 CHECK (qty_kg >= 0),
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (vendor_user_id, name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendor_products TO authenticated;
GRANT ALL ON public.vendor_products TO service_role;
ALTER TABLE public.vendor_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vendors manage own products" ON public.vendor_products
  FOR ALL TO authenticated USING (vendor_user_id = auth.uid()) WITH CHECK (vendor_user_id = auth.uid());
CREATE POLICY "admins read all products" ON public.vendor_products
  FOR SELECT TO authenticated USING (public.ml_has_role(auth.uid(),'admin'));
CREATE POLICY "admins update all products" ON public.vendor_products
  FOR UPDATE TO authenticated USING (public.ml_has_role(auth.uid(),'admin')) WITH CHECK (public.ml_has_role(auth.uid(),'admin'));

CREATE TRIGGER ml_products_touch BEFORE UPDATE ON public.vendor_products
  FOR EACH ROW EXECUTE FUNCTION public.ml_touch_updated_at();

CREATE TABLE public.vendor_stock_movements (
  id bigserial PRIMARY KEY,
  product_id uuid NOT NULL REFERENCES public.vendor_products(id) ON DELETE CASCADE,
  vendor_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  delta_kg numeric NOT NULL,
  qty_after numeric NOT NULL,
  source text NOT NULL DEFAULT 'manual',
  actor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.vendor_stock_movements TO authenticated;
GRANT ALL ON public.vendor_stock_movements TO service_role;
ALTER TABLE public.vendor_stock_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vendors read own movements" ON public.vendor_stock_movements
  FOR SELECT TO authenticated USING (vendor_user_id = auth.uid() OR public.ml_has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.ml_track_stock()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.vendor_stock_movements(product_id, vendor_user_id, delta_kg, qty_after, source, actor_user_id)
    VALUES (NEW.id, NEW.vendor_user_id, NEW.qty_kg, NEW.qty_kg, 'create', auth.uid());
  ELSIF NEW.qty_kg IS DISTINCT FROM OLD.qty_kg THEN
    INSERT INTO public.vendor_stock_movements(product_id, vendor_user_id, delta_kg, qty_after, source, actor_user_id)
    VALUES (NEW.id, NEW.vendor_user_id, NEW.qty_kg - OLD.qty_kg, NEW.qty_kg, 'manual', auth.uid());
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER ml_products_track_stock
  AFTER INSERT OR UPDATE ON public.vendor_products FOR EACH ROW EXECUTE FUNCTION public.ml_track_stock();

-- PUBLIC (BUYER) STOCK VIEW: no vendor identity
CREATE VIEW public.ml_public_stock
WITH (security_invoker = off) AS
  SELECT name AS product_name,
         category,
         sum(qty_kg)::numeric AS qty_kg,
         count(*)::int AS source_count,
         max(updated_at) AS last_updated_at
  FROM public.vendor_products
  WHERE is_active AND qty_kg > 0
  GROUP BY name, category;
GRANT SELECT ON public.ml_public_stock TO authenticated;
GRANT ALL ON public.ml_public_stock TO service_role;