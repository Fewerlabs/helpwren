-- Limits on misuse, before the install is open to the public: request counts shared by every
-- server, blocking a contact or the network they write from, checks on what guests send, and
-- uploads and article ratings moved behind the app's server, where they can be limited.

-- Request counts, one row per key, in fixed windows. The app's server counts here so that every
-- copy of it running at once shares one count; memory alone would give each copy its own.
-- Unlogged: a count lost in a crash only lets a few requests through early.
create unlogged table public.rate_limits (
  key          text primary key check (char_length(key) <= 200),
  window_start timestamptz not null,
  hits         integer not null
);

alter table public.rate_limits enable row level security;
revoke all on public.rate_limits from anon, authenticated;

create policy rate_limits_server_only on public.rate_limits for all to authenticated
  using (false)
  with check (false);

-- Counts one request against a key and says whether it is within the limit. Windows start on
-- whole multiples of their length, so two servers counting the same key agree on the window.
create function public.hit_rate_limit(key text, max_hits integer, window_seconds integer)
returns boolean
language plpgsql set search_path = ''
as $$
declare
  started timestamptz :=
    to_timestamp(floor(extract(epoch from now()) / window_seconds) * window_seconds);
  counted integer;
begin
  insert into public.rate_limits as r (key, window_start, hits)
  values (hit_rate_limit.key, started, 1)
  on conflict on constraint rate_limits_pkey do update set
    window_start = excluded.window_start,
    hits = case when r.window_start = excluded.window_start then r.hits + 1 else 1 end
  returning hits into counted;

  -- Now and then, forget keys that have been quiet for a day, so the table stays small without
  -- a scheduled job.
  if random() < 0.001 then
    delete from public.rate_limits where window_start < now() - interval '1 day';
  end if;
  return counted <= max_hits;
end;
$$;

revoke execute on function public.hit_rate_limit from public, anon, authenticated;
grant execute on function public.hit_rate_limit to service_role;

-- Blocking. A blocked contact cannot write or start a conversation. The network they wrote
-- from can be blocked as well, which stops a spammer who starts again as a new guest. The
-- network is never stored as an address: the server keeps a keyed hash of it, which says
-- whether two requests came from the same place and nothing else.
alter table public.contacts
  add column blocked_at  timestamptz,
  add column blocked_by  uuid references public.agents on delete set null,
  -- The hashed network the contact last started a conversation from.
  add column network_key text check (network_key ~ '^[a-f0-9]{64}$');

create index contacts_blocked_by_idx on public.contacts (blocked_by) where blocked_by is not null;
create index contacts_network_key_idx on public.contacts (network_key) where network_key is not null;

create table public.blocked_networks (
  key        text primary key check (key ~ '^[a-f0-9]{64}$'),
  -- Whose conversations led to the block, so the team can see why it is there.
  contact_id uuid references public.contacts on delete set null,
  blocked_by uuid references public.agents on delete set null,
  created_at timestamptz not null default now()
);

create index blocked_networks_contact_id_idx on public.blocked_networks (contact_id);
create index blocked_networks_blocked_by_idx on public.blocked_networks (blocked_by);

