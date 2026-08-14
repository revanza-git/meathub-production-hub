GRANT SELECT, UPDATE ON public.quote_requests TO authenticated;
GRANT SELECT, UPDATE ON public.supplier_applications TO authenticated;

CREATE POLICY "Admins can read quote requests"
  ON public.quote_requests FOR SELECT TO authenticated
  USING (public.ml_has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update quote requests"
  ON public.quote_requests FOR UPDATE TO authenticated
  USING (public.ml_has_role(auth.uid(), 'admin'))
  WITH CHECK (public.ml_has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can read supplier applications"
  ON public.supplier_applications FOR SELECT TO authenticated
  USING (public.ml_has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update supplier applications"
  ON public.supplier_applications FOR UPDATE TO authenticated
  USING (public.ml_has_role(auth.uid(), 'admin'))
  WITH CHECK (public.ml_has_role(auth.uid(), 'admin'));