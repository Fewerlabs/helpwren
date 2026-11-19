begin;
\ir support/fixture.psql

select plan(7);

select tests.act_as_server();
select lives_ok(
  format(
    $$ select public.start_conversation(%L, 'The screen arrived cracked.', 'web',
         ticket_subject => 'Cracked screen') $$,
    tests.uid('guest_a')
  ),
  'the server starts a conversation as a ticket'
);
select results_eq(
  $$ select type, subject, ticket_number is not null from public.conversations
     where subject = 'Cracked screen' $$,
  $$ values ('ticket', 'Cracked screen', true) $$,
  'it is a ticket from the start, with its subject and a number'
);
select is(
  (select e.data - 'number' from public.conversation_events e
   join public.conversations c on c.id = e.conversation_id
   where c.subject = 'Cracked screen' and e.kind = 'ticket_created'),
  '{"subject": "Cracked screen", "opened": true}'::jsonb,
  'its history says it was opened as a ticket'
);
select is(
  (select e.actor_id from public.conversation_events e
   join public.conversations c on c.id = e.conversation_id
   where c.subject = 'Cracked screen'),
  tests.uid('guest_a'),
  'and that the contact opened it'
);
select lives_ok(
  format(
    $$ select public.start_conversation(%L, 'Just a question.', 'web') $$, tests.uid('guest_a')
  ),
  'without a subject it starts as a chat, as before'
);
select is(
  (select type from public.conversations where last_message_preview = 'Just a question.'),
  'chat', 'a chat has no number and no ticket in its history'
);

select tests.act_as('guest_a');
select throws_ok(
  format(
    $$ select public.start_conversation(%L, 'Forged', 'web', ticket_subject => 'Forged') $$,
    tests.uid('guest_a')
  ),
  '42501', null, 'a contact cannot call it themselves'
);

select * from finish();
rollback;
