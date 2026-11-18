-- Tickets and live internal notes.
--
-- A ticket is a conversation that needs tracking: it gains a number, and usually a subject, a
-- priority and an assignee. Agents already may update conversations; this adds the number and
-- keeps it honest.

create sequence public.ticket_number_seq start 1000;
revoke all on sequence public.ticket_number_seq from public, anon, authenticated;

-- The number is given once, when a chat becomes a ticket, and never changes or goes away:
-- people quote it. Nothing a client sends can set it, and a ticket cannot be turned back.
create function private.number_ticket() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if old.type = 'ticket' then
    new.type := 'ticket';
    new.ticket_number := old.ticket_number;
  elsif new.type = 'ticket' then
    new.ticket_number := nextval('public.ticket_number_seq');
  else
    new.ticket_number := null;
  end if;
  return new;
end;
$$;

-- Named to run before conversations_touch: triggers on one event fire in alphabetical order.
create trigger conversations_number_ticket before update on public.conversations
  for each row execute function private.number_ticket();

create function private.number_new_ticket() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  new.ticket_number :=
    case when new.type = 'ticket' then nextval('public.ticket_number_seq') else null end;
  return new;
end;
$$;

create trigger conversations_number_new_ticket before insert on public.conversations
  for each row execute function private.number_new_ticket();

create index conversations_type_idx on public.conversations (type) where type = 'ticket';

-- Internal notes arrive live for the team, on a channel of their own. They must never travel
-- on the conversation's channel, which its contact may listen to.
create function private.broadcast_note() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  perform realtime.broadcast_changes(
    'notes:' || new.conversation_id, tg_op, tg_op, tg_table_name, tg_table_schema, new, null
  );
  return null;
end;
$$;

create trigger notes_broadcast after insert on public.notes
  for each row execute function private.broadcast_note();

alter table public.notes
  add constraint notes_body_length check (char_length(body) between 1 and 5000);

drop policy helpwren_listen on realtime.messages;
create policy helpwren_listen on realtime.messages for select to authenticated using (
  case split_part((select realtime.topic()), ':', 1)
    when 'inbox' then (select private.is_agent())
    when 'notes' then (select private.is_agent())
    when 'contact' then
      split_part((select realtime.topic()), ':', 2) = (select auth.uid())::text
    when 'conversation' then exists (
      select 1 from public.conversations c
      where c.id::text = split_part((select realtime.topic()), ':', 2)
    )
    else false
  end
);
