-- Live visitors: who is on the site now, where they are and what they are looking at, and a
-- first message from the team that waits for their browser to pick it up.
--
-- Built for a small database: the chat checks in through the app's server about once a minute,
-- one row per browser is updated in place, and nobody listens for changes live. A browsing
-- visitor gets no Supabase Auth user; one is made only when they write, or when they take up a
-- message the team sent them.

-- What the latest browser a contact used said about them, kept on the contact so the inbox and
-- the contact page can show it without asking for the browser's row.
alter table public.contacts
  add column country         text check (country ~ '^[A-Z]{2}$'),
  add column region          text check (char_length(region) <= 100),
  add column city            text check (char_length(city) <= 100),
  add column browser         text check (char_length(browser) <= 40),
  add column os              text check (char_length(os) <= 40),
  add column device          text check (device in ('desktop', 'mobile', 'tablet')),
  add column language        text check (char_length(language) <= 35),
  add column timezone        text check (char_length(timezone) <= 64),
  -- When their browser first checked in, which may be long before they first wrote.
  add column first_seen_at   timestamptz,
  add column last_seen_at    timestamptz,
  add column session_count   integer check (session_count >= 0),
  add column last_page_url   text check (char_length(last_page_url) <= 2000),
  add column last_page_title text check (char_length(last_page_title) <= 300),
  add column referrer        text check (char_length(referrer) <= 2000);

-- One browser on the site. The id is made up by the chat and kept in its own storage, so it
-- names a browser, not a person; `contact_id` says who it is once they have written.
create table public.visitors (
  id                 text primary key check (id ~ '^[A-Za-z0-9_-]{16,64}$'),
  contact_id         uuid references public.contacts on delete set null,
  page_url           text not null check (char_length(page_url) <= 2000),
  page_title         text check (char_length(page_title) <= 300),
  -- Where the current session came from.
  referrer           text check (char_length(referrer) <= 2000),
  browser            text check (char_length(browser) <= 40),
  os                 text check (char_length(os) <= 40),
  device             text check (device in ('desktop', 'mobile', 'tablet')),
  language           text check (char_length(language) <= 35),
  timezone           text check (char_length(timezone) <= 64),
  -- From the hosting platform's headers, when it sends them. The address itself is never kept.
  country            text check (country ~ '^[A-Z]{2}$'),
  region             text check (char_length(region) <= 100),
  city               text check (char_length(city) <= 100),
  first_seen_at      timestamptz not null default now(),
  session_started_at timestamptz not null default now(),
  last_seen_at       timestamptz not null default now(),
  session_count      integer not null default 1 check (session_count >= 1),
  -- The last ten pages, newest first, as { url, title, at }.
  recent_pages       jsonb not null default '[]' check (jsonb_typeof(recent_pages) = 'array'),
  -- A first message from the team, waiting for this browser to check in and take it up.
  pending_message    text check (char_length(pending_message) between 1 and 5000),
  pending_agent_id   uuid references public.agents on delete set null,
  pending_at         timestamptz,
  -- The conversation the last message the team sent became, once taken up.
  outreach_conversation_id uuid references public.conversations on delete set null
);

create index visitors_last_seen_at_idx on public.visitors (last_seen_at desc);
create index visitors_contact_id_idx on public.visitors (contact_id) where contact_id is not null;
create index visitors_pending_agent_id_idx on public.visitors (pending_agent_id)
  where pending_agent_id is not null;
create index visitors_outreach_conversation_id_idx on public.visitors (outreach_conversation_id)
  where outreach_conversation_id is not null;

-- Agents read. Only the server writes, through the functions below and its secret key.
alter table public.visitors enable row level security;
revoke all on public.visitors from anon, authenticated;
grant select on public.visitors to authenticated;

create policy visitors_agent_read on public.visitors for select to authenticated using (
  (select private.is_agent())
);

