begin;
\ir support/fixture.psql

select plan(10);

select tests.act_as('agent');
update public.conversations
set type = 'ticket', subject = 'Refund', status = 'pending', priority = 'high',
    assignee_id = tests.uid('agent')
where id = tests.thing('guest_a_conversation');

select results_eq(
  $$ select kind, actor_id, data from public.conversation_events
     where conversation_id = tests.thing('guest_a_conversation') order by kind $$,
  $$ values
     ('assigned', tests.uid('agent'), jsonb_build_object('to', tests.uid('agent'))),
     ('priority_changed', tests.uid('agent'), '{"from": "normal", "to": "high"}'::jsonb),
     ('status_changed', tests.uid('agent'), '{"from": "open", "to": "pending"}'::jsonb),
     ('ticket_created', tests.uid('agent'),
      jsonb_build_object('number', (select ticket_number from public.conversations
                                    where id = tests.thing('guest_a_conversation')),
                         'subject', 'Refund')) $$,
  'one change of each kind is recorded, with who made it and what changed'
);

update public.conversations set subject = 'Refund request'
where id = tests.thing('guest_a_conversation');
select is(
  (select count(*) from public.conversation_events
   where conversation_id = tests.thing('guest_a_conversation')),
  4::bigint,
  'a change that is none of these records nothing'
);

select throws_ok(
  $$ insert into public.conversation_events (conversation_id, kind)
     values (tests.thing('guest_a_conversation'), 'status_changed') $$,
  '42501', null,
  'an agent cannot write an event by hand'
);
select throws_ok(
  $$ delete from public.conversation_events $$, '42501', null,
  'or remove one'
);

-- A resolved conversation that its contact writes in again reopens, and that is recorded too.
update public.conversations set status = 'resolved'
where id = tests.thing('guest_a_conversation');
select tests.act_as('guest_a');
insert into public.messages (conversation_id, sender_id, sender_role, body)
values (tests.thing('guest_a_conversation'), tests.uid('guest_a'), 'guest', 'It happened again');

select results_eq(
  $$ select kind, data ->> 'to' from public.conversation_events order by created_at, kind $$,
  $$ values ('status_changed', 'pending'), ('status_changed', 'resolved'),
            ('status_changed', 'open'), ('ticket_created', null) $$,
  'the contact sees where their request stands: that it is a ticket, and each status'
);
select is_empty(
  $$ select * from public.conversation_events where kind in ('assigned', 'priority_changed') $$,
  'and not who it was assigned to or how urgent the team marked it'
);
select is(
  (select actor_id from public.conversation_events where data ->> 'to' = 'open'),
  tests.uid('guest_a'),
  'reopening is recorded as the contact''s doing'
);

select tests.act_as('guest_b');
select is_empty(
  $$ select * from public.conversation_events $$,
  'another guest sees none of it'
);

select tests.act_as_visitor();
select throws_ok(
  $$ select * from public.conversation_events $$, '42501', null,
  'a visitor with no session cannot read events'
);

select tests.act_as('former_agent');
select is_empty(
  $$ select * from public.conversation_events $$,
  'a deactivated agent sees none'
);

select * from finish();
rollback;
