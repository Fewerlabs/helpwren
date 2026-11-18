-- Teams: named groups of team members, such as Billing or Support. A conversation can be given
-- to a team as well as, or in place of, one person, so the right people see it.

create table public.teams (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (char_length(btrim(name)) between 1 and 60),
  created_at timestamptz not null default now()
);

-- Two teams cannot share a name, however it is capitalised.
create unique index teams_name_key on public.teams (lower(btrim(name)));

create table public.team_members (
  team_id  uuid not null references public.teams on delete cascade,
  agent_id uuid not null references public.agents on delete cascade,
  primary key (team_id, agent_id)
);

create index team_members_agent_id_idx on public.team_members (agent_id);

-- A conversation's team. Deleting a team leaves its conversations with no team.
alter table public.conversations
  add column team_id uuid references public.teams on delete set null;

create index conversations_team_id_idx on public.conversations (team_id) where team_id is not null;

-- Every agent sees the teams and who is in them. Admins make, rename and remove teams and
-- choose their members.
alter table public.teams enable row level security;
revoke all on public.teams from anon, authenticated;
grant select, insert, update, delete on public.teams to authenticated;

create policy teams_read on public.teams for select to authenticated using (
  (select private.is_agent())
);
create policy teams_admin_insert on public.teams for insert to authenticated with check (
  (select private.is_admin())
);
create policy teams_admin_update on public.teams for update to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));
create policy teams_admin_delete on public.teams for delete to authenticated using (
  (select private.is_admin())
);

alter table public.team_members enable row level security;
revoke all on public.team_members from anon, authenticated;
grant select, insert, delete on public.team_members to authenticated;

create policy team_members_read on public.team_members for select to authenticated using (
  (select private.is_agent())
);
create policy team_members_admin_insert on public.team_members for insert to authenticated
with check ((select private.is_admin()));
create policy team_members_admin_delete on public.team_members for delete to authenticated using (
  (select private.is_admin())
);

-- Giving a conversation to a team is part of its history, for the team only. The team's name
-- is kept with the event, so the history still reads right after a team is renamed or removed.
alter table public.conversation_events drop constraint conversation_events_kind_check;
alter table public.conversation_events add constraint conversation_events_kind_check
  check (kind in (
    'ticket_created', 'status_changed', 'assigned', 'priority_changed', 'rated', 'team_changed'
  ));

create or replace function private.log_conversation_changes() returns trigger
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
  -- Not when a team is deleted out from under the conversation: nobody chose that for it.
  if new.team_id is distinct from old.team_id
     and (new.team_id is not null or exists (select 1 from public.teams where id = old.team_id))
  then
    insert into public.conversation_events (conversation_id, actor_id, kind, data)
    values (new.id, actor, 'team_changed', jsonb_build_object(
      'to', new.team_id,
      'name', (select name from public.teams where id = new.team_id)
    ));
  end if;
  return null;
end;
$$;
