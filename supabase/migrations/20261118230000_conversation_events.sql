-- A record of what happened to a conversation besides its messages: it became a ticket, its
-- status changed, it was assigned, its priority changed. The database writes these itself when
-- a conversation is updated, so the record cannot be forged, skipped or edited.

create table public.conversation_events (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations on delete cascade,
  -- Who made the change. Null when the server did, or the system.
  actor_id        uuid,
  kind            text not null
    check (kind in ('ticket_created', 'status_changed', 'assigned', 'priority_changed')),
  -- What changed: {number, subject}, {from, to}, {to}, {from, to}.
  data            jsonb not null default '{}',
  created_at      timestamptz not null default now()
);

create index conversation_events_conversation_id_idx
  on public.conversation_events (conversation_id, created_at);

-- Agents read every event. A contact reads the ones about where their request stands, and
-- not who it was assigned to or how urgent the team thinks it is. Nobody writes from a browser.
alter table public.conversation_events enable row level security;
revoke all on public.conversation_events from anon, authenticated;
grant select on public.conversation_events to authenticated;

create policy conversation_events_read on public.conversation_events for select to authenticated
using (
  (select private.is_agent())
  or (
    kind in ('ticket_created', 'status_changed')
    -- Inherits conversations_read: the row is only found if the caller may read it.
    and exists (select 1 from public.conversations c where c.id = conversation_id)
  )
);

create function private.log_conversation_changes() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  actor uuid := auth.uid();
begin
  if old.type = 'chat' and new.type = 'ticket' then
    insert into public.conversation_events (conversation_id, actor_id, kind, data)
    values (new.id, actor, 'ticket_created',
            jsonb_build_object('number', new.ticket_number, 'subject', new.subject));
  end if;
  if new.status is distinct from old.status then
    insert into public.conversation_events (conversation_id, actor_id, kind, data)
    values (new.id, actor, 'status_changed',
            jsonb_build_object('from', old.status, 'to', new.status));
  end if;
  if new.assignee_id is distinct from old.assignee_id then
    insert into public.conversation_events (conversation_id, actor_id, kind, data)
    values (new.id, actor, 'assigned', jsonb_build_object('to', new.assignee_id));
  end if;
  if new.priority is distinct from old.priority then
    insert into public.conversation_events (conversation_id, actor_id, kind, data)
    values (new.id, actor, 'priority_changed',
            jsonb_build_object('from', old.priority, 'to', new.priority));
  end if;
  return null;
end;
$$;

create trigger conversations_log_changes after update on public.conversations
  for each row execute function private.log_conversation_changes();

-- Events arrive live. Those a contact may see travel on the conversation's channel; the rest
-- on the team's channel, with the notes.
create function private.broadcast_conversation_event() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  perform realtime.broadcast_changes(
    case
      when new.kind in ('ticket_created', 'status_changed') then 'conversation:'
      else 'notes:'
    end || new.conversation_id,
    tg_op, tg_op, tg_table_name, tg_table_schema, new, null
  );
  return null;
end;
$$;

create trigger conversation_events_broadcast after insert on public.conversation_events
  for each row execute function private.broadcast_conversation_event();
