begin;
\ir support/fixture.psql

select plan(16);

update public.contacts set email = 'Guest.A@Example.test' where id = tests.uid('guest_a');
update public.conversations set status = 'closed' where id = tests.thing('guest_a_conversation');

-- Only the server adds an email reply.
select tests.act_as('guest_a');
select throws_ok(
  format(
    $$ select public.receive_email_reply(%L, 'guest.a@example.test', 'm-0@example.test', 'Hi') $$,
    tests.thing('guest_a_conversation')
  ),
  '42501', null,
  'a contact cannot add an email reply'
);
select throws_ok(
  $$ select * from public.inbound_emails $$, '42501', null,
  'a contact cannot read the received emails'
);
select lives_ok(
  format(
    $$ insert into public.messages (conversation_id, sender_id, sender_role, body, channel)
       values (%L, %L, 'guest', 'Pretending', 'email') $$,
    tests.thing('guest_a_conversation'), tests.uid('guest_a')
  ),
  'a contact may write in the chat'
);
select is(
  (select channel from public.messages where body = 'Pretending'), 'chat',
  'but cannot say a chat message came by email'
);

select tests.act_as('agent');
select throws_ok(
  format(
    $$ select public.receive_email_reply(%L, 'guest.a@example.test', 'm-0@example.test', 'Hi') $$,
    tests.thing('guest_a_conversation')
  ),
  '42501', null,
  'an agent cannot add one either'
);
select throws_ok(
  $$ select * from public.inbound_emails $$, '42501', null,
  'nor read the received emails'
);

select tests.act_as_server();
select is(
  public.receive_email_reply(
    tests.thing('guest_a_conversation'), ' Guest.A@example.TEST ', 'm-1@mail.example', 'It is broken'
  ),
  'added',
  'the server adds a reply from the contact''s address, whatever its case'
);
select results_eq(
  $$ select sender_id, sender_role, channel from public.messages where body = 'It is broken' $$,
  format($$ values (%L::uuid, 'guest', 'email') $$, tests.uid('guest_a')),
  'as the contact, by email'
);
select results_eq(
  format(
    $$ select status, via_email, unread_for_agents > 0 from public.conversations where id = %L $$,
    tests.thing('guest_a_conversation')
  ),
  $$ values ('open', true, true) $$,
  'which reopens a closed conversation, marks it as answered by email, and waits for the team'
);
select results_eq(
  format(
    $$ select actor_id from public.conversation_events
       where conversation_id = %L and kind = 'status_changed' and data ->> 'to' = 'open' $$,
    tests.thing('guest_a_conversation')
  ),
  format($$ values (%L::uuid) $$, tests.uid('guest_a')),
  'the reopening is the contact''s doing'
);
select is(
  (select count(*) from public.email_queue
   where conversation_id = tests.thing('guest_a_conversation')),
  0::bigint,
  'and nothing is emailed back to them'
);

select is(
  public.receive_email_reply(
    tests.thing('guest_a_conversation'), 'guest.a@example.test', 'm-1@mail.example', 'It is broken'
  ),
  'duplicate',
  'the same email handed over again is a duplicate'
);
select is(
  (select count(*) from public.messages where body = 'It is broken'), 1::bigint,
  'and adds nothing'
);

select is(
  public.receive_email_reply(
    tests.thing('guest_a_conversation'), 'someone@else.test', 'm-2@mail.example', 'Let me in'
  ),
  'wrong_sender',
  'an email from another address is not added'
);
select is(
  public.receive_email_reply(gen_random_uuid(), 'guest.a@example.test', 'm-3@mail.example', 'Hi'),
  'unknown',
  'nor one for a conversation that does not exist'
);

-- Twenty an hour into one conversation, then no more.
select public.receive_email_reply(
  tests.thing('guest_a_conversation'), 'guest.a@example.test', 'flood-' || n || '@mail.example',
  'Flood ' || n
) from generate_series(1, 19) as n;
select is(
  public.receive_email_reply(
    tests.thing('guest_a_conversation'), 'guest.a@example.test', 'flood-20@mail.example', 'One more'
  ),
  'rate_limited',
  'a sender writing too often into one conversation is held back'
);

select * from finish();
rollback;