-- The page list with a new page at the front: the same page twice in a row is one visit, and
-- only the last ten are kept.
create function private.add_recent_page(pages jsonb, page jsonb) returns jsonb
language sql immutable set search_path = ''
as $$
  select coalesce(jsonb_agg(entry order by position), '[]'::jsonb)
  from jsonb_array_elements(
    jsonb_build_array(page) || case
      when pages -> 0 ->> 'url' = page ->> 'url' then pages - 0
      else pages
    end
  ) with ordinality as listed (entry, position)
  where position <= 10;
$$;

-- Puts what a browser said on the contact it belongs to. Location is taken as a whole, so a
-- city is never paired with another check-in's country.
create function private.copy_visitor_to_contact(visitor public.visitors) returns void
language sql set search_path = ''
as $$
  update public.contacts k set
    country = case when visitor.country is null then k.country else visitor.country end,
    region = case when visitor.country is null then k.region else visitor.region end,
    city = case when visitor.country is null then k.city else visitor.city end,
    browser = coalesce(visitor.browser, k.browser),
    os = coalesce(visitor.os, k.os),
    device = coalesce(visitor.device, k.device),
    language = coalesce(visitor.language, k.language),
    timezone = coalesce(visitor.timezone, k.timezone),
    first_seen_at = least(k.first_seen_at, visitor.first_seen_at),
    last_seen_at = greatest(k.last_seen_at, visitor.last_seen_at),
    session_count = visitor.session_count,
    last_page_url = visitor.page_url,
    last_page_title = visitor.page_title,
    referrer = coalesce(visitor.referrer, k.referrer)
  where k.id = visitor.contact_id;
$$;

-- Browsers nobody is attached to are forgotten after a month away. Called now and then by
-- `record_visit`, so no scheduled job is needed.
create function private.prune_visitors() returns integer
language plpgsql set search_path = ''
as $$
declare
  removed integer;
begin
  delete from public.visitors
  where contact_id is null and last_seen_at < now() - interval '30 days';
  get diagnostics removed = row_count;
  return removed;
end;
$$;

revoke execute on function private.add_recent_page from public;
revoke execute on function private.copy_visitor_to_contact from public;
revoke execute on function private.prune_visitors from public;
grant execute on function private.add_recent_page to service_role;
grant execute on function private.copy_visitor_to_contact to service_role;
grant execute on function private.prune_visitors to service_role;

-- A browser checking in: creates or updates its row, counts a new session after half an hour
-- away, and copies what it said to its contact. Returns whether a message from the team is
-- waiting for it. Only the app's server may call it: it derives the browser and the location,
-- and the contact id comes from a session it has verified.
create function public.record_visit(
  visitor_id text,
  page_url text,
  page_title text default null,
  referrer text default null,
  browser text default null,
  os text default null,
  device text default null,
  language text default null,
  timezone text default null,
  country text default null,
  region text default null,
  city text default null,
  contact_id uuid default null
) returns boolean
language plpgsql set search_path = ''
as $$
declare
  session_gap constant interval := interval '30 minutes';
  visitor public.visitors;
  known_contact uuid;
