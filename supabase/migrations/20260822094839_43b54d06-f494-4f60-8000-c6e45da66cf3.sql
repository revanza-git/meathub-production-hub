ALTER TABLE public.storefront_orders
  ADD COLUMN IF NOT EXISTS stock_deducted_at timestamptz,
  ADD COLUMN IF NOT EXISTS admin_note text;

CREATE TABLE IF NOT EXISTS public.storefront_order_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.storefront_orders(id) ON DELETE CASCADE,
  from_status public.ml_store_order_status,
  to_status public.ml_store_order_status NOT NULL,
  note text,
  actor_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.storefront_order_events TO authenticated;
GRANT ALL ON public.storefront_order_events TO service_role;

ALTER TABLE public.storefront_order_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins read storefront order events" ON public.storefront_order_events;
CREATE POLICY "admins read storefront order events"
  ON public.storefront_order_events FOR SELECT TO authenticated
  USING (public.ml_has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS storefront_order_events_order_idx
  ON public.storefront_order_events(order_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.ml_update_store_order(
  _order_id uuid,
  _status public.ml_store_order_status,
  _payment_ref text DEFAULT NULL,
  _note text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _old public.storefront_orders%ROWTYPE;
BEGIN
  IF NOT public.ml_has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  SELECT * INTO _old FROM public.storefront_orders WHERE id = _order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  UPDATE public.storefront_orders
     SET status = _status,
         payment_ref = coalesce(nullif(btrim(coalesce(_payment_ref,'')),''), payment_ref),
         admin_note = coalesce(nullif(btrim(coalesce(_note,'')),''), admin_note),
         updated_at = now()
   WHERE id = _order_id;

  IF _status IN ('SHIPPED','COMPLETED') AND _old.stock_deducted_at IS NULL THEN
    UPDATE public.admin_inventory ai
       SET qty_on_hand_kg = greatest(coalesce(ai.qty_on_hand_kg,0) - i.qty_kg, 0),
           updated_at = now()
      FROM (
        SELECT inventory_id, sum(qty_kg) AS qty_kg
          FROM public.storefront_order_items
         WHERE order_id = _order_id AND inventory_id IS NOT NULL
         GROUP BY inventory_id
      ) i
     WHERE ai.id = i.inventory_id;

    UPDATE public.storefront_orders SET stock_deducted_at = now() WHERE id = _order_id;
  END IF;

  INSERT INTO public.storefront_order_events (order_id, from_status, to_status, note, actor_id)
  VALUES (_order_id, _old.status, _status, nullif(btrim(coalesce(_note,'')),''), auth.uid());
END;
$$;

REVOKE EXECUTE ON FUNCTION public.ml_update_store_order(uuid, public.ml_store_order_status, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ml_update_store_order(uuid, public.ml_store_order_status, text, text) TO authenticated;