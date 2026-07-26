
CREATE TYPE public.cart_status AS ENUM ('ACTIVE','CHECKED_OUT','ABANDONED');
CREATE TYPE public.order_status AS ENUM ('PLACED','VENDOR_REVIEW','CONFIRMED','PARTIALLY_CONFIRMED','REJECTED','CANCELLED','FULFILLING','DELIVERED','CLOSED');
CREATE TYPE public.order_line_status AS ENUM ('PENDING','CONFIRMED','REJECTED');

CREATE TABLE public.carts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  address_id UUID REFERENCES public.addresses(id) ON DELETE SET NULL,
  status public.cart_status NOT NULL DEFAULT 'ACTIVE',
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX carts_one_active_per_org ON public.carts(buyer_org_id) WHERE status = 'ACTIVE';
GRANT SELECT, INSERT, UPDATE, DELETE ON public.carts TO authenticated;
GRANT ALL ON public.carts TO service_role;
ALTER TABLE public.carts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cart_buyer_all" ON public.carts FOR ALL TO authenticated
  USING (public.is_org_member(auth.uid(), buyer_org_id))
  WITH CHECK (public.is_org_member(auth.uid(), buyer_org_id));
CREATE TRIGGER carts_set_updated BEFORE UPDATE ON public.carts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id UUID NOT NULL REFERENCES public.carts(id) ON DELETE CASCADE,
  offer_id UUID NOT NULL REFERENCES public.vendor_offers(id) ON DELETE CASCADE,
  qty_kg NUMERIC(12,3) NOT NULL CHECK (qty_kg > 0),
  unit_price_snapshot NUMERIC(14,2) NOT NULL,
  hold_expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '30 minutes'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (cart_id, offer_id)
);
CREATE INDEX cart_items_cart_idx ON public.cart_items(cart_id);
CREATE INDEX cart_items_offer_idx ON public.cart_items(offer_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cart_items TO authenticated;
GRANT ALL ON public.cart_items TO service_role;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cart_items_buyer_all" ON public.cart_items FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.carts c
    WHERE c.id = cart_id AND public.is_org_member(auth.uid(), c.buyer_org_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.carts c
    WHERE c.id = cart_id AND public.is_org_member(auth.uid(), c.buyer_org_id)));
CREATE TRIGGER cart_items_set_updated BEFORE UPDATE ON public.cart_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE SEQUENCE IF NOT EXISTS public.order_no_seq;

CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_no TEXT NOT NULL UNIQUE,
  buyer_org_id UUID NOT NULL REFERENCES public.organizations(id),
  address_id UUID REFERENCES public.addresses(id),
  service_zone public.service_zone,
  status public.order_status NOT NULL DEFAULT 'PLACED',
  subtotal NUMERIC(14,2) NOT NULL DEFAULT 0,
  shipping_fee NUMERIC(14,2) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_kg NUMERIC(12,3) NOT NULL DEFAULT 0,
  notes TEXT,
  placed_by UUID REFERENCES auth.users(id),
  placed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX orders_buyer_idx ON public.orders(buyer_org_id, placed_at DESC);
CREATE INDEX orders_status_idx ON public.orders(status);
GRANT SELECT, INSERT, UPDATE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER orders_set_updated BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  offer_id UUID NOT NULL REFERENCES public.vendor_offers(id),
  vendor_id UUID NOT NULL REFERENCES public.organizations(id),
  product_id UUID NOT NULL REFERENCES public.products(id),
  qty_kg NUMERIC(12,3) NOT NULL CHECK (qty_kg > 0),
  unit_price NUMERIC(14,2) NOT NULL,
  line_total NUMERIC(14,2) NOT NULL,
  vendor_status public.order_line_status NOT NULL DEFAULT 'PENDING',
  vendor_decided_at TIMESTAMPTZ,
  vendor_decided_by UUID REFERENCES auth.users(id),
  vendor_reject_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX order_items_order_idx ON public.order_items(order_id);
CREATE INDEX order_items_vendor_idx ON public.order_items(vendor_id, vendor_status);
GRANT SELECT, INSERT, UPDATE ON public.order_items TO authenticated;
GRANT ALL ON public.order_items TO service_role;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "order_items_buyer_read" ON public.order_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orders o
    WHERE o.id = order_id AND public.is_org_member(auth.uid(), o.buyer_org_id)));
CREATE POLICY "order_items_vendor_read" ON public.order_items FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), vendor_id));
CREATE POLICY "order_items_internal_read" ON public.order_items FOR SELECT TO authenticated
  USING (public.is_internal(auth.uid()));
