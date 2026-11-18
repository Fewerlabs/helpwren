-- A photo for each team member, in place of their initials.

alter table public.agents add column photo text;

-- Photos are shown wherever a team member is named, so anyone may load one by its address.
-- Each team member writes only into the folder named after their own id.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 1048576, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

create policy avatars_own_insert on storage.objects for insert to authenticated with check (
  bucket_id = 'avatars'
  and (select private.is_agent())
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
