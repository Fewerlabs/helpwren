begin;
\ir support/fixture.psql

select plan(8);

select tests.act_as('guest_a');
select lives_ok(
  format(
    $$ insert into public.messages (conversation_id, sender_id, sender_role, body)
       values (%L, %L, 'guest', 'Any news?') $$,
    tests.thing('guest_a_conversation'), tests.uid('guest_a')
  ),
  'a contact writes'
);
select throws_ok(
  $$ select * from public.email_queue $$, '42501', null,
  'a contact cannot read the email queue'
);

select tests.act_as('agent');
select lives_ok(
  format(
    $$ insert into public.messages (conversation_id, sender_id, sender_role, body)
       values (%L, %L, 'agent', 'On its way.') $$,
    tests.thing('guest_a_conversation'), tests.uid('agent')
  ),
  'an agent replies'
);
select throws_ok(
  $$ select * from public.email_queue $$, '42501', null,
  'an agent cannot read the email queue either: only the server does'
);
select throws_ok(
  $$ select public.claim_email_queue() $$, '42501', null,
  'and cannot take emails from it'
);

select tests.act_as_server();
select results_eq(
  $$ select kind, send_after > now() + interval '4 minutes' from public.email_queue $$,
  $$ values ('reply', true) $$,
  'only the agent''s reply is queued, to be sent after a wait'
);

-- A ticket's status: the team changing it is news to the contact; the contact's own doing is not.
update public.conversations set type = 'ticket', subject = 'Late parcel'
  where id = tests.thing('guest_a_conversation');
insert into public.conversation_events (conversation_id, actor_id, kind, data) values
  (tests.thing('guest_a_conversation'), tests.uid('agent'), 'status_changed',
   '{"from": "open", "to": "resolved"}'),
  (tests.thing('guest_a_conversation'), tests.uid('guest_a'), 'status_changed',
   '{"from": "resolved", "to": "open"}');
select is(
  (select count(*) from public.email_queue where kind = 'status'), 1::bigint,
  'a change of status by the team is queued; one caused by the contact is not'
);

update public.email_queue set send_after = now() - interval '1 minute';
select is(
  (select count(*) from public.claim_email_queue()), 2::bigint,
  'the server takes what is due'
);

select * from finish();
rollback;
