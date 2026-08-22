CREATE OR REPLACE FUNCTION public.ml_place_order(_buyer jsonb, _items jsonb, _payment_method ml_pay_method, _coupon text DEFAULT NULL::text)
 RETURNS TABLE(id uuid, order_no text, access_token text, total_idr numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _order public.storefront_orders%ROWTYPE;
  _item jsonb;
  _inv public.admin_inventory%ROWTYPE;
  _qty numeric;
  _price numeric;
  _contract numeric;
  _sum numeric := 0;
  _name text;
  _phone text;
  _addr text;
  _coupon_res jsonb;
  _discount numeric := 0;
  _code text := NULL;
  _credit jsonb;
  _term integer := NULL;
  _due date := NULL;
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

  IF _payment_method = 'TOP' THEN
    IF auth.uid() IS NULL THEN
      RAISE EXCEPTION 'Pembayaran tempo hanya untuk akun terdaftar';
    END IF;
    _credit := public.ml_my_credit();
    IF _credit IS NULL OR (_credit->>'status') <> 'APPROVED' THEN
      RAISE EXCEPTION 'Limit tempo belum disetujui';
    END IF;
    _term := (_credit->>'term_days')::integer;
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

    IF public.ml_promo_active(_inv.promo_price_idr, _inv.promo_until, _price) THEN
      _price := _inv.promo_price_idr;
    END IF;

    IF auth.uid() IS NOT NULL THEN
      SELECT bp.price_idr INTO _contract FROM public.ml_buyer_prices bp
       WHERE bp.user_id = auth.uid() AND bp.inventory_id = _inv.id
         AND (bp.valid_until IS NULL OR bp.valid_until >= current_date);
      IF _contract IS NOT NULL THEN
        _price := least(_price, _contract);
      END IF;
      _contract := NULL;
    END IF;

    INSERT INTO public.storefront_order_items (
      order_id, inventory_id, product_name, slug, category, unit_price_idr, qty_kg, line_total_idr
    ) VALUES (
      _order.id, _inv.id, _inv.name, _inv.slug, _inv.category, _price, _qty, round(_price * _qty, 2)
    );
    _sum := _sum + round(_price * _qty, 2);
  END LOOP;

  IF nullif(btrim(coalesce(_coupon,'')),'') IS NOT NULL THEN
    _coupon_res := public.ml_validate_coupon(_coupon, _sum);
    IF (_coupon_res->>'valid')::boolean THEN
      _discount := coalesce((_coupon_res->>'discount_idr')::numeric, 0);
      _code := _coupon_res->>'code';
      UPDATE public.ml_coupons SET used_count = used_count + 1, updated_at = now()
       WHERE upper(code) = upper(_code);
    ELSE
      RAISE EXCEPTION '%', coalesce(_coupon_res->>'reason', 'Kode promo tidak berlaku');
    END IF;
  END IF;

  IF _term IS NOT NULL THEN
    IF (_sum - _discount) > coalesce((_credit->>'available_idr')::numeric, 0) THEN
      RAISE EXCEPTION 'Nilai pesanan melebihi sisa limit tempo';
    END IF;
    _due := (current_date + _term);
  END IF;

  UPDATE public.storefront_orders
     SET subtotal_idr = _sum,
         discount_idr = _discount,
         coupon_code = _code,
         credit_term_days = _term,
         due_date = _due,
         total_idr = greatest(_sum - _discount, 0),
         status = CASE WHEN _payment_method IN ('BANK_TRANSFER','QRIS')
                       THEN 'AWAITING_PAYMENT'::public.ml_store_order_status
                       ELSE 'NEW'::public.ml_store_order_status END
   WHERE storefront_orders.id = _order.id
   RETURNING * INTO _order;

  RETURN QUERY SELECT _order.id, _order.order_no, _order.access_token, _order.total_idr;
END;
$function$;