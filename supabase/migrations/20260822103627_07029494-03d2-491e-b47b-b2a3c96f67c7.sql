GRANT SELECT ON public.storefront_orders TO authenticated;
GRANT SELECT ON public.storefront_order_items TO authenticated;
GRANT ALL ON public.storefront_orders TO service_role;
GRANT ALL ON public.storefront_order_items TO service_role;
GRANT SELECT ON public.storefront_order_events TO authenticated;
GRANT ALL ON public.storefront_order_events TO service_role;

CREATE POLICY "Buyers read own storefront orders"
ON public.storefront_orders FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Buyers read own storefront order items"
ON public.storefront_order_items FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.storefront_orders o
               WHERE o.id = storefront_order_items.order_id AND o.user_id = auth.uid()));