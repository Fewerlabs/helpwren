-- The knowledge base: articles the team writes, sorted into collections, and shown on the public
-- help center and inside the chat. A published article and its collection can be read by
-- anyone, including a visitor with no session. Drafts are for the team, and only the team writes.

create table public.collections (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(btrim(name)) between 1 and 80),
  -- Part of every address under it (/help/{slug}), so it is lower case words joined by hyphens.
  -- "search" and "preview" are pages of the help center itself.
  slug        text not null unique check (
    slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
    and char_length(slug) <= 80
    and slug not in ('search', 'preview')
  ),
  description text check (char_length(description) <= 300),
  -- The name of an icon in the design system, such as "book-open".
  icon        text not null default 'book-open' check (icon ~ '^[a-z0-9-]{1,40}$'),
  -- Where it sits among the collections, lowest first.
  position    integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.articles (
  id            uuid primary key default gen_random_uuid(),
  -- A draft may wait without a collection. A collection cannot be removed while it holds
  -- articles, so a published article never loses its address by accident.
  collection_id uuid references public.collections on delete restrict,
  title         text not null check (char_length(btrim(title)) between 1 and 160),
  slug          text not null unique check (
    slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 120
  ),
  summary       text check (char_length(summary) <= 300),
  -- The article as a document tree (headings, paragraphs, lists and so on), not as HTML. The
  -- app turns the tree into a page itself and draws only the kinds of node it knows, so
  -- nothing stored here can run as a script.
  body          jsonb not null default '{"type": "doc", "content": []}' check (
    jsonb_typeof(body) = 'object' and pg_column_size(body) <= 1048576
  ),
  status        text not null default 'draft' check (status in ('draft', 'published')),
  -- Where it sits in its collection, lowest first.
  position      integer not null default 0,
  author_id     uuid references public.agents on delete set null,
  -- When it was first published.
  published_at  timestamptz,
  created_at    timestamptz not null default now(),
  -- When its words last changed. Reordering and publishing do not count.
  updated_at    timestamptz not null default now(),
  -- What search looks through: the title first, then the summary, then every piece of text in
  -- the body.
  search        tsvector generated always as (
    setweight(to_tsvector('english', title), 'A')
    || setweight(to_tsvector('english', coalesce(summary, '')), 'B')
    || setweight(
         jsonb_to_tsvector(
           'english', jsonb_path_query_array(body, 'strict $.**.text', '{}', true), '["string"]'
         ),
         'C'
       )
  ) stored,
  constraint articles_published_in_collection check (
    status = 'draft' or collection_id is not null
  )
);

create index articles_collection_id_idx on public.articles (collection_id, position);
create index articles_published_idx on public.articles (collection_id) where status = 'published';
create index articles_search_idx on public.articles using gin (search);

-- Keeps what the browser should not be trusted with: who wrote an article, when it was
-- published, when it changed, and that a published address stays put.
create function private.prepare_article() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    -- A team member writes as themselves. The server, with no signed-in user, is trusted.
    if auth.uid() is not null then
      new.author_id := auth.uid();
    end if;
  else
    if new.slug <> old.slug and old.status = 'published' and new.status = 'published' then
      raise exception 'A published article keeps its address. Unpublish it to change it.'
        using errcode = 'HW409';
    end if;
    if new.title is distinct from old.title
       or new.summary is distinct from old.summary
       or new.body is distinct from old.body
    then
      new.updated_at := now();
    end if;
  end if;

  -- New in a collection, by being made or moved there: it goes to the end.
  if tg_op = 'INSERT' or new.collection_id is distinct from old.collection_id then
    new.position := coalesce(
      (select max(position) from public.articles
       where collection_id is not distinct from new.collection_id and id <> new.id),
      0
    ) + 1;
  end if;

  if new.status = 'published' and new.published_at is null then
    new.published_at := now();
  end if;
  return new;
end;
$$;

create trigger articles_prepare before insert or update on public.articles
  for each row execute function private.prepare_article();

create function private.prepare_collection() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.position := coalesce((select max(position) from public.collections), 0) + 1;
    return new;
  end if;
  -- Its slug is in the address of every article in it.
  if new.slug <> old.slug and exists (
    select 1 from public.articles where collection_id = old.id and status = 'published'
  ) then
    raise exception 'A collection with published articles keeps its address.'
      using errcode = 'HW409';
  end if;
  if new.name is distinct from old.name
     or new.description is distinct from old.description
     or new.icon is distinct from old.icon
  then
    new.updated_at := now();
  end if;
  return new;
end;
$$;

create trigger collections_prepare before insert or update on public.collections
  for each row execute function private.prepare_collection();

