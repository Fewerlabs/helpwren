-- Reply by email: a contact answers a notification email from their mail app, and the answer
-- lands in the same conversation. The server checks the signed reply address and the provider's
-- signature; the database records each email it was handed, so a provider that sends the same
-- email twice adds one message, and limits how fast one sender can write into one conversation.
--
-- `messages.channel` has been there from the start, defaulting to `chat`, and the stamping
-- trigger already sets it back to `chat` for anyone signed in. Only the server can say `email`.

-- Whether any message in the conversation arrived by email, for the inbox to say so without
-- reading the whole thread.
alter table public.conversations add column via_email boolean not null default false;

-- Every email the inbound route handed over with a valid reply address, kept to turn away a
-- repeat and to count how fast someone writes. Mail that fails the address check never gets
-- here: the server drops it before it reaches the database.
create table public.inbound_emails (
  id              uuid primary key default gen_random_uuid(),
  -- The email's Message-ID header, or the provider's own id when the email had none.
  email_id        text not null unique check (char_length(email_id) between 1 and 998),
  conversation_id uuid not null references public.conversations on delete cascade,
  -- Who it was from, lowercased.
  sender          text not null,
  --   added         it became a message
  --   wrong_sender  it was not from the contact's address, so it was not added
  --   rate_limited  the sender wrote too often into this conversation
  outcome         text not null check (outcome in ('added', 'wrong_sender', 'rate_limited')),
  message_id      uuid references public.messages on delete set null,
  received_at     timestamptz not null default now()
);

create index inbound_emails_conversation_sender_idx
  on public.inbound_emails (conversation_id, sender, received_at);
create index inbound_emails_message_id_idx on public.inbound_emails (message_id);

-- Only the server reads or writes it.
alter table public.inbound_emails enable row level security;
revoke all on public.inbound_emails from anon, authenticated;
create policy inbound_emails_server_only on public.inbound_emails for all to authenticated
  using (false)
  with check (false);

-- Adds an email reply to its conversation as the contact. Only the app's server may call it:
-- it trusts the conversation it is given, which the server takes from a reply address whose
-- signature it has checked.
--
-- Returns what became of the email:
--   added         a message, from the contact, with channel `email`
--   duplicate     this email was handed over before; nothing changed
--   wrong_sender  not from the contact's address; recorded, not added
--   rate_limited  the sender wrote too often into this conversation; recorded, not added
--   unknown       there is no such conversation
create function public.receive_email_reply(
  conversation_id uuid,
  sender text,
  email_id text,
  body text,
  attachments jsonb default '[]'
) returns text
language plpgsql set search_path = ''
as $$
declare
  -- A person replying by hand does not write twenty emails an hour into one conversation; a
  -- mail loop or a flood does.
  per_hour constant integer := 20;
  conversation public.conversations;
  contact public.contacts;
  from_address text := lower(trim(sender));
  outcome text;
  record_id uuid;
  new_message_id uuid;
begin
  select * into conversation from public.conversations c
  where c.id = receive_email_reply.conversation_id;
  if not found then
    return 'unknown';
  end if;
  select * into strict contact from public.contacts where id = conversation.contact_id;

  if contact.email is null or lower(contact.email) <> from_address then
    outcome := 'wrong_sender';
  elsif (
    select count(*) from public.inbound_emails e
    where e.conversation_id = conversation.id
      and e.sender = from_address
      and e.outcome = 'added'
      and e.received_at > now() - interval '1 hour'
  ) >= per_hour then
    outcome := 'rate_limited';
  else
    outcome := 'added';
  end if;

  -- Claimed first, so two deliveries of one email at the same moment add one message.
  insert into public.inbound_emails (email_id, conversation_id, sender, outcome)
  values (receive_email_reply.email_id, conversation.id, from_address, outcome)
  on conflict on constraint inbound_emails_email_id_key do nothing
  returning id into record_id;
  if record_id is null then
    return 'duplicate';
  end if;
  if outcome <> 'added' then
    return outcome;
  end if;

  -- A reply reopens the conversation, closed as well as resolved: the status email tells the
  -- contact that writing back opens it again. The change is the contact's, so it is recorded as
  -- theirs and sends them no status email.
  update public.conversations c set
    via_email = true,
    status = case when c.status in ('resolved', 'closed') then 'open' else c.status end
  where c.id = conversation.id;
  update public.conversation_events ev set actor_id = contact.id
  where ev.conversation_id = conversation.id
    and ev.kind = 'status_changed'
    and ev.data ->> 'to' = 'open'
    and ev.actor_id is null
    and ev.created_at = now();

  insert into public.messages (conversation_id, sender_id, sender_role, body, channel, attachments)
  -- An email that was only files has no words.
  values (conversation.id, contact.id, contact.kind, nullif(body, ''), 'email', attachments)
  returning id into new_message_id;

  update public.inbound_emails set message_id = new_message_id where id = record_id;
  return 'added';
end;
$$;

revoke execute on function public.receive_email_reply from public, anon, authenticated;
grant execute on function public.receive_email_reply to service_role;
