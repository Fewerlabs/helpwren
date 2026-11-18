-- Live updates. Triggers broadcast each change over Supabase Realtime, on private channels
-- whose access is decided by the policy at the end of this file.
--
--   conversation:<id>   new messages in one conversation
--   contact:<id>        changes to one contact's conversations, for their list and unread badge
--   inbox               changes to every conversation, for agents

create function private.broadcast_message() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  perform realtime.broadcast_changes(
    'conversation:' || new.conversation_id, tg_op, tg_op, tg_table_name, tg_table_schema, new, null
  );
  return null;
end;
$$;

create trigger messages_broadcast after insert on public.messages
  for each row execute function private.broadcast_message();

create function private.broadcast_conversation() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  perform realtime.broadcast_changes(
    'inbox', tg_op, tg_op, tg_table_name, tg_table_schema, new, old
  );
  perform realtime.broadcast_changes(
    'contact:' || new.contact_id, tg_op, tg_op, tg_table_name, tg_table_schema, new, old
  );
  return null;
end;
$$;

create trigger conversations_broadcast after insert or update on public.conversations
  for each row execute function private.broadcast_conversation();

-- Who may listen to which channel. A conversation's channel inherits conversations_read: the
-- lookup only finds the row if the listener may read it.
create policy helpwren_listen on realtime.messages for select to authenticated using (
  case split_part((select realtime.topic()), ':', 1)
    when 'inbox' then (select private.is_agent())
    when 'contact' then
      split_part((select realtime.topic()), ':', 2) = (select auth.uid())::text
    when 'conversation' then exists (
      select 1 from public.conversations c
      where c.id::text = split_part((select realtime.topic()), ':', 2)
    )
    else false
  end
);
