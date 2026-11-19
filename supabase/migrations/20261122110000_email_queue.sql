-- Emails the install owes its contacts. The database notes each one as the thing that causes
-- it happens, and the server sends them a little later, so a reply that is read in the chat
-- within a few minutes never becomes an email.
--
--   reply    an agent replied; sent if the contact has still not read it after a few minutes
--   status   a ticket's status was changed by the team

create table public.email_queue (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations on delete cascade,
  kind            text not null check (kind in ('reply', 'status')),
  -- What it is about: the reply, or the change of status.
  message_id      uuid references public.messages on delete cascade,
  event_id        uuid references public.conversation_events on delete cascade,
  -- Not before this. A reply waits, to give the contact time to read it in the chat.
  send_after      timestamptz not null default now(),
  -- Set while a run of the sender has it, so two runs never send the same email.
  claimed_at      timestamptz,
  attempts        integer not null default 0,
  done_at         timestamptz,
  -- sent, skipped (read already, no address, or turned off) or failed (given up on).
  outcome         text check (outcome in ('sent', 'skipped', 'failed')),
  created_at      timestamptz not null default now()
);

create index email_queue_due_idx on public.email_queue (send_after) where done_at is null;
create index email_queue_conversation_id_idx on public.email_queue (conversation_id);

-- Only the server reads or writes the queue.
alter table public.email_queue enable row level security;
revoke all on public.email_queue from anon, authenticated;

-- How long a reply waits to be read before it is emailed.
create function private.reply_email_delay() returns interval
language sql immutable set search_path = ''
as $$ select interval '5 minutes' $$;

create function private.queue_reply_email() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.sender_role = 'agent' then
    insert into public.email_queue (conversation_id, kind, message_id, send_after)
    values (new.conversation_id, 'reply', new.id, new.created_at + private.reply_email_delay());
  end if;
  return null;
end;
$$;

create trigger messages_queue_reply_email after insert on public.messages
  for each row execute function private.queue_reply_email();

create function private.queue_status_email() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  -- Only for tickets, and only when the team changed it: a ticket that reopens because its
  -- contact wrote again is no news to that contact.
  if new.kind = 'status_changed' and exists (
    select 1 from public.conversations c
    where c.id = new.conversation_id
      and c.type = 'ticket'
      and new.actor_id is distinct from c.contact_id
      and new.actor_id is not null
  ) then
    insert into public.email_queue (conversation_id, kind, event_id)
    values (new.conversation_id, 'status', new.id);
  end if;
  return null;
end;
$$;

create trigger conversation_events_queue_status_email after insert on public.conversation_events
  for each row execute function private.queue_status_email();

-- Hands a run of the sender the emails that are due, and marks them as taken so that another
-- run at the same moment gets different ones. A claim that is ten minutes old belonged to a run
-- that died, and is given out again.
create function public.claim_email_queue(batch integer default 50)
returns setof public.email_queue
language sql set search_path = ''
as $$
  update public.email_queue q
  set claimed_at = now(), attempts = q.attempts + 1
  where q.id in (
    select id from public.email_queue
    where done_at is null
      and send_after <= now()
      and (claimed_at is null or claimed_at < now() - interval '10 minutes')
    order by send_after
    limit batch
    for update skip locked
  )
  returning q.*;
$$;

revoke execute on function public.claim_email_queue from public, anon, authenticated;
grant execute on function public.claim_email_queue to service_role;
