begin;
\ir support/fixture.psql

select plan(11);

-- One waiting broadcast on each kind of channel. Realtime checks the policy with the channel's
-- name in `realtime.topic`, which is how these tests ask "may this person listen here?".
insert into realtime.messages (topic, extension, event, private) values
  ('inbox', 'broadcast', 'test', true),
  ('contact:' || tests.uid('guest_a'), 'broadcast', 'test', true),
  ('conversation:' || tests.thing('guest_a_conversation'), 'broadcast', 'test', true),
  ('conversation:' || tests.thing('member_conversation'), 'broadcast', 'test', true),
  ('something-else', 'broadcast', 'test', true);

create function tests.can_listen(channel text) returns boolean
language plpgsql
as $$
begin
  perform set_config('realtime.topic', channel, true);
  return exists (select 1 from realtime.messages where topic = channel);
end;
$$;
grant execute on function tests.can_listen to anon, authenticated;

select tests.act_as('guest_a');
select ok(
  tests.can_listen('conversation:' || tests.thing('guest_a_conversation')),
  'a guest listens to their own conversation'
);
select ok(
  tests.can_listen('contact:' || tests.uid('guest_a')),
  'a guest listens to changes to their own conversations'
);
select ok(not tests.can_listen('inbox'), 'a guest cannot listen to the inbox');
select ok(
  not tests.can_listen('conversation:' || tests.thing('member_conversation')),
  'a guest cannot listen to someone else''s conversation'
);
select ok(not tests.can_listen('something-else'), 'a channel with no rule is closed');

select tests.act_as('guest_b');
select ok(
  not tests.can_listen('contact:' || tests.uid('guest_a')),
  'a guest cannot listen to another contact''s changes'
);

select tests.act_as('teammate');
select ok(
  tests.can_listen('conversation:' || tests.thing('member_conversation')),
  'a verified teammate listens to a shared conversation'
);

select tests.act_as('pretender');
select ok(
  not tests.can_listen('conversation:' || tests.thing('member_conversation')),
  'an unverified user claiming the organisation cannot listen to it'
);

select tests.act_as('agent');
select ok(tests.can_listen('inbox'), 'an agent listens to the inbox');
select ok(
  tests.can_listen('conversation:' || tests.thing('guest_a_conversation')),
  'an agent listens to any conversation'
);

select tests.act_as('former_agent');
select ok(not tests.can_listen('inbox'), 'a deactivated agent cannot listen to the inbox');

select * from finish();
rollback;
