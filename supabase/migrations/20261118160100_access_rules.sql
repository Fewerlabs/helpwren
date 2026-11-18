-- Access rules. Row Level Security is on for every table, and each table grants the browser
-- roles only the operations a policy exists for. Anything not listed here is done by the server
-- with the secret key, which bypasses these rules.

-- Helper functions live in a schema the Data API does not expose, so they cannot be called
-- from the browser. They run as their owner (security definer) so that a policy can look at
-- `agents` and `contacts` without the caller needing access to those rows.
create schema private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated, service_role;
alter default privileges in schema private revoke execute on functions from public;

create function private.is_agent() returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.agents where user_id = (select auth.uid()) and active
  );
$$;

create function private.is_admin() returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.agents
    where user_id = (select auth.uid()) and active and role = 'admin'
  );
$$;

-- The caller's organisation, or null if they have none or are not verified. Read from the
-- contact's row, not from the session token, so an unverified label unlocks nothing.
create function private.current_org_id() returns text
language sql stable security definer set search_path = ''
as $$
  select org_id from public.contacts where id = (select auth.uid()) and verified;
$$;

grant execute on function private.is_agent() to anon, authenticated, service_role;
grant execute on function private.is_admin() to anon, authenticated, service_role;
grant execute on function private.current_org_id() to anon, authenticated, service_role;

-- contacts: a person reads their own row; agents read all. Only the server writes.
alter table public.contacts enable row level security;
revoke all on public.contacts from anon, authenticated;
grant select on public.contacts to authenticated;

create policy contacts_read on public.contacts for select to authenticated using (
  id = (select auth.uid()) or (select private.is_agent())
);

-- agents: active agents read the team. Only the server writes.
alter table public.agents enable row level security;
revoke all on public.agents from anon, authenticated;
grant select on public.agents to authenticated;

create policy agents_read on public.agents for select to authenticated using (
  (select private.is_agent())
);

-- conversations: the owner, verified teammates in the same organisation, and agents read.
-- Agents update. The server creates them, so that contact, source and context cannot be forged.
alter table public.conversations enable row level security;
revoke all on public.conversations from anon, authenticated;
grant select, update on public.conversations to authenticated;

create policy conversations_read on public.conversations for select to authenticated using (
  contact_id = (select auth.uid())
  or (org_id is not null and org_id = (select private.current_org_id()))
  or (select private.is_agent())
);

create policy conversations_agent_update on public.conversations for update to authenticated
  using ((select private.is_agent()))
  with check ((select private.is_agent()));

-- messages: readable by anyone who can read the conversation. The owner and agents add
-- messages as themselves. Nobody edits or deletes.
alter table public.messages enable row level security;
revoke all on public.messages from anon, authenticated;
grant select, insert on public.messages to authenticated;

create policy messages_read on public.messages for select to authenticated using (
  -- Inherits conversations_read: the row is only found if the caller may read it.
  exists (select 1 from public.conversations c where c.id = conversation_id)
);

create policy messages_insert on public.messages for insert to authenticated with check (
  sender_id = (select auth.uid())
  and exists (
    select 1 from public.conversations c
    where c.id = conversation_id
      and (c.contact_id = (select auth.uid()) or (select private.is_agent()))
  )
);

-- notes: agents only. An agent writes notes as themselves and changes only their own.
alter table public.notes enable row level security;
revoke all on public.notes from anon, authenticated;
grant select, insert, update, delete on public.notes to authenticated;

create policy notes_read on public.notes for select to authenticated using (
  (select private.is_agent())
);

create policy notes_insert on public.notes for insert to authenticated with check (
  (select private.is_agent()) and author_id = (select auth.uid())
);

create policy notes_update on public.notes for update to authenticated
  using ((select private.is_agent()) and author_id = (select auth.uid()))
  with check ((select private.is_agent()) and author_id = (select auth.uid()));

create policy notes_delete on public.notes for delete to authenticated using (
  (select private.is_agent()) and author_id = (select auth.uid())
);

-- settings: public rows are readable by anyone, including visitors with no session, because
-- the widget needs the brand before a session exists. Agents read all. Admins write.
alter table public.settings enable row level security;
revoke all on public.settings from anon, authenticated;
grant select on public.settings to anon;
grant select, insert, update, delete on public.settings to authenticated;

create policy settings_read on public.settings for select to anon, authenticated using (
  is_public or (select private.is_agent())
);

create policy settings_admin_insert on public.settings for insert to authenticated with check (
  (select private.is_admin())
);

create policy settings_admin_update on public.settings for update to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create policy settings_admin_delete on public.settings for delete to authenticated using (
  (select private.is_admin())
);
