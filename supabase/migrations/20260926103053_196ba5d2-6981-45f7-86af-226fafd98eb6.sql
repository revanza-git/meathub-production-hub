-- Admins can archive inventory, but may not physically erase it through the Data API.
REVOKE DELETE ON public.admin_inventory FROM authenticated;
DROP POLICY IF EXISTS "Admins manage inventory" ON public.admin_inventory;
CREATE POLICY "Admins read inventory" ON public.admin_inventory FOR SELECT TO authenticated USING (public.ml_has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins add inventory" ON public.admin_inventory FOR INSERT TO authenticated WITH CHECK (public.ml_has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins edit inventory" ON public.admin_inventory FOR UPDATE TO authenticated USING (public.ml_has_role(auth.uid(), 'admin')) WITH CHECK (public.ml_has_role(auth.uid(), 'admin'));
ALTER TABLE public.ml_buyer_prices DROP CONSTRAINT IF EXISTS ml_buyer_prices_inventory_id_fkey;
ALTER TABLE public.ml_buyer_prices ADD CONSTRAINT ml_buyer_prices_inventory_id_fkey FOREIGN KEY (inventory_id) REFERENCES public.admin_inventory(id) ON DELETE RESTRICT;

CREATE TABLE public.ml_inventory_imports (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 actor_user_id uuid NOT NULL REFERENCES auth.users(id),
 file_name text NOT NULL,
 row_count integer NOT NULL,
 inserted_count integer NOT NULL,
 skipped_count integer NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.ml_inventory_imports TO authenticated;
GRANT ALL ON public.ml_inventory_imports TO service_role;
ALTER TABLE public.ml_inventory_imports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read import history" ON public.ml_inventory_imports FOR SELECT TO authenticated USING (public.ml_has_role(auth.uid(), 'admin'));
CREATE TRIGGER ml_inventory_imports_touch BEFORE UPDATE ON public.ml_inventory_imports FOR EACH ROW EXECUTE FUNCTION public.ml_touch_updated_at();

-- One transactional import: any validation or insert failure rolls back every row and its audit entry.
CREATE FUNCTION public.ml_import_inventory_append(_file_name text, _items jsonb, _skipped integer DEFAULT 0)
RETURNS integer LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE _count integer; _inserted integer := 0; _item jsonb; _name text; _brand text; _key text; _seen text[] := ARRAY[]::text[]; _price numeric; _qty numeric; _markup numeric;
BEGIN
 IF NOT public.ml_has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Not authorized'; END IF;
 IF _file_name IS NULL OR length(trim(_file_name)) = 0 OR length(_file_name) > 255 THEN RAISE EXCEPTION 'Invalid filename'; END IF;
 IF jsonb_typeof(_items) IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Expected a list of items'; END IF;
 _count := jsonb_array_length(_items);
 IF _count < 1 OR _count > 2000 OR _skipped < 0 THEN RAISE EXCEPTION 'Invalid import size'; END IF;
 -- Serialize imports so concurrent requests cannot bypass the duplicate check.
 PERFORM pg_advisory_xact_lock(81927641);
 FOR _item IN SELECT value FROM jsonb_array_elements(_items) LOOP
   IF jsonb_typeof(_item) IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'Invalid item'; END IF;
   _name := trim(_item->>'name'); _brand := trim(coalesce(_item->>'brand', ''));
   IF _name IS NULL OR _name = '' OR length(_name) > 500 OR length(_brand) > 500 THEN RAISE EXCEPTION 'Invalid product name'; END IF;
   _key := public.ml_slugify(_brand || '-' || _name);
   IF _key = '' OR _key = ANY(_seen) THEN RAISE EXCEPTION 'Duplicate row in file'; END IF;
   _seen := array_append(_seen, _key);
   IF EXISTS (SELECT 1 FROM public.admin_inventory i WHERE public.ml_slugify(i.brand || '-' || i.name) = _key) THEN RAISE EXCEPTION 'Item already exists: %', _name; END IF;
   _price := (_item->>'sale_price_idr')::numeric; _qty := (_item->>'qty_on_hand_kg')::numeric; _markup := (_item->>'markup_idr')::numeric;
   IF _price IS NULL OR _price < 0 OR _qty IS NULL OR _qty < 0 OR _markup IS NULL OR _markup < 0 THEN RAISE EXCEPTION 'Invalid price or quantity'; END IF;
   INSERT INTO public.admin_inventory (origin, brand, name, condition, category, grade_band, cut_type, avg_weight_text, avg_weight_kg, sale_price_idr, markup_idr, promo_price_idr, promo_until, qty_on_hand_kg, sale_channels, retail_price_idr, retail_pack_text)
   VALUES (coalesce(nullif(trim(_item->>'origin'), ''), 'Other'), _brand, _name, nullif(_item->>'condition', ''), (_item->>'category')::public.ml_product_category, (_item->>'grade_band')::public.ml_grade_band, coalesce(_item->>'cut_type', ''), nullif(_item->>'avg_weight_text', ''), nullif(_item->>'avg_weight_kg', '')::numeric, _price, _markup, nullif(_item->>'promo_price_idr', '')::numeric, nullif(_item->>'promo_until', '')::date, _qty, ARRAY(SELECT jsonb_array_elements_text(_item->'sale_channels')), nullif(_item->>'retail_price_idr', '')::numeric, nullif(_item->>'retail_pack_text', ''));
   _inserted := _inserted + 1;
 END LOOP;
 INSERT INTO public.ml_inventory_imports (actor_user_id, file_name, row_count, inserted_count, skipped_count) VALUES (auth.uid(), _file_name, _count + _skipped, _inserted, _skipped);
 RETURN _inserted;
END $$;
REVOKE ALL ON FUNCTION public.ml_import_inventory_append(text, jsonb, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ml_import_inventory_append(text, jsonb, integer) TO authenticated;