DO $cleanup$
DECLARE
  removed_count integer;
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.payment_events
    WHERE payment_intent_id = 'a3acbb70-580d-4154-830f-3f6f3f9902dc'::uuid
       OR (provider = 'ipaymu' AND reference = '223981')
  ) THEN
    RAISE EXCEPTION 'Legacy payment has linked events; cleanup aborted';
  END IF;

  DELETE FROM public.payment_intents
  WHERE id = 'a3acbb70-580d-4154-830f-3f6f3f9902dc'::uuid
    AND provider = 'ipaymu'
    AND reference = '223981'
    AND order_ref = 'MH-518852'
    AND amount = 635000
    AND status = 'PENDING'
    AND paid_at IS NULL
    AND NOT EXISTS (SELECT 1 FROM public.orders WHERE order_no = 'MH-518852')
    AND NOT EXISTS (SELECT 1 FROM public.buyer_orders WHERE order_no = 'MH-518852')
    AND NOT EXISTS (SELECT 1 FROM public.storefront_orders WHERE order_no = 'MH-518852');
  GET DIAGNOSTICS removed_count = ROW_COUNT;
  IF removed_count <> 1 THEN
    RAISE EXCEPTION 'Legacy pending payment changed or was not found; cleanup aborted';
  END IF;
END;
$cleanup$;