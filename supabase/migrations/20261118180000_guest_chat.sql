-- Guest chat: what a new message does to its conversation, starting a conversation, and limits
-- on how fast one person can write.

alter table public.contacts add column phone text;

alter table public.messages
  add constraint messages_body_length check (body is null or char_length(body) between 1 and 5000);

-- Each new message updates its conversation: the preview and time shown in lists, the other
-- side's unread count, and the status, so that a resolved conversation reopens when the contact
-- writes again. Runs as its owner because a contact may not update conversations themselves.
create function private.apply_message_to_conversation() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  from_contact boolean := new.sender_role in ('guest', 'user');
begin
  update public.conversations set
    last_message_preview = left(new.body, 140),
    last_message_at = new.created_at,
    unread_for_agents = unread_for_agents + (case when from_contact then 1 else 0 end),
    unread_for_contact = unread_for_contact + (case when new.sender_role = 'agent' then 1 else 0 end),
    status = case when from_contact and status = 'resolved' then 'open' else status end
  where id = new.conversation_id;
  return null;
end;
$$;

create trigger messages_apply_to_conversation after insert on public.messages
  for each row execute function private.apply_message_to_conversation();

-- A contact may send at most this many messages a minute. Agents and the server are not limited.
-- Raised with the code HW429, which the client library reports as "slow down".
create function private.limit_messages() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  caller uuid := auth.uid();
  per_minute constant integer := 20;
begin
  if caller is null or private.is_agent() then
    return new;
  end if;

  if (
    select count(*) from public.messages
    where sender_id = caller and created_at > now() - interval '1 minute'
  ) >= per_minute then
    raise exception 'Too many messages. Wait a moment and try again.' using errcode = 'HW429';
  end if;
  return new;
end;
$$;

-- Named to run before messages_stamp: triggers on one event fire in alphabetical order.
create trigger messages_limit before insert on public.messages
  for each row execute function private.limit_messages();

-- Starts a conversation with its first message, creating or updating the contact, all in one
-- transaction. Only the app's server may call it: it trusts the contact id it is given, which
-- the server takes from a verified session.
create function public.start_conversation(
  contact_id uuid,
  body text,
  source text,
  context jsonb default '{}',
  contact_name text default null,
  contact_email text default null,
  contact_phone text default null
) returns uuid
language plpgsql set search_path = ''
as $$
declare
  per_hour constant integer := 5;
  contact public.contacts;
  conversation_id uuid;
begin
  if (
    select count(*) from public.conversations c
    where c.contact_id = start_conversation.contact_id
      and c.created_at > now() - interval '1 hour'
  ) >= per_hour then
    raise exception 'Too many new conversations. Try again later.' using errcode = 'HW429';
  end if;

  -- Details given now replace older ones; details left out keep what is already known.
  insert into public.contacts as existing (id, name, email, phone)
  values (contact_id, contact_name, contact_email, contact_phone)
  on conflict (id) do update set
    name = coalesce(excluded.name, existing.name),
    email = coalesce(excluded.email, existing.email),
    phone = coalesce(excluded.phone, existing.phone)
  returning * into contact;

  insert into public.conversations (contact_id, source, context)
  values (contact.id, source, context)
  returning id into conversation_id;

  insert into public.messages (conversation_id, sender_id, sender_role, body)
  values (conversation_id, contact.id, contact.kind, body);

  return conversation_id;
end;
$$;

revoke execute on function public.start_conversation from public, anon, authenticated;
grant execute on function public.start_conversation to service_role;