begin
  if visitor_id is null or visitor_id !~ '^[A-Za-z0-9_-]{16,64}$' then
    raise exception 'Not a visitor id.' using errcode = '22023';
  end if;

  -- A guest has a session from the moment they open a conversation, but a contact only once
  -- it is created. Until then the browser belongs to nobody.
  select k.id into known_contact from public.contacts k where k.id = record_visit.contact_id;

  insert into public.visitors as v (
    id, contact_id, page_url, page_title, referrer, browser, os, device, language, timezone,
    country, region, city, recent_pages
  )
  values (
    visitor_id, known_contact, page_url, page_title, referrer, browser, os, device, language,
    timezone, country, region, city,
    jsonb_build_array(jsonb_build_object('url', page_url, 'title', page_title, 'at', now()))
  )
  on conflict (id) do update set
    contact_id = coalesce(excluded.contact_id, v.contact_id),
    page_url = excluded.page_url,
    page_title = excluded.page_title,
    -- Where a session came from is said when it starts; later pages are on the site itself.
    referrer = case
      when v.last_seen_at < now() - session_gap then excluded.referrer
      else coalesce(v.referrer, excluded.referrer)
    end,
    browser = coalesce(excluded.browser, v.browser),
    os = coalesce(excluded.os, v.os),
    device = coalesce(excluded.device, v.device),
    language = coalesce(excluded.language, v.language),
    timezone = coalesce(excluded.timezone, v.timezone),
    country = case when excluded.country is null then v.country else excluded.country end,
    region = case when excluded.country is null then v.region else excluded.region end,
    city = case when excluded.country is null then v.city else excluded.city end,
    session_count = v.session_count
      + case when v.last_seen_at < now() - session_gap then 1 else 0 end,
    session_started_at = case
      when v.last_seen_at < now() - session_gap then now()
      else v.session_started_at
    end,
    last_seen_at = now(),
    recent_pages = private.add_recent_page(v.recent_pages, excluded.recent_pages -> 0)
  returning * into visitor;

  if visitor.contact_id is not null then
    perform private.copy_visitor_to_contact(visitor);
  end if;

  -- About one check-in in a hundred clears out browsers that stopped coming.
  if random() < 0.01 then
    perform private.prune_visitors();
  end if;

  return visitor.pending_message is not null and visitor.pending_agent_id is not null;
end;
$$;

-- Ties a browser to the contact who just wrote from it, once `start_conversation` has made
-- them one, and gives the contact what the browser knows.
create function public.link_visitor(visitor_id text, contact_id uuid) returns void
language plpgsql set search_path = ''
as $$
declare
  visitor public.visitors;
begin
  update public.visitors v set contact_id = link_visitor.contact_id
  where v.id = link_visitor.visitor_id
    and exists (select 1 from public.contacts k where k.id = link_visitor.contact_id)
  returning * into visitor;
  if found then
    perform private.copy_visitor_to_contact(visitor);
  end if;
end;
$$;

-- Takes up the message the team left for a browser: makes its session a contact if it is not
-- one yet, starts a conversation whose first message is the team member's, assigned to them,
-- and ties the browser to the contact. Returns the new conversation, or null when nothing was
-- waiting. Only the app's server may call it, with a contact id from a verified session.
--
-- Whoever knows a browser's id can take up its message. The id is random and kept in the
-- chat's own storage on that browser, which is as private as the chat's session.
create function public.claim_visitor_outreach(
  visitor_id text,
  contact_id uuid,
  source text,
  context jsonb default '{}'
) returns uuid
language plpgsql set search_path = ''
as $$
declare
  visitor public.visitors;
  started uuid;
begin
  select * into visitor from public.visitors v
  where v.id = claim_visitor_outreach.visitor_id
  for update;
  if not found or visitor.pending_message is null then
    return null;
  end if;

  -- The team member who wrote it has been removed, and a message needs a sender.
  if visitor.pending_agent_id is null then
    update public.visitors v set pending_message = null, pending_at = null
    where v.id = visitor.id;
    return null;
  end if;

  if exists (select 1 from public.agents a where a.user_id = claim_visitor_outreach.contact_id) then
    raise exception 'A team member is not a visitor.' using errcode = '22023';
  end if;

  insert into public.contacts (id) values (claim_visitor_outreach.contact_id)
  on conflict (id) do nothing;

  insert into public.conversations (contact_id, source, context, assignee_id)
  values (claim_visitor_outreach.contact_id, source, context, visitor.pending_agent_id)
  returning id into started;

  -- From the team member, as if they had written it now: it counts as unread for the visitor
  -- and reaches them like any other reply.
  insert into public.messages (conversation_id, sender_id, sender_role, body)
  values (started, visitor.pending_agent_id, 'agent', visitor.pending_message);

  update public.visitors v set
    contact_id = claim_visitor_outreach.contact_id,
    pending_message = null,
    pending_agent_id = null,
    pending_at = null,
    outreach_conversation_id = started
  where v.id = visitor.id
  returning * into visitor;

  perform private.copy_visitor_to_contact(visitor);
  return started;
