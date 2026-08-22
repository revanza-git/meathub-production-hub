-- ============ payment method: term of payment ============
ALTER TYPE public.ml_pay_method ADD VALUE IF NOT EXISTS 'TOP';

-- ============ coupons ============
CREATE TABLE IF NOT EXISTS public.ml_coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  description text,
  discount_type text NOT NULL DEFAULT 'PERCENT' CHECK (discount_type IN ('PERCENT','AMOUNT')),
  discount_value numeric(14,2) NOT NULL CHECK (discount_value > 0),
  min_subtotal_idr numeric(14,2) NOT NULL DEFAULT 0,
  max_discount_idr numeric(14,2),
  starts_at timestamptz,
  ends_at timestamptz,
  usage_limit integer,
  used_count integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ml_coupons TO authenticated;
GRANT ALL ON public.ml_coupons TO service_role;
ALTER TABLE public.ml_coupons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins manage coupons" ON public.ml_coupons;
CREATE POLICY "admins manage coupons" ON public.ml_coupons
  FOR ALL TO authenticated
  USING (public.ml_has_role(auth.uid(), 'admin'))
  WITH CHECK (public.ml_has_role(auth.uid(), 'admin'));

CREATE TRIGGER ml_coupons_touch BEFORE UPDATE ON public.ml_coupons
  FOR EACH ROW EXECUTE FUNCTION public.ml_touch_updated_at();

-- ============ buyer contract prices ============
CREATE TABLE IF NOT EXISTS public.ml_buyer_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  inventory_id uuid NOT NULL REFERENCES public.admin_inventory(id) ON DELETE CASCADE,
  price_idr numeric(14,2) NOT NULL CHECK (price_idr > 0),
  valid_until date,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, inventory_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ml_buyer_prices TO authenticated;
GRANT ALL ON public.ml_buyer_prices TO service_role;
ALTER TABLE public.ml_buyer_prices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins manage buyer prices" ON public.ml_buyer_prices;
CREATE POLICY "admins manage buyer prices" ON public.ml_buyer_prices
  FOR ALL TO authenticated
  USING (public.ml_has_role(auth.uid(), 'admin'))
  WITH CHECK (public.ml_has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "buyers read own prices" ON public.ml_buyer_prices;
CREATE POLICY "buyers read own prices" ON public.ml_buyer_prices
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE TRIGGER ml_buyer_prices_touch BEFORE UPDATE ON public.ml_buyer_prices
  FOR EACH ROW EXECUTE FUNCTION public.ml_touch_updated_at();

-- ============ credit accounts (TOP) ============
CREATE TABLE IF NOT EXISTS public.ml_credit_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  limit_idr numeric(14,2) NOT NULL DEFAULT 0 CHECK (limit_idr >= 0),
  term_days integer NOT NULL DEFAULT 14 CHECK (term_days BETWEEN 1 AND 120),
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','APPROVED','SUSPENDED')),
  approved_by uuid,
  approved_at timestamptz,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ml_credit_accounts TO authenticated;
GRANT ALL ON public.ml_credit_accounts TO service_role;
ALTER TABLE public.ml_credit_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins manage credit accounts" ON public.ml_credit_accounts;
CREATE POLICY "admins manage credit accounts" ON public.ml_credit_accounts
  FOR ALL TO authenticated
  USING (public.ml_has_role(auth.uid(), 'admin'))
  WITH CHECK (public.ml_has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "buyers read own credit" ON public.ml_credit_accounts;
CREATE POLICY "buyers read own credit" ON public.ml_credit_accounts
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE TRIGGER ml_credit_accounts_touch BEFORE UPDATE ON public.ml_credit_accounts
  FOR EACH ROW EXECUTE FUNCTION public.ml_touch_updated_at();

-- ============ order commercial fields ============
ALTER TABLE public.storefront_orders
  ADD COLUMN IF NOT EXISTS coupon_code text,
  ADD COLUMN IF NOT EXISTS discount_idr numeric(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS credit_term_days integer,
  ADD COLUMN IF NOT EXISTS due_date date;

-- ============ coupon validation ============
CREATE OR REPLACE FUNCTION public.ml_validate_coupon(_code text, _subtotal numeric)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _c public.ml_coupons%ROWTYPE; _disc numeric := 0;
BEGIN
  SELECT * INTO _c FROM public.ml_coupons
   WHERE upper(code) = upper(btrim(coalesce(_code,''))) AND is_active;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'Kode promo tidak ditemukan');
  END IF;
  IF _c.starts_at IS NOT NULL AND now() < _c.starts_at THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'Kode promo belum berlaku');
  END IF;
  IF _c.ends_at IS NOT NULL AND now() > _c.ends_at THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'Kode promo sudah kedaluwarsa');
  END IF;
  IF _c.usage_limit IS NOT NULL AND _c.used_count >= _c.usage_limit THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'Kuota kode promo habis');
  END IF;
  IF coalesce(_subtotal,0) < _c.min_subtotal_idr THEN
    RETURN jsonb_build_object('valid', false, 'reason',
      'Minimum belanja ' || to_char(_c.min_subtotal_idr, 'FM999G999G999G999'));
  END IF;

  IF _c.discount_type = 'PERCENT' THEN
    _disc := round(coalesce(_subtotal,0) * _c.discount_value / 100, 2);
  ELSE
    _disc := _c.discount_value;
  END IF;
  IF _c.max_discount_idr IS NOT NULL THEN
    _disc := least(_disc, _c.max_discount_idr);
  END IF;
  _disc := least(_disc, coalesce(_subtotal,0));

  RETURN jsonb_build_object(
    'valid', true, 'code', _c.code, 'discount_idr', _disc,
    'description', _c.description
  );
