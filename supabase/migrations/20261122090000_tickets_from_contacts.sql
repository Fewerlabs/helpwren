-- A contact can open a ticket themselves, from the chat, and not only have a conversation
-- turned into one by the team. It is the same conversation, born as a ticket.

-- A new parameter changes the function's signature, so the old one is dropped first.
drop function public.start_conversation(uuid, text, text, jsonb, text, text, text);

create function public.start_conversation(
  contact_id uuid,
  body text,
  source text,
  context jsonb default '{}',
  contact_name text default null,
  contact_email text default null,
  contact_phone text default null,
  -- Given, the conversation starts as a ticket with this subject.
  ticket_subject text default null
) returns uuid
language plpgsql set search_path = ''
as $$
declare
  per_hour constant integer := 5;
  contact public.contacts;
  conversation public.conversations;
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
