begin;
\ir support/fixture.psql

select plan(13);

select tests.act_as('agent');
select lives_ok(
  $$ update public.conversations
     set type = 'ticket', subject = 'Refund request', priority = 'high',
         assignee_id = tests.uid('agent'), ticket_number = 7
     where id = tests.thing('guest_a_conversation') $$,
  'an agent turns a conversation into a ticket, with a subject, priority and assignee'
);
select results_eq(
  $$ select type, ticket_number >= 1000, ticket_number <> 7, subject, priority, assignee_id
     from public.conversations where id = tests.thing('guest_a_conversation') $$,
  $$ values ('ticket', true, true, 'Refund request', 'high', tests.uid('agent')) $$,
  'it is given the next number, whatever number was asked for'
);

select lives_ok(
  $$ update public.conversations set type = 'ticket'
     where id = tests.thing('guest_b_conversation') $$,
  'a second conversation becomes a ticket'
);
select is(
  (select ticket_number from public.conversations where id = tests.thing('guest_b_conversation')),
  (select ticket_number + 1 from public.conversations
   where id = tests.thing('guest_a_conversation')),
  'and takes the number after'
);

select lives_ok(
  $$ update public.conversations set type = 'chat', ticket_number = null, status = 'resolved'
     where id = tests.thing('guest_a_conversation') $$,
  'an update that tries to undo a ticket is accepted'
);
select results_eq(
  $$ select a.type, a.ticket_number = b.ticket_number - 1, a.status
     from public.conversations a, public.conversations b
     where a.id = tests.thing('guest_a_conversation')
       and b.id = tests.thing('guest_b_conversation') $$,
  $$ values ('ticket', true, 'resolved') $$,
  'but it stays a ticket with its number, and the rest of the change is kept'
);

select lives_ok(
  $$ update public.conversations set ticket_number = 5
     where id = tests.thing('member_conversation') $$,
  'giving a chat a number by hand is accepted'
);
select is(
  (select ticket_number from public.conversations where id = tests.thing('member_conversation')),
  null,
  'and ignored: only becoming a ticket gives a number'
);

select tests.act_as('guest_a');
select lives_ok(
  $$ update public.conversations set type = 'ticket'
     where id = tests.thing('pretender_conversation') $$,
  'a guest''s attempt to make a ticket is silently ignored'
);
select tests.act_as_owner();
select is(
  (select type from public.conversations where id = tests.thing('pretender_conversation')),
  'chat',
  'and no number is used up by it'
);
select is(
  (select last_value from public.ticket_number_seq),
  (select ticket_number from public.conversations where id = tests.thing('guest_b_conversation')),
  'the sequence stands where the last real ticket left it'
);

-- Notes travel on a channel only the team may hear.
insert into realtime.messages (topic, extension, event, private) values
  ('notes:' || tests.thing('guest_a_conversation'), 'broadcast', 'test', true);

create function tests.can_listen(channel text) returns boolean
language plpgsql
as $$
begin
  perform set_config('realtime.topic', channel, true);
  return exists (select 1 from realtime.messages where topic = channel);
end;
$$;
grant execute on function tests.can_listen to anon, authenticated;

select tests.act_as('agent');
select ok(
  tests.can_listen('notes:' || tests.thing('guest_a_conversation')),
  'an agent listens for notes on a conversation'
);
select tests.act_as('guest_a');
select ok(
  not tests.can_listen('notes:' || tests.thing('guest_a_conversation')),
  'the contact cannot listen for notes on their own conversation'
);

select * from finish();
rollback;