end;
$$;

revoke execute on function public.record_visit from public, anon, authenticated;
revoke execute on function public.link_visitor from public, anon, authenticated;
revoke execute on function public.claim_visitor_outreach from public, anon, authenticated;
grant execute on function public.record_visit to service_role;
grant execute on function public.link_visitor to service_role;
grant execute on function public.claim_visitor_outreach to service_role;

-- A guest who signs in brings their browsers with them, as they bring their conversations.
create or replace function public.merge_guest_into_user(guest_id uuid, user_id uuid) returns integer
language plpgsql set search_path = ''
as $$
declare
  guest public.contacts;
  target public.contacts;
  latest public.visitors;
  moved integer;
begin
  if guest_id = user_id then
    return 0;
  end if;

  select * into target from public.contacts
  where id = user_id and kind = 'user' and verified
  for update;
  if not found then
    raise exception 'Only a verified user can take over a guest''s conversations.'
      using errcode = '22023';
  end if;

  if exists (select 1 from public.agents where agents.user_id = guest_id) then
    raise exception 'A team member is not a guest.' using errcode = '22023';
  end if;

  select * into guest from public.contacts where id = guest_id for update;
  if not found then
    -- A guest who never wrote has nothing to bring.
    return 0;
  end if;
  if guest.kind <> 'guest' or guest.verified then
    raise exception 'Only a guest''s conversations can be moved.' using errcode = '22023';
  end if;

  -- The conversations join the user's organisation as they arrive, as if they had started
  -- there.
  update public.conversations
  set contact_id = target.id, org_id = target.org_id
  where contact_id = guest.id;
  get diagnostics moved = row_count;

  update public.messages set sender_id = target.id where sender_id = guest.id;
  update public.conversation_ratings set contact_id = target.id where contact_id = guest.id;
  update public.conversation_events set actor_id = target.id where actor_id = guest.id;
  -- Before the guest is removed, which would otherwise leave their browsers belonging to nobody.
  update public.visitors set contact_id = target.id where visitors.contact_id = guest.id;

  -- What the guest typed about themselves fills only what the host product did not say.
  update public.contacts set
    name = coalesce(target.name, guest.name),
    email = coalesce(target.email, guest.email),
    phone = coalesce(target.phone, guest.phone)
  where id = target.id;

  -- The user's details come from whichever of their browsers was seen last.
  select * into latest from public.visitors
  where visitors.contact_id = target.id
  order by last_seen_at desc
  limit 1;
  if found then
    perform private.copy_visitor_to_contact(latest);
  end if;

  delete from public.contacts where id = guest.id;
  return moved;
end;
$$;

-- The contact list gains what their browser said. Dropped and made again, because a view's
-- columns can only be added at the end, and these belong beside the others.
drop view public.contact_summaries;

create view public.contact_summaries with (security_invoker = true) as
select
  k.id,
  k.kind,
  k.verified,
  k.name,
  k.email,
  k.phone,
  k.org_name,
  k.created_at,
  k.country,
  k.region,
  k.city,
  k.browser,
  k.os,
  k.device,
  k.language,
  k.timezone,
  k.first_seen_at,
  k.last_seen_at,
  k.session_count,
  k.last_page_url,
  k.last_page_title,
  k.referrer,
  count(c.id)::integer as conversation_count,
  max(c.last_message_at) as last_active_at
from public.contacts k
left join public.conversations c on c.contact_id = k.id
group by k.id;

revoke all on public.contact_summaries from anon, authenticated;
grant select on public.contact_summaries to authenticated;
