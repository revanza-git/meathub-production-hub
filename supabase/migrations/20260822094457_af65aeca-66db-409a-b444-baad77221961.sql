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
    _price := coalesce(_inv.sale_price_idr,0) + coalesce(_inv.markup_idr,0);
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