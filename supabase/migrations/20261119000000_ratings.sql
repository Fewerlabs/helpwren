-- Ratings. Once a conversation is resolved, its contact can say how it went: a score from 1 to
-- 5 and, if they like, a comment. One rating per conversation, and it cannot be changed.

create table public.conversation_ratings (
  conversation_id uuid primary key references public.conversations on delete cascade,
  contact_id      uuid not null references public.contacts on delete cascade,
  score           smallint not null check (score between 1 and 5),
  comment         text check (char_length(comment) between 1 and 1000),
  created_at      timestamptz not null default now()
);

create index conversation_ratings_contact_id_idx on public.conversation_ratings (contact_id);

-- A contact rates their own conversation, as themselves, and only once it is resolved or
-- closed. They and the team can read it. Nobody edits or removes one.
alter table public.conversation_ratings enable row level security;
revoke all on public.conversation_ratings from anon, authenticated;
grant select, insert on public.conversation_ratings to authenticated;

create policy conversation_ratings_read on public.conversation_ratings for select to authenticated
using (contact_id = (select auth.uid()) or (select private.is_agent()));

create policy conversation_ratings_insert on public.conversation_ratings for insert to authenticated
with check (
  contact_id = (select auth.uid())
  and exists (
    select 1 from public.conversations c
    where c.id = conversation_id
      and c.contact_id = (select auth.uid())
      and c.status in ('resolved', 'closed')
  )
);

-- A rating is part of the conversation's history, for both sides.
alter table public.conversation_events drop constraint conversation_events_kind_check;
alter table public.conversation_events add constraint conversation_events_kind_check
  check (kind in ('ticket_created', 'status_changed', 'assigned', 'priority_changed', 'rated'));

create function private.log_rating() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.conversation_events (conversation_id, actor_id, kind, data)
  values (new.conversation_id, new.contact_id, 'rated', jsonb_build_object('score', new.score));
  return null;
end;
$$;

create trigger conversation_ratings_log after insert on public.conversation_ratings
  for each row execute function private.log_rating();

drop policy conversation_events_read on public.conversation_events;
create policy conversation_events_read on public.conversation_events for select to authenticated
using (
  (select private.is_agent())
  or (
    kind in ('ticket_created', 'status_changed', 'rated')
    -- Inherits conversations_read: the row is only found if the caller may read it.
    and exists (select 1 from public.conversations c where c.id = conversation_id)
  )
);

create or replace function private.broadcast_conversation_event() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  perform realtime.broadcast_changes(
    case
      when new.kind in ('ticket_created', 'status_changed', 'rated') then 'conversation:'
      else 'notes:'
    end || new.conversation_id,
    tg_op, tg_op, tg_table_name, tg_table_schema, new, null
  );
  return null;
end;
$$;
