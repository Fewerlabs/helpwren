-- Push notifications to the host product's mobile apps: the devices to reach, the pushes owed,
-- and the push service's tickets waiting to be checked.

-- A phone that can be notified. It belongs to a contact (a guest or a user who has written), or
-- to the host product's user by their id, for an app that registers its user before they ever
-- open the chat. Only the server reads or writes devices.
create table public.devices (
  id          uuid primary key default gen_random_uuid(),
  contact_id  uuid references public.contacts on delete cascade,
  external_id text,
  -- The push service's address for this app on this phone. A phone that is handed to someone
  -- else moves to them when it registers again.
  push_token  text not null unique check (char_length(push_token) between 1 and 400),
  platform    text not null check (platform in ('ios', 'android')),
  -- Which of the install's sources the app is, such as `customer_app`.
  app         text not null check (char_length(app) between 1 and 40),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint devices_owner check (contact_id is not null or external_id is not null)
);

create index devices_contact_id_idx on public.devices (contact_id) where contact_id is not null;
create index devices_external_id_idx on public.devices (external_id) where external_id is not null;

alter table public.devices enable row level security;
revoke all on public.devices from anon, authenticated;
create policy devices_server_only on public.devices for all to authenticated
  using (false)
  with check (false);

create trigger devices_touch before update on public.devices
  for each row execute function private.touch_updated_at();

-- Pushes owed: one for each reply from the team. Sent a moment later, and only if the contact
-- has not read it in the chat by then.
create table public.push_queue (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations on delete cascade,
  message_id      uuid not null references public.messages on delete cascade,
  send_after      timestamptz not null default now(),
  claimed_at      timestamptz,
  attempts        integer not null default 0,
  done_at         timestamptz,
  -- sent, skipped (read already, or nowhere to send it) or failed (given up on).
  outcome         text check (outcome in ('sent', 'skipped', 'failed')),
  created_at      timestamptz not null default now()
);

create index push_queue_due_idx on public.push_queue (send_after) where done_at is null;
create index push_queue_conversation_id_idx on public.push_queue (conversation_id);

alter table public.push_queue enable row level security;
revoke all on public.push_queue from anon, authenticated;
create policy push_queue_server_only on public.push_queue for all to authenticated
  using (false)
  with check (false);

-- What the push service said it would deliver. Each is checked once its receipt is ready, and
-- a device the service says is gone is removed.
create table public.push_tickets (
  id         text primary key,
  device_id  uuid not null references public.devices on delete cascade,
  created_at timestamptz not null default now()
);

create index push_tickets_device_id_idx on public.push_tickets (device_id);
create index push_tickets_created_at_idx on public.push_tickets (created_at);

alter table public.push_tickets enable row level security;
revoke all on public.push_tickets from anon, authenticated;
create policy push_tickets_server_only on public.push_tickets for all to authenticated
  using (false)
  with check (false);

-- How long a reply waits before it is pushed: long enough that someone with the chat open
-- reads it there first.
create function private.reply_push_delay() returns interval
language sql immutable set search_path = ''
as $$ select interval '15 seconds' $$;

create function private.queue_reply_push() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.sender_role = 'agent' then
    insert into public.push_queue (conversation_id, message_id, send_after)
    values (new.conversation_id, new.id, new.created_at + private.reply_push_delay());
  end if;
  return null;
end;
$$;

create trigger messages_queue_reply_push after insert on public.messages
  for each row execute function private.queue_reply_push();

-- Hands a run of the sender the pushes that are due, as `claim_email_queue` does for emails.
create function public.claim_push_queue(batch integer default 100)
returns setof public.push_queue
language sql set search_path = ''
as $$
  update public.push_queue q
  set claimed_at = now(), attempts = q.attempts + 1
  where q.id in (
    select id from public.push_queue
    where done_at is null
      and send_after <= now()
      and (claimed_at is null or claimed_at < now() - interval '10 minutes')
    order by send_after
    limit batch
    for update skip locked
  )
  returning q.*;
$$;

revoke execute on function public.claim_push_queue from public, anon, authenticated;
grant execute on function public.claim_push_queue to service_role;
