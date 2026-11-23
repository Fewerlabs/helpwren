-- The team picks a picture already uploaded for an article from a library, so it may list the
-- pictures in the articles bucket. Anyone may still fetch a picture by its address, as before;
-- only the team may list them.
create policy article_images_agent_select on storage.objects for select to authenticated using (
  bucket_id = 'articles' and (select private.is_agent())
);
