-- When a guest signs in to the host product, what they did as a guest becomes theirs as a user.

-- Moves everything a guest did to a verified user, and removes the guest's contact: their
-- conversations, the messages they sent, their ratings, and their part in each conversation's
-- history. Returns how many conversations moved. Only the app's server may call it, once it
-- holds proof of both people: the guest's own session, and the host product's word for the user.
--
-- It refuses anyone who is not a plain guest. Without that, a session belonging to another
-- user, or to a team member, could be emptied into someone else's account.
create function public.merge_guest_into_user(guest_id uuid, user_id uuid) returns integer
language plpgsql set search_path = ''
as $$
declare
  guest public.contacts;
  target public.contacts;
  moved integer;
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

  -- The conversations join the user's organisation as they arrive, as if they had started
  -- there.
  update public.conversations
  set contact_id = target.id, org_id = target.org_id
  where contact_id = guest.id;
  get diagnostics moved = row_count;

  update public.messages set sender_id = target.id where sender_id = guest.id;
  update public.conversation_ratings set contact_id = target.id where contact_id = guest.id;
  update public.conversation_events set actor_id = target.id where actor_id = guest.id;

  -- What the guest typed about themselves fills only what the host product did not say.
  update public.contacts set
    name = coalesce(target.name, guest.name),
    email = coalesce(target.email, guest.email),
    phone = coalesce(target.phone, guest.phone)
  where id = target.id;

  delete from public.contacts where id = guest.id;
  return moved;
end;
$$;

revoke execute on function public.merge_guest_into_user from public, anon, authenticated;
grant execute on function public.merge_guest_into_user to service_role;
