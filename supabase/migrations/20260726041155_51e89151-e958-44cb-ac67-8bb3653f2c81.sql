
REVOKE EXECUTE ON FUNCTION public.vendor_dispatch_to_hub(UUID, TEXT) FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.hub_receive(UUID, NUMERIC, NUMERIC, packaging_condition, TEXT, JSONB, JSONB) FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.create_delivery_job(UUID, DATE) FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.assign_courier(UUID, UUID, VARCHAR) FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.courier_start_delivery(UUID) FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.courier_post_location(UUID, NUMERIC, NUMERIC, NUMERIC, NUMERIC) FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.courier_complete_delivery(UUID, JSONB) FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.request_return(UUID, VARCHAR, TEXT, JSONB) FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.qc_decide(UUID, qc_decision, JSONB, packaging_condition, BOOLEAN, TEXT, JSONB) FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.next_queue_no(DATE) FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.next_return_no() FROM public, anon;

GRANT EXECUTE ON FUNCTION public.vendor_dispatch_to_hub(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.hub_receive(UUID, NUMERIC, NUMERIC, packaging_condition, TEXT, JSONB, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_delivery_job(UUID, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.assign_courier(UUID, UUID, VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION public.courier_start_delivery(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.courier_post_location(UUID, NUMERIC, NUMERIC, NUMERIC, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.courier_complete_delivery(UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_return(UUID, VARCHAR, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.qc_decide(UUID, qc_decision, JSONB, packaging_condition, BOOLEAN, TEXT, JSONB) TO authenticated;
