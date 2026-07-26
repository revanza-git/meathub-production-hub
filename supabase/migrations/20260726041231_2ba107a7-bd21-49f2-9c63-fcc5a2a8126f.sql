
CREATE OR REPLACE FUNCTION public._create_fulfillment_on_confirm()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status IN ('CONFIRMED','PARTIALLY_CONFIRMED')
     AND (OLD.status IS DISTINCT FROM NEW.status)
     AND NOT EXISTS (SELECT 1 FROM public.fulfillments WHERE order_id = NEW.id) THEN
    INSERT INTO public.fulfillments(order_id, buyer_org_id, delivery_address_id, hub_deadline_at)
    VALUES (NEW.id, NEW.buyer_org_id, NEW.address_id, now() + INTERVAL '24 hours');

    UPDATE public.orders SET status = 'FULFILLING', updated_at = now() WHERE id = NEW.id;

    INSERT INTO public.order_state_history(order_id, from_state, to_state, actor_user_id, reason)
    VALUES (NEW.id, NEW.status, 'FULFILLING', NULL, 'auto: fulfillment created');
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public._create_fulfillment_on_confirm() FROM public, anon;
