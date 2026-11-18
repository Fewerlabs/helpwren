-- Searching the inbox. Finds conversations by who they are with (name, email, phone) or by
-- what was said in them. It runs with the caller's own access, so it can only ever return
-- conversations the caller may read.

create extension if not exists pg_trgm with schema extensions;

-- Trigram indexes make "contains" searches fast without a separate search service.
create index messages_body_search_idx on public.messages
  using gin (body extensions.gin_trgm_ops);
create index contacts_name_search_idx on public.contacts
  using gin (name extensions.gin_trgm_ops);
create index contacts_email_search_idx on public.contacts
  using gin (email extensions.gin_trgm_ops);

create function public.search_conversations(query text) returns setof public.conversations
language sql stable set search_path = ''
as $$
  with term as (
    -- Treat the text literally: % and _ are wildcards in a pattern unless escaped.
    select '%' || replace(replace(replace(trim(query), '\', '\\'), '%', '\%'), '_', '\_') || '%'
      as pattern
  )
  select c.*
  from public.conversations c, term
  -- One letter matches nearly everything, so searching starts at two.
  where char_length(trim(query)) >= 2
    and (
      exists (
        select 1 from public.contacts k
        where k.id = c.contact_id
          and (k.name ilike term.pattern or k.email ilike term.pattern or k.phone ilike term.pattern)
      )
      or exists (
        select 1 from public.messages m
        where m.conversation_id = c.id and m.body ilike term.pattern
      )
    )
  order by c.last_message_at desc nulls last
  limit 50;
$$;

revoke execute on function public.search_conversations from public, anon;
grant execute on function public.search_conversations to authenticated, service_role;
