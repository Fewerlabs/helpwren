-- A place for the install's logo. It is shown to every visitor, so anyone may read it by its
-- address; only an admin may put a file there, change one or remove one. The size and type
-- limits match the ones the client library checks before uploading.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('brand', 'brand', true, 1048576, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

create policy brand_admin_insert on storage.objects for insert to authenticated with check (
  bucket_id = 'brand' and (select private.is_admin())
);

create policy brand_admin_update on storage.objects for update to authenticated
  using (bucket_id = 'brand' and (select private.is_admin()))
  with check (bucket_id = 'brand' and (select private.is_admin()));

create policy brand_admin_delete on storage.objects for delete to authenticated using (
  bucket_id = 'brand' and (select private.is_admin())
);