END;
$$;
REVOKE EXECUTE ON FUNCTION public.ml_validate_coupon(text, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ml_validate_coupon(text, numeric) TO anon, authenticated;

-- ============ credit summary for the signed-in buyer ============
CREATE OR REPLACE FUNCTION public.ml_my_credit()
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _a public.ml_credit_accounts%ROWTYPE; _out numeric;
BEGIN
  IF auth.uid() IS NULL THEN RETURN NULL; END IF;
  SELECT * INTO _a FROM public.ml_credit_accounts WHERE user_id = auth.uid();
  IF NOT FOUND THEN RETURN NULL; END IF;
  SELECT coalesce(sum(total_idr),0) INTO _out FROM public.storefront_orders
   WHERE user_id = auth.uid() AND payment_method = 'TOP'
     AND status NOT IN ('COMPLETED','CANCELLED');
  RETURN jsonb_build_object(
    'status', _a.status, 'limit_idr', _a.limit_idr, 'term_days', _a.term_days,
    'outstanding_idr', _out, 'available_idr', greatest(_a.limit_idr - _out, 0)
  );
END;
$$;
REVOKE EXECUTE ON FUNCTION public.ml_my_credit() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ml_my_credit() TO authenticated;

-- ============ recommendations ============
CREATE OR REPLACE FUNCTION public.ml_my_frequent_products(_limit integer DEFAULT 6)
RETURNS TABLE(slug text, product_name text, times_ordered bigint, last_price_idr numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT i.slug, max(i.product_name), count(*)::bigint, max(i.unit_price_idr)
    FROM public.storefront_order_items i
    JOIN public.storefront_orders o ON o.id = i.order_id
   WHERE o.user_id = auth.uid() AND i.slug IS NOT NULL
   GROUP BY i.slug
   ORDER BY count(*) DESC, max(o.created_at) DESC
   LIMIT greatest(coalesce(_limit,6), 1);
$$;
REVOKE EXECUTE ON FUNCTION public.ml_my_frequent_products(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ml_my_frequent_products(integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.ml_popular_products(_limit integer DEFAULT 8)
RETURNS TABLE(slug text, product_name text, total_qty_kg numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT i.slug, max(i.product_name), sum(i.qty_kg)
    FROM public.storefront_order_items i
    JOIN public.storefront_orders o ON o.id = i.order_id
    JOIN public.admin_inventory ai ON ai.slug = i.slug AND ai.is_published IS TRUE
   WHERE o.status NOT IN ('CANCELLED') AND i.slug IS NOT NULL
     AND o.created_at > now() - interval '180 days'
   GROUP BY i.slug
   ORDER BY sum(i.qty_kg) DESC
   LIMIT greatest(coalesce(_limit,8), 1);
$$;
REVOKE EXECUTE ON FUNCTION public.ml_popular_products(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ml_popular_products(integer) TO anon, authenticated;