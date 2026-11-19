begin;
\ir support/fixture.psql

select plan(21);

-- One waiting message of each kind on each new channel. Realtime checks the policies with the
-- channel's name in `realtime.topic`: a select asks "may this person listen here?", an insert
-- "may they send here?".
insert into realtime.messages (topic, extension, event, private) values
  ('typing:' || tests.thing('guest_a_conversation'), 'broadcast', 'test', true),
  ('viewing:' || tests.thing('guest_a_conversation'), 'presence', 'test', true),
  ('presence:team', 'presence', 'test', true),
  ('presence:elsewhere', 'presence', 'test', true);

create function tests.can_listen(channel text) returns boolean
language plpgsql
as $$
begin
  perform set_config('realtime.topic', channel, true);
  return exists (select 1 from realtime.messages where topic = channel);
end;
$$;
grant execute on function tests.can_listen to anon, authenticated;

-- Tries to send on a channel and says whether the rules allowed it. The row is undone at once.
create function tests.can_send(channel text, kind text) returns boolean
language plpgsql
as $$
begin
  perform set_config('realtime.topic', channel, true);
  begin
    insert into realtime.messages (topic, extension, event, private)
    values (channel, kind, 'test', true);
    raise exception using errcode = 'P0001', message = 'allowed';
  exception
    when insufficient_privilege then return false;
    when raise_exception then return true;
  end;
end;
$$;
grant execute on function tests.can_send to anon, authenticated;

-- The contact.
select tests.act_as('guest_a');
select ok(
  tests.can_listen('typing:' || tests.thing('guest_a_conversation')),
  'a contact hears typing in their own conversation'
);
select ok(
  tests.can_send('typing:' || tests.thing('guest_a_conversation'), 'broadcast'),
  'a contact says they are typing in their own conversation'
);
select ok(
  not tests.can_send('typing:' || tests.thing('guest_a_conversation'), 'presence'),
  'a contact cannot be present on the typing channel'
);
select ok(
  not tests.can_listen('viewing:' || tests.thing('guest_a_conversation')),
  'a contact cannot see which team members have their conversation open'
);
select ok(
  not tests.can_send('viewing:' || tests.thing('guest_a_conversation'), 'presence'),
  'a contact cannot pass as a team member viewing it'
);
select ok(tests.can_listen('presence:team'), 'a contact sees whether the team is online');
select ok(
  not tests.can_send('presence:team', 'presence'),
  'a contact cannot count as the team being online'
);

-- Someone else's conversation.
select tests.act_as('guest_b');
select ok(
  not tests.can_listen('typing:' || tests.thing('guest_a_conversation')),
  'a guest cannot hear typing in someone else''s conversation'
);
select ok(
  not tests.can_send('typing:' || tests.thing('guest_a_conversation'), 'broadcast'),
  'a guest cannot type into someone else''s conversation'
);

-- A visitor who has not written, with no session.
select tests.act_as_visitor();
select ok(tests.can_listen('presence:team'), 'a visitor with no session sees whether the team is online');
select ok(not tests.can_listen('presence:elsewhere'), 'that is the only presence a visitor sees');
select ok(not tests.can_listen('inbox'), 'a visitor with no session hears nothing else');
select ok(
  not tests.can_send('presence:team', 'presence'),
  'a visitor with no session cannot count as the team'
);

-- The team.
select tests.act_as('agent');
select ok(
  tests.can_listen('typing:' || tests.thing('guest_a_conversation')),
  'an agent hears typing in any conversation'
);
select ok(
  tests.can_send('typing:' || tests.thing('guest_a_conversation'), 'broadcast'),
  'an agent says they are typing a reply'
);
select ok(
  tests.can_listen('viewing:' || tests.thing('guest_a_conversation')),
  'an agent sees who else has a conversation open'
);
select ok(
  tests.can_send('viewing:' || tests.thing('guest_a_conversation'), 'presence'),
  'an agent shows they have it open'
);
select ok(tests.can_send('presence:team', 'presence'), 'an agent counts as the team being online');
select ok(
  not tests.can_send('presence:elsewhere', 'presence'),
  'an agent is present nowhere else'
);
select ok(not tests.can_send('inbox', 'broadcast'), 'nobody may send on the database''s channels');

select tests.act_as('former_agent');
select ok(
  not tests.can_send('presence:team', 'presence'),
  'a deactivated agent no longer counts as the team'
);

select * from finish();
rollback;
