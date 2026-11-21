-- Web push for the team: the browsers a team member has turned notifications on in, and the
-- pushes owed to them when a contact writes. See docs/decisions/0029-installable-dashboard.md.

-- One browser on one device that may be sent pushes. The push service's address and the two
-- keys that encrypt a push for it come from the browser's PushManager. Each team member reads
-- and changes only their own.
create table public.agent_push_subscriptions (
  id           uuid primary key default gen_random_uuid(),
  agent_id     uuid not null default auth.uid() references public.agents on delete cascade,
  -- The push service's address for this browser. A capability: whoever has it can push.
  endpoint     text not null unique
    check (char_length(endpoint) between 1 and 1000 and endpoint like 'https://%'),
  p256dh       text not null check (char_length(p256dh) between 1 and 200),
  auth         text not null check (char_length(auth) between 1 and 100),
  user_agent   text check (char_length(user_agent) <= 500),
  -- "Notify me about", as chosen on this browser: every conversation, or only theirs and
  -- unassigned ones.
  notify_about text not null default 'all' check (notify_about in ('all', 'mine')),
  created_at   timestamptz not null default now(),
  -- When a push last reached the push service for it.
  last_used_at timestamptz
);

create index agent_push_subscriptions_agent_id_idx on public.agent_push_subscriptions (agent_id);

alter table public.agent_push_subscriptions enable row level security;
revoke all on public.agent_push_subscriptions from anon, authenticated;
grant select, insert, update, delete on public.agent_push_subscriptions to authenticated;

create policy agent_push_subscriptions_own_read on public.agent_push_subscriptions
  for select to authenticated
  using (agent_id = (select auth.uid()) and (select private.is_agent()));

create policy agent_push_subscriptions_own_insert on public.agent_push_subscriptions
  for insert to authenticated
  with check (agent_id = (select auth.uid()) and (select private.is_agent()));

create policy agent_push_subscriptions_own_update on public.agent_push_subscriptions
  for update to authenticated
  using (agent_id = (select auth.uid()) and (select private.is_agent()))
  with check (agent_id = (select auth.uid()) and (select private.is_agent()));

create policy agent_push_subscriptions_own_delete on public.agent_push_subscriptions
  for delete to authenticated
  using (agent_id = (select auth.uid()) and (select private.is_agent()));

-- Keeps this browser's subscription for the team member asking. A browser that another team
-- member signed in to before moves to whoever signs in now: holding the endpoint, which only
-- the browser knows, is the proof it is theirs.
create function private.save_push_subscription(
  endpoint text,
  p256dh text,
  auth_key text,
  user_agent text,
  notify_about text
) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  saved uuid;
begin
  if not private.is_agent() then
    raise exception 'Only the team can turn on notifications' using errcode = '42501';
  end if;
  insert into public.agent_push_subscriptions as s
    (agent_id, endpoint, p256dh, auth, user_agent, notify_about)
  values ((select auth.uid()), endpoint, p256dh, auth_key, user_agent, notify_about)
  on conflict on constraint agent_push_subscriptions_endpoint_key do update
    set agent_id = excluded.agent_id,
        p256dh = excluded.p256dh,
        auth = excluded.auth,
        user_agent = excluded.user_agent,
        notify_about = excluded.notify_about
  returning s.id into saved;
  return saved;
end;
$$;

revoke execute on function private.save_push_subscription from public, anon;
grant execute on function private.save_push_subscription to authenticated;

-- The same, for a team member's browser to call through the Data API.
create function public.save_push_subscription(
  endpoint text,
  p256dh text,
  auth_key text,
  user_agent text default null,
  notify_about text default 'all'
) returns uuid
language sql set search_path = ''
as $$ select private.save_push_subscription(endpoint, p256dh, auth_key, user_agent, notify_about); $$;

revoke execute on function public.save_push_subscription from public, anon;
grant execute on function public.save_push_subscription to authenticated;

-- Someone deactivated is not told about conversations any more.
create function private.forget_push_subscriptions() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  delete from public.agent_push_subscriptions where agent_id = new.user_id;
  return new;
end;
$$;

create trigger agents_forget_push_subscriptions after update of active on public.agents
  for each row when (old.active and not new.active)
  execute function private.forget_push_subscriptions();

-- Pushes owed to the team: one for each message from a contact. Every message is queued here,
-- by the database, whichever way it arrived (the chat, a ticket form, a reply by email), and
-- the sender works out who should hear about it when it runs.
create table public.agent_push_queue (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations on delete cascade,
  message_id      uuid not null references public.messages on delete cascade,
  claimed_at      timestamptz,
  attempts        integer not null default 0,
  done_at         timestamptz,
  -- sent, skipped (read already, or nobody to tell) or failed (given up on).
  outcome         text check (outcome in ('sent', 'skipped', 'failed')),
  created_at      timestamptz not null default now()
);

create index agent_push_queue_due_idx on public.agent_push_queue (created_at)
  where done_at is null;
create index agent_push_queue_conversation_id_idx on public.agent_push_queue (conversation_id);
create index agent_push_queue_message_id_idx on public.agent_push_queue (message_id);

alter table public.agent_push_queue enable row level security;
revoke all on public.agent_push_queue from anon, authenticated;
create policy agent_push_queue_server_only on public.agent_push_queue for all to service_role
  using (true) with check (true);

create function private.queue_agent_push() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.sender_role in ('guest', 'user') then
    insert into public.agent_push_queue (conversation_id, message_id)
    values (new.conversation_id, new.id);
  end if;
  return null;
end;
$$;

create trigger messages_queue_agent_push after insert on public.messages
  for each row execute function private.queue_agent_push();

-- Hands a run of the sender the pushes owed, as `claim_push_queue` does for contacts' phones.
create function public.claim_agent_push_queue(batch integer default 100)
returns setof public.agent_push_queue
language sql set search_path = ''
as $$
  update public.agent_push_queue q
  set claimed_at = now(), attempts = q.attempts + 1
  where q.id in (
    select id from public.agent_push_queue
    where done_at is null
      and (claimed_at is null or claimed_at < now() - interval '10 minutes')
    order by created_at
    limit batch
    for update skip locked
  )
  returning q.*;
$$;

revoke execute on function public.claim_agent_push_queue from public, anon, authenticated;
grant execute on function public.claim_agent_push_queue to service_role;
