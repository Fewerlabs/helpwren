-- Searching no longer stops at fifty conversations. The ticket list pages through every
-- match and shows how many there are, so the cap now belongs to the caller: the inbox asks
-- for a short list with a limit of its own. The signature is unchanged, so `create or
-- replace` keeps the grants set when the function was first made.
create or replace function public.search_conversations(query text) returns setof public.conversations
language sql stable set search_path = ''
as $$
  with term as (
    -- Treat the text literally: % and _ are wildcards in a pattern unless escaped.
    select
      '%' || replace(replace(replace(trim(query), '\', '\\'), '%', '\%'), '_', '\_') || '%'
        as pattern,
      -- A ticket number, if that is all the search is.
      case when trim(query) ~ '^#?[0-9]{1,18}$' then ltrim(trim(query), '#')::bigint end
        as ticket_number
  )
  select c.*
  from public.conversations c, term
  where c.ticket_number = term.ticket_number
    -- One letter matches nearly everything, so searching by text starts at two.
    or (
      char_length(trim(query)) >= 2
      and (
        c.subject ilike term.pattern
        or exists (
          select 1 from public.contacts k
          where k.id = c.contact_id
            and (k.name ilike term.pattern or k.email ilike term.pattern or k.phone ilike term.pattern)
        )
        or exists (
          select 1 from public.messages m
          where m.conversation_id = c.id and m.body ilike term.pattern
        )
      )
    )
  order by c.last_message_at desc nulls last;
$$;