CREATE TRIGGER order_items_set_updated BEFORE UPDATE ON public.order_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Now add order policies that reference order_items
CREATE POLICY "orders_buyer_read" ON public.orders FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), buyer_org_id));
CREATE POLICY "orders_vendor_read" ON public.orders FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.order_items oi
    WHERE oi.order_id = orders.id AND public.is_org_member(auth.uid(), oi.vendor_id)));
CREATE POLICY "orders_internal_read" ON public.orders FOR SELECT TO authenticated
  USING (public.is_internal(auth.uid()));

CREATE TABLE public.order_state_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  from_state public.order_status,
  to_state public.order_status NOT NULL,
  actor_user_id UUID REFERENCES auth.users(id),
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX order_state_history_order_idx ON public.order_state_history(order_id, created_at DESC);
GRANT SELECT, INSERT ON public.order_state_history TO authenticated;
GRANT ALL ON public.order_state_history TO service_role;
ALTER TABLE public.order_state_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "order_state_history_read" ON public.order_state_history FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orders o
    WHERE o.id = order_id AND (
      public.is_org_member(auth.uid(), o.buyer_org_id)
      OR public.is_internal(auth.uid())
      OR EXISTS (SELECT 1 FROM public.order_items oi WHERE oi.order_id = o.id AND public.is_org_member(auth.uid(), oi.vendor_id))
    )));

CREATE OR REPLACE FUNCTION public.next_order_no()
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _n BIGINT;
BEGIN
  _n := nextval('public.order_no_seq');
  RETURN 'SB-' || to_char(now(),'YYYYMMDD') || '-' || lpad(_n::text, 6, '0');
END $$;

CREATE OR REPLACE FUNCTION public.checkout_cart(_notes TEXT DEFAULT NULL)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid UUID := auth.uid();
  _cart RECORD;
  _order_id UUID;
  _order_no TEXT;
  _subtotal NUMERIC(14,2) := 0;
  _total_kg NUMERIC(12,3) := 0;
  _shipping NUMERIC(14,2) := 0;
  _tax NUMERIC(14,2) := 0;
  _org RECORD;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT c.* INTO _cart FROM public.carts c
    WHERE c.status='ACTIVE' AND public.is_org_member(_uid, c.buyer_org_id)
    ORDER BY c.created_at DESC LIMIT 1 FOR UPDATE;
  IF _cart.id IS NULL THEN RAISE EXCEPTION 'No active cart'; END IF;
  IF _cart.address_id IS NULL THEN RAISE EXCEPTION 'Delivery address required'; END IF;
  SELECT * INTO _org FROM public.organizations WHERE id = _cart.buyer_org_id;
  IF _org.status <> 'APPROVED' THEN RAISE EXCEPTION 'Buyer organization must be APPROVED'; END IF;
  PERFORM 1 FROM public.cart_items WHERE cart_id = _cart.id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Cart is empty'; END IF;

  SELECT COALESCE(sum(ci.qty_kg * ci.unit_price_snapshot),0),
         COALESCE(sum(ci.qty_kg),0)
    INTO _subtotal, _total_kg
    FROM public.cart_items ci WHERE ci.cart_id = _cart.id;

  _shipping := CASE WHEN _total_kg >= 20 THEN 0 ELSE 25000 END;
  _tax := round(_subtotal * 0.11, 2);
  _order_no := public.next_order_no();

  INSERT INTO public.orders(order_no, buyer_org_id, address_id, service_zone, status,
    subtotal, shipping_fee, tax_amount, total_amount, total_kg, notes, placed_by)
  SELECT _order_no, _cart.buyer_org_id, _cart.address_id, a.service_zone, 'VENDOR_REVIEW',
    _subtotal, _shipping, _tax, _subtotal + _shipping + _tax, _total_kg, _notes, _uid
  FROM public.addresses a WHERE a.id = _cart.address_id
  RETURNING id INTO _order_id;

  INSERT INTO public.order_items(order_id, offer_id, vendor_id, product_id, qty_kg, unit_price, line_total)
  SELECT _order_id, ci.offer_id, vo.vendor_id, vo.product_id, ci.qty_kg, ci.unit_price_snapshot,
         round(ci.qty_kg * ci.unit_price_snapshot, 2)
  FROM public.cart_items ci
  JOIN public.vendor_offers vo ON vo.id = ci.offer_id;

  INSERT INTO public.order_state_history(order_id, from_state, to_state, actor_user_id, reason)
  VALUES (_order_id, 'PLACED', 'VENDOR_REVIEW', _uid, 'checkout');

  INSERT INTO public.audit_events(action, entity_type, entity_id, organization_id, actor_user_id, to_state)
  VALUES ('order.create','order', _order_id, _cart.buyer_org_id, _uid,
          jsonb_build_object('order_no', _order_no, 'total', _subtotal + _shipping + _tax));

  UPDATE public.carts SET status='CHECKED_OUT', updated_at=now() WHERE id = _cart.id;
  RETURN _order_id;
