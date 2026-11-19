-- What a help article carries besides its words, as the established help desks do: tags to
-- find and group it by, a title and description of its own for search engines, where it is
-- shown, and whether it is one to put forward.

alter table public.articles
  -- Free labels, such as {'refunds', 'ios'}: lower case, and at most twenty to an article.
  add column tags text[] not null default '{}' check (
    cardinality(tags) <= 20 and array_position(tags, null) is null
  ),
  -- 'public': on the help center and in the chat. 'in_app': in the chat only, left out of the
  -- public site and its sitemap. Either way a published article can be read by anyone who
  -- has its address, so this is about where it is listed, not a secret.
  add column visibility text not null default 'public' check (visibility in ('public', 'in_app')),
  -- Put forward on the help center's home page and at the top of the chat's suggestions.
  add column featured boolean not null default false,
  -- For search engines and shared links, when they should differ from the title and summary.
  add column meta_title text check (char_length(meta_title) <= 70),
  add column meta_description text check (char_length(meta_description) <= 200);

create index articles_tags_idx on public.articles using gin (tags);

-- A generated column may only use functions whose result never changes for the same input.
-- Joining an array into text is not marked that way in Postgres, though for text it is.
create function private.join_words(words text[]) returns text
language sql immutable parallel safe set search_path = ''
as $$ select coalesce(array_to_string(words, ' '), ''); $$;

grant execute on function private.join_words(text[]) to anon, authenticated, service_role;

-- Search looks through tags as well, as heavily as the summary.
alter table public.articles drop column search;
alter table public.articles add column search tsvector generated always as (
  setweight(to_tsvector('english', title), 'A')
  || setweight(to_tsvector('english', coalesce(summary, '')), 'B')
  || setweight(to_tsvector('english', private.join_words(tags)), 'B')
  || setweight(
       jsonb_to_tsvector(
         'english', jsonb_path_query_array(body, 'strict $.**.text', '{}', true), '["string"]'
       ),
       'C'
     )
) stored;

create index articles_search_idx on public.articles using gin (search);
