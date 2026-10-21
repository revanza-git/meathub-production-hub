DROP POLICY IF EXISTS "Anyone can submit a supplier application" ON public.supplier_applications;
CREATE POLICY "Anyone can submit a supplier application"
  ON public.supplier_applications FOR INSERT TO anon, authenticated
  WITH CHECK (
    status = 'new'
    AND length(btrim(company_name)) BETWEEN 1 AND 200
    AND length(btrim(contact_name)) BETWEEN 1 AND 200
    AND length(btrim(whatsapp)) BETWEEN 1 AND 40
    AND coalesce(length(email), 0) <= 255
    AND coalesce(length(brands_represented), 0) <= 600
    AND coalesce(length(origins), 0) <= 400
    AND coalesce(length(product_categories), 0) <= 400
    AND coalesce(length(delivery_coverage), 0) <= 400
    AND coalesce(length(moq), 0) <= 200
    AND coalesce(length(payment_terms), 0) <= 200
    AND coalesce(length(notes), 0) <= 1200
  );

DROP POLICY IF EXISTS inventory_photos_public_read ON storage.objects;
CREATE POLICY inventory_photos_admin_read ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'inventory-photos' AND meatlink_private.ml_has_role((SELECT auth.uid()), 'admin'::ml_role));