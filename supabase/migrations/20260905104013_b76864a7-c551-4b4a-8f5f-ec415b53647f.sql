-- Public read of product photos in the inventory-photos bucket
create policy "inventory_photos_public_read"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'inventory-photos');

-- Only platform admins may upload/replace photos
create policy "inventory_photos_admin_insert"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'inventory-photos'
  and public.ml_has_role(auth.uid(), 'admin')
);

create policy "inventory_photos_admin_update"
on storage.objects for update
to authenticated
using (
  bucket_id = 'inventory-photos'
  and public.ml_has_role(auth.uid(), 'admin')
);

create policy "inventory_photos_admin_delete"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'inventory-photos'
  and public.ml_has_role(auth.uid(), 'admin')
);