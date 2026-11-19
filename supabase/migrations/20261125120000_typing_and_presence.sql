-- Typing indicators and presence. Until now every live update came from the database; these are
-- sent by the browsers themselves, as Realtime broadcast and presence on private channels, and
-- never stored. Three new kinds of channel:
--
--   typing:<conversation id>   who is writing a reply. Anyone who may read the conversation may
--                              listen and send: its contact and the team.
--   viewing:<conversation id>  which team members have the conversation open. The team only.
--   presence:team              which team members have the dashboard open. The team joins it;
--                              anyone, signed in or not, may listen, so the chat can say whether
--                              the team is around before a visitor has written.
--
-- Realtime asks these rules once, when a channel is joined, with the channel's name in
-- `realtime.topic()` and the kind of traffic (`broadcast` or `presence`) in `extension`.

drop policy helpwren_listen on realtime.messages;
create policy helpwren_listen on realtime.messages for select to authenticated using (
  case split_part((select realtime.topic()), ':', 1)
    when 'inbox' then (select private.is_agent())
    when 'notes' then (select private.is_agent())
    when 'contact' then
      split_part((select realtime.topic()), ':', 2) = (select auth.uid())::text
    -- The conversation's own rules decide, through the caller's view of `conversations`.
    when 'conversation' then exists (
      select 1 from public.conversations c
      where c.id::text = split_part((select realtime.topic()), ':', 2)
    )
    when 'typing' then exists (
      select 1 from public.conversations c
      where c.id::text = split_part((select realtime.topic()), ':', 2)
    )
    when 'viewing' then (select private.is_agent())
    when 'presence' then (select realtime.topic()) = 'presence:team'
    else false
  end
);

-- A visitor who has not written has no session, and still sees whether the team is around. A
-- policy of its own, because `anon` may not read `conversations`, which the one above names.
create policy helpwren_listen_team on realtime.messages for select to anon using (
  (select realtime.topic()) = 'presence:team'
);

-- Sending: a typing event on a conversation one may read, or being present as a team member.
-- Nothing else may be sent by a browser; the database's own broadcasts do not pass through here.
create policy helpwren_send on realtime.messages for insert to authenticated with check (
  case split_part((select realtime.topic()), ':', 1)
    when 'typing' then realtime.messages.extension = 'broadcast' and exists (
      select 1 from public.conversations c
      where c.id::text = split_part((select realtime.topic()), ':', 2)
    )
    when 'viewing' then
      realtime.messages.extension = 'presence' and (select private.is_agent())
    when 'presence' then
      realtime.messages.extension = 'presence'
      and (select realtime.topic()) = 'presence:team'
      and (select private.is_agent())
    else false
  end
);
