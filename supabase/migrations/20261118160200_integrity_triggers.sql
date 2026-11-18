-- Triggers that keep rows honest whatever the client sends.

-- A message's role and time come from who is really sending it and from the server clock.
-- Requests with no signed-in user come from the server (system messages, email replies) and
-- are trusted as written.
create function private.stamp_message() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  caller uuid := auth.uid();
begin
  if caller is null then
    return new;
  end if;

  if private.is_agent() then
    new.sender_role := 'agent';
  else
    select kind into strict new.sender_role from public.contacts where id = caller;
  end if;

  new.channel := 'chat';
  new.created_at := now();
  return new;
end;
$$;

create trigger messages_stamp before insert on public.messages
  for each row execute function private.stamp_message();

-- A conversation is shared with an organisation only when its contact is verified. Otherwise
-- anyone could type an organisation id and put a conversation in front of that team.
create function private.set_conversation_org() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  new.org_id := (
    select org_id from public.contacts where id = new.contact_id and verified
  );
  return new;
end;
$$;

create trigger conversations_set_org before insert on public.conversations
  for each row execute function private.set_conversation_org();

create function private.touch_updated_at() returns trigger
language plpgsql set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger conversations_touch before update on public.conversations
  for each row execute function private.touch_updated_at();

create trigger settings_touch before update on public.settings
  for each row execute function private.touch_updated_at();
