-- A guest who comes back finds their conversations, even when their browser lost the session.
-- See ADR 0029.

-- The keys the install hands a guest's browser, in a cookie of its own, alongside the session the
-- chat keeps. Only a hash is kept: the key itself is in the browser and nowhere else. One guest
-- may have several, one for each browser they have written from. Only the server reads or
-- writes them.
create table public.guest_keys (
  key_hash     text primary key check (key_hash ~ '^[a-f0-9]{64}$'),
  guest_id     uuid not null references auth.users on delete cascade,
  created_at   timestamptz not null default now(),
  last_used_at timestamptz not null default now()
);

create index guest_keys_guest_id_idx on public.guest_keys (guest_id);

alter table public.guest_keys enable row level security;
revoke all on public.guest_keys from anon, authenticated;
create policy guest_keys_server_only on public.guest_keys for all to authenticated
  using (false)
  with check (false);

-- How long a key lasts without being used: what browsers allow a cookie at most.
create function private.guest_key_lifetime() returns interval
language sql immutable set search_path = ''
as $$ select interval '400 days' $$;

-- Whether this person is a guest whose things may be moved: an anonymous sign-in who is not on
-- the team, and whose contact, if they have written, is an unverified guest. Reads who signed in
-- anonymously, which only Supabase Auth's own roles may see, so it runs as its owner.
create function private.is_plain_guest(person uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select
    exists (select 1 from auth.users where id = person and is_anonymous)
    and not exists (select 1 from public.agents where user_id = person)
    and not exists (
      select 1 from public.contacts where id = person and (kind <> 'guest' or verified)
    );
$$;

revoke execute on function private.is_plain_guest from public, anon, authenticated;
grant execute on function private.is_plain_guest to service_role;

-- Moves everything one contact did to another, and removes the first: their conversations, the
-- messages they sent, their ratings, their part in each conversation's history, and their
-- browsers. What the first typed about themselves fills only what the second has not said.
-- The callers check who may be moved where.
create function private.move_contact(source public.contacts, target public.contacts)
returns integer
language plpgsql set search_path = ''
as $$
declare
  latest public.visitors;
  moved integer;
begin
  -- The conversations join the target's organisation as they arrive, as if they had started
  -- there.
  update public.conversations
  set contact_id = target.id, org_id = target.org_id
  where contact_id = source.id;
  get diagnostics moved = row_count;

  update public.messages set sender_id = target.id where sender_id = source.id;
  update public.conversation_ratings set contact_id = target.id where contact_id = source.id;
  update public.conversation_events set actor_id = target.id where actor_id = source.id;
  -- Before the source is removed, which would otherwise leave their browsers belonging to nobody.
  update public.visitors set contact_id = target.id where visitors.contact_id = source.id;

  update public.contacts set
    name = coalesce(target.name, source.name),
    email = coalesce(target.email, source.email),
    phone = coalesce(target.phone, source.phone),
    network_key = coalesce(target.network_key, source.network_key)
  where id = target.id;

  -- The details come from whichever of their browsers was seen last.
  select * into latest from public.visitors
  where visitors.contact_id = target.id
  order by last_seen_at desc
  limit 1;
  if found then
    perform private.copy_visitor_to_contact(latest);
  end if;

  delete from public.contacts where id = source.id;
  return moved;
end;
$$;

revoke execute on function private.move_contact from public;
grant execute on function private.move_contact to service_role;

-- As before, with the moving itself shared with `restore_guest`.
create or replace function public.merge_guest_into_user(guest_id uuid, user_id uuid) returns integer
language plpgsql set search_path = ''
as $$
declare
  guest public.contacts;
  target public.contacts;
begin
  if guest_id = user_id then
    return 0;
  end if;

  select * into target from public.contacts
  where id = user_id and kind = 'user' and verified
  for update;
  if not found then
    raise exception 'Only a verified user can take over a guest''s conversations.'
      using errcode = '22023';
  end if;

  if exists (select 1 from public.agents where agents.user_id = guest_id) then
    raise exception 'A team member is not a guest.' using errcode = '22023';
  end if;

  select * into guest from public.contacts where id = guest_id for update;
  if not found then
    -- A guest who never wrote has nothing to bring.
    return 0;
  end if;
  if guest.kind <> 'guest' or guest.verified then
    raise exception 'Only a guest''s conversations can be moved.' using errcode = '22023';
  end if;

  return private.move_contact(guest, target);
end;
$$;

-- Gives a guest's browser a key of its own, and lets go of their keys that have run out. Only
-- the app's server calls it, for a guest whose session it has verified.
create function public.issue_guest_key(guest_id uuid, key_hash text) returns void
language plpgsql set search_path = ''
as $$
begin
  if not private.is_plain_guest(guest_id) then
    raise exception 'Only a guest is given a guest key.' using errcode = '22023';
  end if;

  delete from public.guest_keys k
  where k.guest_id = issue_guest_key.guest_id
    and k.last_used_at < now() - private.guest_key_lifetime();

  insert into public.guest_keys (key_hash, guest_id)
  values (issue_guest_key.key_hash, issue_guest_key.guest_id);
end;
$$;

revoke execute on function public.issue_guest_key from public, anon, authenticated;
grant execute on function public.issue_guest_key to service_role;

-- Whose a key is, if it has not run out. A key is renewed each time the chat opens.
create function public.guest_for_key(key_hash text) returns uuid
language sql stable set search_path = ''
as $$
  select k.guest_id from public.guest_keys k
  where k.key_hash = guest_for_key.key_hash
    and k.last_used_at >= now() - private.guest_key_lifetime();
$$;

revoke execute on function public.guest_for_key from public, anon, authenticated;
grant execute on function public.guest_for_key to service_role;

-- A browser comes back with its key and a guest session. When the session is the key's guest,
-- the key is swapped for a new one. When it is another guest, the browser lost the key's
-- guest's session and started again: what the key's guest had moves to the new guest, and
-- the key is swapped for one of theirs. Returns the old
-- guest's id, for the server to remove their sign-in, and how many conversations moved; or no
-- row, when the key is not good or its guest cannot be moved. Only the app's server calls it.
--
-- A guest the team has blocked is not restored: their conversations stay where they are.
create function public.restore_guest(key_hash text, into_guest uuid, new_key_hash text)
returns table (previous_guest uuid, moved integer)
language plpgsql set search_path = ''
as $$
declare
  previous uuid;
  source public.contacts;
  target public.contacts;
  moved_count integer := 0;
begin
  select k.guest_id into previous from public.guest_keys k
  where k.key_hash = restore_guest.key_hash
    and k.last_used_at >= now() - private.guest_key_lifetime()
  for update;
  if not found then
    return;
  end if;

  if not private.is_plain_guest(into_guest) then
    raise exception 'Only a guest can take over a guest''s conversations.' using errcode = '22023';
  end if;

  if previous <> into_guest then
    if not private.is_plain_guest(previous) then
      return;
    end if;
    select * into source from public.contacts where id = previous for update;
    if found then
      if source.blocked_at is not null then
        return;
      end if;
      -- The new guest has a contact before anything is moved to it.
      insert into public.contacts (id) values (into_guest) on conflict (id) do nothing;
      select * into target from public.contacts where id = into_guest for update;
      moved_count := private.move_contact(source, target);
    end if;
  end if;

  delete from public.guest_keys k where k.key_hash = restore_guest.key_hash;
  insert into public.guest_keys (key_hash, guest_id) values (new_key_hash, into_guest);

  previous_guest := previous;
  moved := moved_count;
  return next;
end;
$$;

revoke execute on function public.restore_guest from public, anon, authenticated;
grant execute on function public.restore_guest to service_role;

-- A browser whose visitor logged out of the host product gives its key up.
create function public.forget_guest_key(key_hash text) returns void
language sql set search_path = ''
as $$ delete from public.guest_keys k where k.key_hash = forget_guest_key.key_hash; $$;

revoke execute on function public.forget_guest_key from public, anon, authenticated;
grant execute on function public.forget_guest_key to service_role;