END $$;

CREATE OR REPLACE FUNCTION public.vendor_decide_order_item(_item_id UUID, _decision TEXT, _reason TEXT DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid UUID := auth.uid();
  _item RECORD;
  _order_id UUID;
  _confirmed INT; _rejected INT; _pending INT; _prev public.order_status; _next public.order_status;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _decision NOT IN ('CONFIRM','REJECT') THEN RAISE EXCEPTION 'Invalid decision'; END IF;
  SELECT * INTO _item FROM public.order_items WHERE id = _item_id FOR UPDATE;
  IF _item.id IS NULL THEN RAISE EXCEPTION 'Item not found'; END IF;
  IF NOT public.is_org_member(_uid, _item.vendor_id) THEN RAISE EXCEPTION 'Not your item'; END IF;
  IF _item.vendor_status <> 'PENDING' THEN RAISE EXCEPTION 'Item already decided'; END IF;
  IF _decision='REJECT' AND (_reason IS NULL OR length(trim(_reason)) < 3) THEN
    RAISE EXCEPTION 'Reject reason required'; END IF;

  UPDATE public.order_items SET
    vendor_status = CASE WHEN _decision='CONFIRM' THEN 'CONFIRMED'::public.order_line_status ELSE 'REJECTED'::public.order_line_status END,
    vendor_decided_at = now(), vendor_decided_by = _uid, vendor_reject_reason = _reason
    WHERE id = _item_id;

  _order_id := _item.order_id;

  SELECT count(*) FILTER (WHERE vendor_status='CONFIRMED'),
         count(*) FILTER (WHERE vendor_status='REJECTED'),
         count(*) FILTER (WHERE vendor_status='PENDING')
    INTO _confirmed, _rejected, _pending
    FROM public.order_items WHERE order_id = _order_id;

  SELECT status INTO _prev FROM public.orders WHERE id = _order_id FOR UPDATE;

  IF _pending = 0 THEN
    IF _rejected = 0 THEN _next := 'CONFIRMED';
    ELSIF _confirmed = 0 THEN _next := 'REJECTED';
    ELSE _next := 'PARTIALLY_CONFIRMED';
    END IF;
    UPDATE public.orders SET status = _next, updated_at = now() WHERE id = _order_id;
    INSERT INTO public.order_state_history(order_id, from_state, to_state, actor_user_id, reason)
    VALUES (_order_id, _prev, _next, _uid, 'vendor decisions complete');
  END IF;

  INSERT INTO public.audit_events(action, entity_type, entity_id, organization_id, actor_user_id, reason)
  VALUES ('order_item.decide','order_item', _item_id, _item.vendor_id, _uid, _decision || COALESCE(': '||_reason,''));
END $$;

CREATE OR REPLACE FUNCTION public.cancel_order(_order_id UUID, _reason TEXT)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid UUID := auth.uid(); _prev public.order_status; _buyer UUID;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT status, buyer_org_id INTO _prev, _buyer FROM public.orders WHERE id=_order_id FOR UPDATE;
  IF _prev IS NULL THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF NOT public.is_org_member(_uid, _buyer) THEN RAISE EXCEPTION 'Not your order'; END IF;
  IF _prev IN ('FULFILLING','DELIVERED','CLOSED','CANCELLED') THEN
    RAISE EXCEPTION 'Cannot cancel from %', _prev; END IF;
  IF _reason IS NULL OR length(trim(_reason))<3 THEN RAISE EXCEPTION 'Reason required'; END IF;
  UPDATE public.orders SET status='CANCELLED', updated_at=now() WHERE id=_order_id;
  INSERT INTO public.order_state_history(order_id, from_state, to_state, actor_user_id, reason)
  VALUES (_order_id, _prev, 'CANCELLED', _uid, _reason);
  INSERT INTO public.audit_events(action, entity_type, entity_id, organization_id, actor_user_id, reason)
  VALUES ('order.cancel','order', _order_id, _buyer, _uid, _reason);
END $$;

REVOKE EXECUTE ON FUNCTION public.checkout_cart(TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.vendor_decide_order_item(UUID, TEXT, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cancel_order(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.checkout_cart(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.vendor_decide_order_item(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_order(UUID, TEXT) TO authenticated;
