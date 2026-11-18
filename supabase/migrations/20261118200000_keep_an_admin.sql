-- An install must always have someone who can manage it. Whatever changes the team, at least
-- one active admin has to be left, or the change is refused with the code HW409.
create function private.keep_an_admin() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if exists (select 1 from public.agents)
    and not exists (select 1 from public.agents where active and role = 'admin')
  then
    raise exception 'The team needs at least one active admin.' using errcode = 'HW409';
  end if;
  return null;
end;
$$;

create trigger agents_keep_an_admin after update or delete on public.agents
  for each statement execute function private.keep_an_admin();