-- Access rules. Published articles are public; a collection is public once it has one.
alter table public.articles enable row level security;
revoke all on public.articles from anon, authenticated;
grant select on public.articles to anon;
grant select, insert, update, delete on public.articles to authenticated;

create policy articles_read on public.articles for select to anon, authenticated using (
  status = 'published' or (select private.is_agent())
);
create policy articles_agent_insert on public.articles for insert to authenticated with check (
  (select private.is_agent())
);
create policy articles_agent_update on public.articles for update to authenticated
  using ((select private.is_agent()))
  with check ((select private.is_agent()));
create policy articles_agent_delete on public.articles for delete to authenticated using (
  (select private.is_agent())
);

alter table public.collections enable row level security;
revoke all on public.collections from anon, authenticated;
grant select on public.collections to anon;
grant select, insert, update, delete on public.collections to authenticated;

create policy collections_read on public.collections for select to anon, authenticated using (
  (select private.is_agent())
  or exists (
    select 1 from public.articles a
    where a.collection_id = collections.id and a.status = 'published'
  )
);
create policy collections_agent_insert on public.collections for insert to authenticated
with check ((select private.is_agent()));
create policy collections_agent_update on public.collections for update to authenticated
  using ((select private.is_agent()))
  with check ((select private.is_agent()));
create policy collections_agent_delete on public.collections for delete to authenticated using (
  (select private.is_agent())
);

-- Search. Each word typed is matched from its start, so "instal" finds "installing" while the
-- person is still typing. It runs with the caller's own access: a visitor finds published
-- articles, and a team member finds drafts too.
create function public.search_articles(query text) returns setof public.articles
language sql stable set search_path = ''
as $$
  with terms as (
    select to_tsquery('english', string_agg(word || ':*', ' & ')) as wanted
    from regexp_split_to_table(lower(query), '[^[:alnum:]]+') as word
    where word <> ''
  )
  select a.*
  from public.articles a, terms
  where a.search @@ terms.wanted
  order by ts_rank_cd(a.search, terms.wanted) desc, a.updated_at desc
  limit 50;
$$;

revoke execute on function public.search_articles from public;
grant execute on function public.search_articles to anon, authenticated, service_role;

-- Putting a list in a new order in one request: each id takes the place it has in the list.
-- These run with the caller's own access, so only the team can reorder anything.
create function public.reorder_articles(ids uuid[]) returns void
language sql set search_path = ''
as $$
  update public.articles a set position = wanted.place
  from unnest(ids) with ordinality as wanted (id, place)
  where a.id = wanted.id;
$$;

create function public.reorder_collections(ids uuid[]) returns void
language sql set search_path = ''
as $$
  update public.collections c set position = wanted.place
  from unnest(ids) with ordinality as wanted (id, place)
  where c.id = wanted.id;
$$;

revoke execute on function public.reorder_articles from public, anon;
revoke execute on function public.reorder_collections from public, anon;
grant execute on function public.reorder_articles to authenticated, service_role;
grant execute on function public.reorder_collections to authenticated, service_role;

-- "Was this helpful?" One row per answer. Anyone reading a published article may answer;
-- only the team reads the answers.
create table public.article_feedback (
  id         uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.articles on delete cascade,
  helpful    boolean not null,
  created_at timestamptz not null default now()
);

create index article_feedback_article_id_idx on public.article_feedback (article_id);

alter table public.article_feedback enable row level security;
revoke all on public.article_feedback from anon, authenticated;
grant insert on public.article_feedback to anon;
grant select, insert on public.article_feedback to authenticated;

create policy article_feedback_insert on public.article_feedback for insert
to anon, authenticated with check (
  exists (
    select 1 from public.articles a where a.id = article_id and a.status = 'published'
  )
);
create policy article_feedback_agent_read on public.article_feedback for select to authenticated
using ((select private.is_agent()));

-- How each article has been rated, for the dashboard. It runs with the caller's own access,
-- so it is empty for anyone who is not on the team.
create view public.article_feedback_totals with (security_invoker = true) as
select
  article_id,
  (count(*) filter (where helpful))::integer as helpful,
  (count(*) filter (where not helpful))::integer as unhelpful
from public.article_feedback
group by article_id;

revoke all on public.article_feedback_totals from anon, authenticated;
grant select on public.article_feedback_totals to authenticated;

-- Pictures in articles. Published articles are public, so the bucket is too: a picture is
-- reached by its address. Only the team may add or remove one.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'articles', 'articles', true, 5242880,
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;

create policy article_images_agent_insert on storage.objects for insert to authenticated
with check (bucket_id = 'articles' and (select private.is_agent()));

create policy article_images_agent_delete on storage.objects for delete to authenticated using (
  bucket_id = 'articles' and (select private.is_agent())
);
