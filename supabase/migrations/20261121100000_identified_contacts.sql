-- Identified users: where the server keeps secrets, and how a contact becomes a verified user
-- of the host product.

-- Secrets the server needs and nobody else may see: the keys that sign identity tokens, and
-- later the push and email credentials. They are apart from `settings` because every team
-- member can read those. The browser roles are granted nothing here, so only the app's server,
-- with the secret key, reads or writes a row.
create table public.secrets (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.secrets enable row level security;
revoke all on public.secrets from anon, authenticated;

create policy secrets_server_only on public.secrets for all to service_role
  using (true) with check (true);

create trigger secrets_touch before update on public.secrets
  for each row execute function private.touch_updated_at();

-- Records that an identity adapter has confirmed who a contact is: they become a verified user
-- with the host product's id for them, and whatever else it said about them. Only the app's
-- server may call it: it trusts what it is given, which the server takes from the adapter.
--
-- The host product is the authority on these details, so what it sends replaces what was
-- there. A name or email it leaves out keeps the one the person typed; an organisation it
-- leaves out means they are in none, and stop sharing conversations with one.
create function public.identify_contact(
  contact_id uuid,
  external_id text,
  name text default null,
  email text default null,
  org_id text default null,
  org_name text default null,
  audience text default null,
  attributes jsonb default '{}'
) returns public.contacts
language plpgsql set search_path = ''
as $$
declare
  contact public.contacts;
begin
  insert into public.contacts as existing
    (id, kind, verified, external_id, name, email, org_id, org_name, audience, attributes)
  values
    (contact_id, 'user', true, external_id, name, email, org_id, org_name, audience, attributes)
  on conflict (id) do update set
    kind = 'user',
    verified = true,
    external_id = excluded.external_id,
    name = coalesce(excluded.name, existing.name),
    email = coalesce(excluded.email, existing.email),
    org_id = excluded.org_id,
    org_name = excluded.org_name,
    audience = coalesce(excluded.audience, existing.audience),
    attributes = existing.attributes || excluded.attributes
  returning * into contact;

  -- A conversation takes its organisation from its contact when it starts. Ones that started
  -- before the contact was verified, or before they changed organisation, are brought in step.
  update public.conversations c set org_id = contact.org_id
  where c.contact_id = contact.id and c.org_id is distinct from contact.org_id;

  return contact;
end;
$$;

revoke execute on function public.identify_contact from public, anon, authenticated;
grant execute on function public.identify_contact to service_role;
