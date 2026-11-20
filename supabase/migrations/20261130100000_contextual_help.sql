-- Contextual help: the articles that fit the page a visitor is on. A page describes what it
-- wants with a filter, or the team maps pages to filters with rules, and `find_articles`
-- evaluates the filter here, in the database, over published articles only.

-- What an article carries besides its collection and tags, so a filter can pick it out.
alter table public.articles
  -- Who it is for, as the values the install's identity adapter gives a user, such as
  -- {'business'}. Empty: everyone.
  add column audiences text[] not null default '{}' check (
    cardinality(audiences) <= 10 and array_position(audiences, null) is null
  ),
  -- Its language, such as 'en' or 'pt-br', in lower case. Null: it is not tied to one.
  add column locale text check (locale ~ '^[a-z]{2,3}(-[a-z0-9]{2,8})*$'),
  -- Any key and value the team defines, such as {"plan": "pro", "feature": "calendar"}.
  add column fields jsonb not null default '{}';

-- Custom fields are a flat object of short text values with short, plain keys, so a filter's
-- `fields` can be matched with containment.
create function private.valid_article_fields(fields jsonb) returns boolean
language sql immutable parallel safe set search_path = ''
as $$
  select jsonb_typeof(fields) = 'object'
    and (select count(*) from jsonb_object_keys(fields)) <= 20
    and not exists (
      select 1 from jsonb_each(fields) as field (key, value)
      where field.key !~ '^[a-z0-9_]{1,40}$'
        or jsonb_typeof(field.value) <> 'string'
        or char_length(field.value #>> '{}') not between 1 and 200
    );
$$;

grant execute on function private.valid_article_fields(jsonb) to anon, authenticated, service_role;

alter table public.articles
  add constraint articles_fields_valid check (private.valid_article_fields(fields));

create index articles_audiences_idx on public.articles using gin (audiences);
create index articles_fields_idx on public.articles using gin (fields jsonb_path_ops);

-- A text value or a list of them from a filter, cleaned, or null when there is none.
create function private.filter_texts(value jsonb) returns text[]
language sql immutable parallel safe set search_path = ''
as $$
  select nullif(
    case jsonb_typeof(value)
      when 'array' then coalesce(
        (select array_agg(lower(btrim(item))) from jsonb_array_elements_text(value) as item
         where btrim(item) <> ''),
        '{}'
      )
      when 'string' then array_remove(array[nullif(lower(btrim(value #>> '{}')), '')], null)
      else null
    end,
    '{}'
  );
$$;

-- Words to search for, each matched from its start, as `search_articles` does. With
-- `any_word`, an article needs one of the words rather than all of them: the fallback searches
-- a page's title that way, since a title is rarely all in one article.
create function private.article_words(query text, any_word boolean) returns tsquery
language sql stable set search_path = ''
as $$
  select to_tsquery(
    'english',
    string_agg(word || ':*', case when any_word then ' | ' else ' & ' end)
  )
  from regexp_split_to_table(lower(query), '[^[:alnum:]]+') as word
  where word <> '';
$$;

-- How many readers said a published article helped, for sorting by what is popular. Readers
-- cannot read the answers themselves; this gives a sort order a count, and nothing else.
create function private.helpful_answers(article uuid) returns bigint
language sql stable security definer set search_path = ''
as $$
  select count(*) from public.article_feedback f
  join public.articles a on a.id = f.article_id
  where f.article_id = article and f.helpful and a.status = 'published';
$$;

grant execute on function private.filter_texts(jsonb) to anon, authenticated, service_role;
grant execute on function private.article_words(text, boolean)
  to anon, authenticated, service_role;
grant execute on function private.helpful_answers(uuid) to anon, authenticated, service_role;

-- The articles a filter picks, best first. Every part of the filter is optional and the parts
-- combine with AND:
--
--   collection  a collection's slug, or a list of them
--   tags        {"any": [...]}, {"all": [...]}, {"none": [...]}, or more than one of these
--   q           words to search for
--   audience    articles for everyone, or for this audience
--   locale      articles in no particular language, or in this one ('en' takes 'en-gb')
--   fields      {"plan": "pro"}: articles whose custom fields hold every pair given
--   articles    slugs to put first, in the order given. With nothing else to narrow by, the
--               answer is these and no others
--   sort        position (the collections' and articles' own order), relevance, updated,
--               popular. Default: relevance with `q`, position without
--   limit       1 to 50. Default 5
--
-- Published articles only, whoever asks: a team member testing a rule sees what a visitor
-- would. It runs with the caller's own access.
create function public.find_articles(filter jsonb default '{}', any_word boolean default false)
returns setof public.articles
language plpgsql stable set search_path = ''
as $$
declare
  wanted_collections text[] := private.filter_texts(filter -> 'collection');
  tags_any text[] := private.filter_texts(filter #> '{tags,any}');
  tags_all text[] := private.filter_texts(filter #> '{tags,all}');
  tags_none text[] := private.filter_texts(filter #> '{tags,none}');
  words tsquery;
  wanted_audience text := lower(nullif(btrim(filter ->> 'audience'), ''));
  wanted_locale text := lower(nullif(btrim(filter ->> 'locale'), ''));
  wanted_fields jsonb;
  pinned text[] := private.filter_texts(filter -> 'articles');
  sort_by text := filter ->> 'sort';
  most integer := 5;
  narrowed boolean;
begin
  if jsonb_typeof(filter) is distinct from 'object' then
    raise exception 'A filter is an object.' using errcode = '22023';
  end if;
  if nullif(btrim(filter ->> 'q'), '') is not null then
    words := private.article_words(filter ->> 'q', any_word);
  end if;
  if jsonb_typeof(filter -> 'fields') = 'object' and filter -> 'fields' <> '{}' then
    wanted_fields := filter -> 'fields';
  end if;
  if jsonb_typeof(filter -> 'limit') = 'number' then
    most := least(greatest(floor((filter ->> 'limit')::numeric)::integer, 1), 50);
  end if;
  if sort_by is null or sort_by not in ('position', 'relevance', 'updated', 'popular') then
    sort_by := case when words is null then 'position' else 'relevance' end;
  end if;
  narrowed := wanted_collections is not null or tags_any is not null or tags_all is not null
    or tags_none is not null or words is not null or wanted_audience is not null
    or wanted_locale is not null or wanted_fields is not null;

  return query
  select a.*
  from public.articles a
  left join public.collections c on c.id = a.collection_id
  where a.status = 'published'
    and (
      (pinned is not null and a.slug = any (pinned))
      or (
        (pinned is null or narrowed)
        and (wanted_collections is null or c.slug = any (wanted_collections))
        and (tags_any is null or a.tags && tags_any)
        and (tags_all is null or a.tags @> tags_all)
        and (tags_none is null or not a.tags && tags_none)
        and (words is null or a.search @@ words)
        and (
          wanted_audience is null or a.audiences = '{}' or wanted_audience = any (a.audiences)
        )
        and (
          wanted_locale is null or a.locale is null or a.locale = wanted_locale
          or a.locale like wanted_locale || '-%' or wanted_locale like a.locale || '-%'
        )
        and (wanted_fields is null or a.fields @> wanted_fields)
      )
    )
  order by
    array_position(pinned, a.slug) nulls last,
    case when sort_by = 'relevance' and words is not null then ts_rank_cd(a.search, words) end
      desc nulls last,
    case when sort_by = 'updated' then a.updated_at end desc nulls last,
    case when sort_by = 'popular' then private.helpful_answers(a.id) end desc nulls last,
    c.position, a.position, a.title
  limit most;
end;
$$;

revoke execute on function public.find_articles from public;
grant execute on function public.find_articles to anon, authenticated, service_role;

-- Rules: contextual help without code. Each maps pages, by their address and optionally the
-- visitor's audience, to a filter. They are tried in order and the first that matches wins;
-- a page that sends its own filter is not looked up at all. The matching is done by the app
-- (`matchHelpRule` in @helpwren/core), which the dashboard's test box shares.
create table public.help_rules (
  id         uuid primary key default gen_random_uuid(),
  -- What the team calls it, shown in the inbox beside a conversation it matched.
  name       text not null check (char_length(btrim(name)) between 1 and 80),
  -- 'is': the path is this one. 'matches': a path pattern where * stands for anything, such
  -- as /bookings/*. 'contains': the address holds these characters anywhere.
  url_match  text not null check (url_match in ('is', 'matches', 'contains')),
  url_value  text not null check (char_length(btrim(url_value)) between 1 and 500),
  -- Only for visitors in this audience. Null: everyone.
  audience   text check (char_length(audience) between 1 and 60),
  -- What to show, as `find_articles` reads it.
  filter     jsonb not null default '{}' check (
    jsonb_typeof(filter) = 'object' and pg_column_size(filter) <= 8192
  ),
  enabled    boolean not null default true,
  -- Its place in the order, lowest first.
  position   integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index help_rules_position_idx on public.help_rules (position);

-- A new rule goes to the end of the list.
create function private.place_help_rule() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  new.position := coalesce((select max(position) from public.help_rules), 0) + 1;
  return new;
end;
$$;

create trigger help_rules_place before insert on public.help_rules
  for each row execute function private.place_help_rule();

create trigger help_rules_touch before update on public.help_rules
  for each row execute function private.touch_updated_at();

-- The team reads the rules; admins change them, as they change settings.
alter table public.help_rules enable row level security;
revoke all on public.help_rules from anon, authenticated;
grant select, insert, update, delete on public.help_rules to authenticated;

create policy help_rules_agent_read on public.help_rules for select to authenticated using (
  (select private.is_agent())
);
create policy help_rules_admin_insert on public.help_rules for insert to authenticated
with check ((select private.is_admin()));
create policy help_rules_admin_update on public.help_rules for update to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));
create policy help_rules_admin_delete on public.help_rules for delete to authenticated using (
  (select private.is_admin())
);

-- Puts the rules in the order of the ids given. It runs with the caller's own access, so only
-- an admin can.
create function public.reorder_help_rules(ids uuid[]) returns void
language sql set search_path = ''
as $$
  update public.help_rules r set position = wanted.place
  from unnest(ids) with ordinality as wanted (id, place)
  where r.id = wanted.id;
$$;

revoke execute on function public.reorder_help_rules from public, anon;
grant execute on function public.reorder_help_rules to authenticated, service_role;