-- Who did what to whom, for the team to look back on. Written only by the database's own
-- triggers, so an entry cannot be forged, skipped or edited.
create table public.audit_events (
  id         uuid primary key default gen_random_uuid(),
  -- The team member who did it. Null when the server did.
  actor_id   uuid,
  action     text not null check (action in (
    'contact_blocked', 'contact_unblocked', 'network_blocked', 'network_unblocked'
  )),
  contact_id uuid references public.contacts on delete set null,
  data       jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index audit_events_contact_id_idx on public.audit_events (contact_id, created_at);

-- Agents block and unblock: they may change `blocked_at` on a contact, and nothing else.
grant update (blocked_at) on public.contacts to authenticated;

create policy contacts_agent_block on public.contacts for update to authenticated
  using ((select private.is_agent()))
  with check ((select private.is_agent()));

-- Agents read the blocked networks and add or remove one, but only a network a contact has
-- written from: the key is never typed by hand.
alter table public.blocked_networks enable row level security;
revoke all on public.blocked_networks from anon, authenticated;
grant select, insert, delete on public.blocked_networks to authenticated;

create policy blocked_networks_agent_read on public.blocked_networks for select to authenticated
using ((select private.is_agent()));

create policy blocked_networks_agent_insert on public.blocked_networks for insert to authenticated
with check (
  (select private.is_agent())
  and exists (select 1 from public.contacts k where k.network_key = blocked_networks.key)
);

create policy blocked_networks_agent_delete on public.blocked_networks for delete to authenticated
using ((select private.is_agent()));

alter table public.audit_events enable row level security;
revoke all on public.audit_events from anon, authenticated;
grant select on public.audit_events to authenticated;

create policy audit_events_agent_read on public.audit_events for select to authenticated
using ((select private.is_agent()));

-- When and by whom come from the clock and the session, not from what the browser sent.
create function private.stamp_contact_block() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.blocked_at is not distinct from old.blocked_at then
    return new;
  end if;
  if new.blocked_at is null then
    new.blocked_by := null;
  else
    new.blocked_at := coalesce(old.blocked_at, now());
    new.blocked_by := coalesce(old.blocked_by, auth.uid());
  end if;
  return new;
end;
$$;

create trigger contacts_stamp_block before update of blocked_at on public.contacts
  for each row execute function private.stamp_contact_block();

create function private.log_contact_block() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if (old.blocked_at is null) <> (new.blocked_at is null) then
    insert into public.audit_events (actor_id, action, contact_id)
    values (
      auth.uid(),
      case when new.blocked_at is null then 'contact_unblocked' else 'contact_blocked' end,
      new.id
    );
  end if;
  return null;
end;
$$;

create trigger contacts_log_block after update of blocked_at on public.contacts
  for each row execute function private.log_contact_block();

create function private.stamp_network_block() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  new.blocked_by := auth.uid();
  new.created_at := now();
  return new;
end;
$$;

create trigger blocked_networks_stamp before insert on public.blocked_networks
  for each row execute function private.stamp_network_block();

create function private.log_network_block() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  entry public.blocked_networks := case when tg_op = 'DELETE' then old else new end;
begin
  insert into public.audit_events (actor_id, action, contact_id, data)
  values (
    auth.uid(),
    case when tg_op = 'DELETE' then 'network_unblocked' else 'network_blocked' end,
    entry.contact_id,
    jsonb_build_object('key', entry.key)
  );
  return null;
end;
$$;

create trigger blocked_networks_log after insert or delete on public.blocked_networks
  for each row execute function private.log_network_block();

-- Whether a contact may not write: they are blocked, or the network they last wrote from is.
create function private.is_blocked(contact_id uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.contacts k
    where k.id = is_blocked.contact_id
      and (
        k.blocked_at is not null
        or exists (select 1 from public.blocked_networks b where b.key = k.network_key)
      )
  );
$$;

revoke execute on function private.is_blocked from public;
grant execute on function private.is_blocked to authenticated, service_role;

-- What is wrong with a guest's message, or null if nothing is. Spam arrives as a list of
-- links, or as a link with nothing said about it before anyone on the team has answered.
create function private.spam_reason(body text, before_reply boolean) returns text
language sql immutable set search_path = ''
as $$
  select case
    when body is null then null
    when (select count(*) from regexp_matches(body, '(https?://|www\.)', 'gi')) > 5
      then 'Too many links in one message.'
    when before_reply
      and body ~* '(https?://|www\.)'
      and btrim(regexp_replace(body, '(https?://|www\.)\S*', '', 'gi')) = ''
      then 'Say a few words about the link, so the team knows what you need.'
  end;
$$;

revoke execute on function private.spam_reason from public;
grant execute on function private.spam_reason to authenticated, service_role;

-- The limits on a contact's messages, now with blocking, a limit for each conversation,
-- repeated messages and the spam checks. Agents and the server are not limited. Codes:
-- HW429 slow down, HW403 blocked, HW422 refused as spam.
create or replace function private.limit_messages() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  caller uuid := auth.uid();
  per_minute constant integer := 20;
  per_conversation_minute constant integer := 30;
  contact public.contacts;
  reason text;
begin
  if caller is null or private.is_agent() then
    return new;
  end if;

  if private.is_blocked(caller) then
    raise exception 'You can no longer send messages here.' using errcode = 'HW403';
  end if;

  if (
    select count(*) from public.messages
    where sender_id = caller and created_at > now() - interval '1 minute'
  ) >= per_minute then
    raise exception 'Too many messages. Wait a moment and try again.' using errcode = 'HW429';
  end if;

  -- Everyone on the contact's side of one conversation together, for an organisation's
  -- shared conversations.
  if (
    select count(*) from public.messages
    where conversation_id = new.conversation_id
      and sender_role in ('guest', 'user')
      and created_at > now() - interval '1 minute'
  ) >= per_conversation_minute then
    raise exception 'Too many messages. Wait a moment and try again.' using errcode = 'HW429';
  end if;

  -- The same words three times in a few minutes is a stuck key or a script, not a person.
  if new.body is not null and (
    select count(*) from public.messages
    where sender_id = caller and body = new.body and created_at > now() - interval '5 minutes'
  ) >= 2 then
    raise exception 'You have sent that already.' using errcode = 'HW422';
  end if;

  -- The host product vouches for a verified user; the spam checks are for guests.
  select * into contact from public.contacts where id = caller;
  if found and not contact.verified then
    reason := private.spam_reason(
      new.body,
      not exists (
        select 1 from public.messages m
        where m.conversation_id = new.conversation_id and m.sender_role = 'agent'
      )
    );
    if reason is not null then
      raise exception '%', reason using errcode = 'HW422';
    end if;
  end if;
  return new;
end;
$$;

-- Starting a conversation, with the same checks, a limit on tickets, a daily limit, and the
-- network the request came from. A new parameter changes the signature, so the old one goes.
drop function public.start_conversation(uuid, text, text, jsonb, text, text, text, text);

create function public.start_conversation(
  contact_id uuid,
  body text,
  source text,
  context jsonb default '{}',
  contact_name text default null,
  contact_email text default null,
  contact_phone text default null,
  -- Given, the conversation starts as a ticket with this subject.
  ticket_subject text default null,
  -- The keyed hash of the network the request came from, when the server knows it.
  network_key text default null
) returns uuid
language plpgsql set search_path = ''
as $$
declare
  per_hour constant integer := 5;
  per_day constant integer := 20;
  tickets_per_hour constant integer := 3;
  contact public.contacts;
  conversation public.conversations;
  reason text;
begin
  if exists (
    select 1 from public.contacts k
    where k.id = start_conversation.contact_id and k.blocked_at is not null
  ) or exists (
    select 1 from public.blocked_networks b where b.key = start_conversation.network_key
  ) then
    raise exception 'You can no longer start conversations here.' using errcode = 'HW403';
  end if;

  if (
    select count(*) from public.conversations c
    where c.contact_id = start_conversation.contact_id
      and c.created_at > now() - interval '1 hour'
  ) >= per_hour or (
    select count(*) from public.conversations c
    where c.contact_id = start_conversation.contact_id
      and c.created_at > now() - interval '1 day'
  ) >= per_day then
    raise exception 'Too many new conversations. Try again later.' using errcode = 'HW429';
  end if;

  if ticket_subject is not null and (
    select count(*) from public.conversations c
    where c.contact_id = start_conversation.contact_id
      and c.type = 'ticket'
      and c.created_at > now() - interval '1 hour'
  ) >= tickets_per_hour then
    raise exception 'Too many new tickets. Try again later.' using errcode = 'HW429';
  end if;

  -- Details given now replace older ones; details left out keep what is already known.
  insert into public.contacts as existing (id, name, email, phone, network_key)
  values (contact_id, contact_name, contact_email, contact_phone, network_key)
  on conflict (id) do update set
    name = coalesce(excluded.name, existing.name),
    email = coalesce(excluded.email, existing.email),
    phone = coalesce(excluded.phone, existing.phone),
    network_key = coalesce(excluded.network_key, existing.network_key)
  returning * into contact;

  if not contact.verified then
    reason := private.spam_reason(body, true);
    if reason is not null then
      raise exception '%', reason using errcode = 'HW422';
    end if;
  end if;

  insert into public.conversations (contact_id, source, context, type, subject)
  values (
    contact.id, source, context,
    case when ticket_subject is null then 'chat' else 'ticket' end,
    ticket_subject
  )
  returning * into conversation;

  -- The history says who opened the ticket. A conversation the team converts later records
  -- that through the update trigger; one born as a ticket has no update to record it.
  if conversation.type = 'ticket' then
    insert into public.conversation_events (conversation_id, actor_id, kind, data)
    values (conversation.id, contact.id, 'ticket_created', jsonb_build_object(
      'number', conversation.ticket_number, 'subject', conversation.subject, 'opened', true
    ));
  end if;

  insert into public.messages (conversation_id, sender_id, sender_role, body)
  values (conversation.id, contact.id, contact.kind, body);

  return conversation.id;
end;
$$;

revoke execute on function public.start_conversation from public, anon, authenticated;
grant execute on function public.start_conversation to service_role;

-- A browser already tied to one contact is not handed to another by naming its id. The id is
-- random and private to the browser, but it travels in request bodies, so it is not proof.
create or replace function public.link_visitor(visitor_id text, contact_id uuid) returns void
language plpgsql set search_path = ''
as $$
declare
  visitor public.visitors;
begin
  update public.visitors v set contact_id = link_visitor.contact_id
  where v.id = link_visitor.visitor_id
    and (v.contact_id is null or v.contact_id = link_visitor.contact_id)
    and exists (select 1 from public.contacts k where k.id = link_visitor.contact_id)
  returning * into visitor;
  if found then
    perform private.copy_visitor_to_contact(visitor);
  end if;
end;
$$;

-- Files are stored by the app's server, which checks what each one really is from its bytes
-- before it is kept. A browser could otherwise store a page of HTML and call it a picture.
drop policy attachments_insert on storage.objects;

-- "Was this helpful?" goes through the app's server too, which limits how often one network
-- may answer. A direct insert could be repeated without end.
drop policy article_feedback_insert on public.article_feedback;
revoke insert on public.article_feedback from anon, authenticated;

-- Search: a long query costs the database for nothing, so only its start is used.
create or replace function public.search_articles(query text) returns setof public.articles
language sql stable set search_path = ''
as $$
  with terms as (
    select to_tsquery('english', string_agg(word || ':*', ' & ')) as wanted
    from (
      select word
      from regexp_split_to_table(lower(left(query, 200)), '[^[:alnum:]]+') as word
      where word <> ''
      limit 12
    ) as words
  )
  select a.*
  from public.articles a, terms
  where a.search @@ terms.wanted
  order by ts_rank_cd(a.search, terms.wanted) desc, a.updated_at desc
  limit 50;
$$;
