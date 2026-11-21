-- Team invites: a link that lets someone added to the team choose their first password.
--
-- Only a hash of each link's token is kept, so the table cannot be used to sign in to anyone's
-- account even by someone who reads it. The browser roles are granted nothing here: the app's
-- server makes, checks and uses invites with the secret key.
create table public.agent_invites (
  id         uuid primary key default gen_random_uuid(),
  agent_id   uuid not null references public.agents on delete cascade,
  -- The SHA-256 of the token in the link, in hex.
  token_hash text not null unique check (token_hash ~ '^[a-f0-9]{64}$'),
  created_by uuid references public.agents on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '7 days',
  used_at    timestamptz
);

create index agent_invites_agent_id_idx on public.agent_invites (agent_id);
create index agent_invites_created_by_idx on public.agent_invites (created_by);

alter table public.agent_invites enable row level security;
revoke all on public.agent_invites from anon, authenticated;

create policy agent_invites_server_only on public.agent_invites for all to service_role
  using (true) with check (true);

-- Someone deactivated can no longer join through a link they were sent.
create function private.revoke_agent_invites() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  delete from public.agent_invites where agent_id = new.user_id and used_at is null;
  return new;
end;
$$;

create trigger agents_revoke_invites after update of active on public.agents
  for each row when (old.active and not new.active)
  execute function private.revoke_agent_invites();

-- When each team member last signed in, or null for someone who never has: the team list marks
-- them as invited. Sign-ins are kept by Supabase Auth, which no API role may read, so this reads
-- them as the function's owner and returns nothing else.
create function private.agent_sign_ins()
returns table (user_id uuid, last_sign_in_at timestamptz)
language sql stable security definer set search_path = ''
as $$
  select a.user_id, u.last_sign_in_at
  from public.agents a
  join auth.users u on u.id = a.user_id;
$$;

revoke execute on function private.agent_sign_ins from public, anon, authenticated;
grant execute on function private.agent_sign_ins to service_role;

-- The same, for the app's server to call through the Data API.
create function public.agent_sign_ins()
returns table (user_id uuid, last_sign_in_at timestamptz)
language sql stable set search_path = ''
as $$ select * from private.agent_sign_ins(); $$;

revoke execute on function public.agent_sign_ins from public, anon, authenticated;
grant execute on function public.agent_sign_ins to service_role;
