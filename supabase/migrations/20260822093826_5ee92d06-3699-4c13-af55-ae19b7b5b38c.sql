CREATE TYPE public.ml_pay_method AS ENUM ('BANK_TRANSFER','QRIS','WHATSAPP','CBD');
CREATE TYPE public.ml_store_order_status AS ENUM ('NEW','AWAITING_PAYMENT','PAID','PROCESSING','SHIPPED','COMPLETED','CANCELLED');

CREATE TABLE public.storefront_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_no text NOT NULL UNIQUE,
  access_token text NOT NULL DEFAULT encode(gen_random_bytes(16),'hex'),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  buyer_name text NOT NULL,
  company text,
  phone text NOT NULL,
  email text,
  address text NOT NULL,
  city text,
  notes text,
  payment_method public.ml_pay_method NOT NULL,
  status public.ml_store_order_status NOT NULL DEFAULT 'NEW',
  subtotal_idr numeric(14,2) NOT NULL DEFAULT 0,
  total_idr numeric(14,2) NOT NULL DEFAULT 0,
  payment_ref text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.storefront_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.storefront_orders(id) ON DELETE CASCADE,
  inventory_id uuid REFERENCES public.admin_inventory(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  slug text,
  category public.ml_product_category,
  unit_price_idr numeric(14,2) NOT NULL,
  qty_kg numeric(12,2) NOT NULL,
  line_total_idr numeric(14,2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX storefront_order_items_order_idx ON public.storefront_order_items(order_id);
CREATE INDEX storefront_orders_created_idx ON public.storefront_orders(created_at DESC);

GRANT SELECT, UPDATE ON public.storefront_orders TO authenticated;
GRANT SELECT ON public.storefront_order_items TO authenticated;
GRANT ALL ON public.storefront_orders TO service_role;
GRANT ALL ON public.storefront_order_items TO service_role;

ALTER TABLE public.storefront_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.storefront_order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read storefront orders" ON public.storefront_orders
  FOR SELECT TO authenticated USING (public.ml_has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update storefront orders" ON public.storefront_orders
  FOR UPDATE TO authenticated USING (public.ml_has_role(auth.uid(), 'admin'))
  WITH CHECK (public.ml_has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins read storefront order items" ON public.storefront_order_items
  FOR SELECT TO authenticated USING (public.ml_has_role(auth.uid(), 'admin'));

CREATE TRIGGER storefront_orders_touch BEFORE UPDATE ON public.storefront_orders
  FOR EACH ROW EXECUTE FUNCTION public.ml_touch_updated_at();

CREATE SEQUENCE IF NOT EXISTS public.ml_store_order_seq;

CREATE OR REPLACE FUNCTION public.ml_next_store_order_no()
RETURNS text LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT 'MLO-' || to_char(now(),'YYMMDD') || '-' || lpad(nextval('public.ml_store_order_seq')::text, 4, '0');
$$;
REVOKE EXECUTE ON FUNCTION public.ml_next_store_order_no() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.ml_place_order(
  _buyer jsonb,
  _items jsonb,
  _payment_method public.ml_pay_method
) RETURNS TABLE(id uuid, order_no text, access_token text, total_idr numeric)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _order public.storefront_orders%ROWTYPE;
  _item jsonb;
  _inv public.admin_inventory%ROWTYPE;
  _qty numeric;
  _price numeric;
  _sum numeric := 0;
  _name text;
  _phone text;
  _addr text;
BEGIN
  _name := btrim(coalesce(_buyer->>'buyer_name',''));
  _phone := btrim(coalesce(_buyer->>'phone',''));
  _addr := btrim(coalesce(_buyer->>'address',''));
  IF length(_name) < 2 OR length(_phone) < 6 OR length(_addr) < 5 THEN
    RAISE EXCEPTION 'Data pemesan tidak lengkap';
  END IF;
  IF jsonb_typeof(_items) <> 'array' OR jsonb_array_length(_items) = 0
     OR jsonb_array_length(_items) > 50 THEN
    RAISE EXCEPTION 'Keranjang tidak valid';
  END IF;

  INSERT INTO public.storefront_orders (
    order_no, user_id, buyer_name, company, phone, email, address, city, notes, payment_method
  ) VALUES (
    public.ml_next_store_order_no(), auth.uid(), left(_name,120),
    left(nullif(btrim(coalesce(_buyer->>'company','')),''),160), left(_phone,40),
    left(nullif(btrim(coalesce(_buyer->>'email','')),''),160), left(_addr,500),
    left(nullif(btrim(coalesce(_buyer->>'city','')),''),120),
    left(nullif(btrim(coalesce(_buyer->>'notes','')),''),1000),
    _payment_method
  ) RETURNING * INTO _order;

  FOR _item IN SELECT * FROM jsonb_array_elements(_items) LOOP
    SELECT * INTO _inv FROM public.admin_inventory
      WHERE slug = (_item->>'slug') AND is_published IS TRUE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Produk tidak tersedia: %', _item->>'slug';
    END IF;
    _qty := round(coalesce((_item->>'qty_kg')::numeric, 0), 2);
    IF _qty <= 0 OR _qty > 100000 THEN
      RAISE EXCEPTION 'Jumlah tidak valid untuk %', _inv.name;
    END IF;
    _price := coalesce(_inv.price_idr,0) + coalesce(_inv.markup_idr,0);
    INSERT INTO public.storefront_order_items (
      order_id, inventory_id, product_name, slug, category, unit_price_idr, qty_kg, line_total_idr
    ) VALUES (
      _order.id, _inv.id, _inv.name, _inv.slug, _inv.category, _price, _qty, round(_price * _qty, 2)
    );
    _sum := _sum + round(_price * _qty, 2);
  END LOOP;

  UPDATE public.storefront_orders
     SET subtotal_idr = _sum,
         total_idr = _sum,
         status = CASE WHEN _payment_method IN ('BANK_TRANSFER','QRIS')
                       THEN 'AWAITING_PAYMENT'::public.ml_store_order_status
                       ELSE 'NEW'::public.ml_store_order_status END
   WHERE storefront_orders.id = _order.id
   RETURNING * INTO _order;

  RETURN QUERY SELECT _order.id, _order.order_no, _order.access_token, _order.total_idr;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.ml_place_order(jsonb, jsonb, public.ml_pay_method) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ml_place_order(jsonb, jsonb, public.ml_pay_method) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.ml_track_order(_order_no text, _token text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _o public.storefront_orders%ROWTYPE; _items jsonb;
BEGIN
  SELECT * INTO _o FROM public.storefront_orders
   WHERE order_no = _order_no AND access_token = _token;
  IF NOT FOUND THEN RETURN NULL; END IF;
  SELECT coalesce(jsonb_agg(jsonb_build_object(
           'product_name', i.product_name, 'slug', i.slug, 'category', i.category,
           'unit_price_idr', i.unit_price_idr, 'qty_kg', i.qty_kg, 'line_total_idr', i.line_total_idr
         ) ORDER BY i.created_at), '[]'::jsonb)
    INTO _items FROM public.storefront_order_items i WHERE i.order_id = _o.id;
  RETURN jsonb_build_object(
    'order_no', _o.order_no, 'status', _o.status, 'payment_method', _o.payment_method,
    'buyer_name', _o.buyer_name, 'address', _o.address, 'city', _o.city,
    'subtotal_idr', _o.subtotal_idr, 'total_idr', _o.total_idr,
    'created_at', _o.created_at, 'items', _items
  );
END;
$$;
REVOKE EXECUTE ON FUNCTION public.ml_track_order(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ml_track_order(text, text) TO anon, authenticated;