DROP POLICY IF EXISTS "Admins read inventory" ON public.admin_inventory;
CREATE POLICY "Admins read inventory" ON public.admin_inventory FOR SELECT TO authenticated
  USING ((SELECT public.ml_has_role((SELECT auth.uid()), 'admin'::public.ml_role)));
DROP POLICY IF EXISTS "Admins edit inventory" ON public.admin_inventory;
CREATE POLICY "Admins edit inventory" ON public.admin_inventory FOR UPDATE TO authenticated
  USING ((SELECT public.ml_has_role((SELECT auth.uid()), 'admin'::public.ml_role)))
  WITH CHECK ((SELECT public.ml_has_role((SELECT auth.uid()), 'admin'::public.ml_role)));