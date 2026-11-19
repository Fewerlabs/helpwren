-- Install status: how far the first-run setup has gone, whether the widget has been seen on a
-- real site, and the one way an install with no team gets its first admin.

-- One row for the whole install. It is apart from `settings` because nobody types these
-- values: the server records them as things happen.
create table public.install_status (
  id                       boolean primary key default true check (id),
  -- When the first admin finished or skipped the setup wizard. Until then, /setup goes on.
  setup_completed_at       timestamptz,
  -- The first site the widget loaded on, and the latest, for the live install check.
  widget_first_seen_origin text,
  widget_first_seen_at     timestamptz,
  widget_last_seen_origin  text,
  widget_last_seen_at      timestamptz
);

-- An install that already has a team was set up before this table existed, by the command line,
-- so it has nothing left to do in the wizard.
insert into public.install_status (setup_completed_at)
select case when exists (select 1 from public.agents) then now() end;

-- Only the app's server reads or writes it. The wizard asks through the server, after checking
-- the caller is an admin.
alter table public.install_status enable row level security;
revoke all on public.install_status from anon, authenticated;

create policy install_status_server_only on public.install_status for all to service_role
  using (true) with check (true);

-- Makes the first admin of an install that has no team at all. Returns false, and changes
-- nothing, once anyone is on the team: after that, admins add people from Settings.
--
-- Two people can open /setup on a new install at the same moment. The lock makes the second
-- call wait until the first has committed, so it then sees the first admin and refuses. Only
-- one of them can ever win.
create function public.create_first_admin(user_id uuid, name text, email text)
returns boolean
language plpgsql set search_path = ''
as $$
begin
  lock table public.agents in share row exclusive mode;
  if exists (select 1 from public.agents) then
    return false;
  end if;
  insert into public.agents (user_id, name, email, role, active)
  values (create_first_admin.user_id, create_first_admin.name, create_first_admin.email,
          'admin', true);
  return true;
end;
$$;

revoke execute on function public.create_first_admin(uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.create_first_admin(uuid, text, text) to service_role;

-- Notes that the widget asked for its look from a site. Called by the app's server from
-- `GET /api/widget`, which every page with the widget calls, so it writes at most once a minute
-- per site rather than once per page view.
create function public.record_widget_seen(origin text) returns void
language sql set search_path = ''
as $$
  update public.install_status set
    widget_first_seen_origin = coalesce(widget_first_seen_origin, record_widget_seen.origin),
    widget_first_seen_at     = coalesce(widget_first_seen_at, now()),
    widget_last_seen_origin  = record_widget_seen.origin,
    widget_last_seen_at      = now()
  where id
    and (widget_last_seen_at is null
      or widget_last_seen_at < now() - interval '1 minute'
      or widget_last_seen_origin is distinct from record_widget_seen.origin);
$$;

revoke execute on function public.record_widget_seen(text) from public, anon, authenticated;
grant execute on function public.record_widget_seen(text) to service_role;

-- The newest migration this database has had, for `GET /api/health`. The migration history is
-- in a schema the API roles cannot see, so the reading is done by a security definer function
-- in `private`, which only the server may call. Null when the migrations were applied without
-- the Supabase CLI, which keeps no history table.
create function private.schema_version() returns text
language plpgsql stable security definer set search_path = ''
as $$
begin
  return (select max(version) from supabase_migrations.schema_migrations);
exception
  when undefined_table or invalid_schema_name then
    return null;
end;
$$;

revoke execute on function private.schema_version() from public, anon, authenticated;
grant execute on function private.schema_version() to service_role;

create function public.schema_version() returns text
language sql stable set search_path = ''
as $$ select private.schema_version(); $$;

revoke execute on function public.schema_version() from public, anon, authenticated;
grant execute on function public.schema_version() to service_role;
