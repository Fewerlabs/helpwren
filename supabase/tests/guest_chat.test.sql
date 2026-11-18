begin;
\ir support/fixture.psql

select plan(17);

-- What a new message does to its conversation.
select tests.act_as('guest_a');
select lives_ok(
  $$ insert into public.messages (conversation_id, sender_id, sender_role, body)
     values (tests.thing('guest_a_conversation'), tests.uid('guest_a'), 'guest', repeat('a', 200)) $$,
  'a guest sends a message'
);

select tests.act_as_owner();
select results_eq(
  $$ select char_length(last_message_preview), last_message_at = now(), unread_for_agents,
            unread_for_contact
     from public.conversations where id = tests.thing('guest_a_conversation') $$,
  -- Two unread: the fixture's first message and this one.
  $$ values (140, true, 2, 0) $$,
  'the conversation takes a shortened preview, the time, and one more unread for agents'
);

update public.conversations set status = 'resolved', unread_for_agents = 0
where id = tests.thing('guest_a_conversation');

select tests.act_as('agent');
insert into public.messages (conversation_id, sender_id, sender_role, body)
values (tests.thing('guest_a_conversation'), tests.uid('agent'), 'agent', 'All fixed');

select tests.act_as_owner();
select results_eq(
  $$ select status, unread_for_agents, unread_for_contact, last_message_preview
     from public.conversations where id = tests.thing('guest_a_conversation') $$,
  $$ values ('resolved', 0, 1, 'All fixed') $$,
  'an agent''s reply counts as unread for the contact and leaves the status alone'
);

select tests.act_as('guest_a');
insert into public.messages (conversation_id, sender_id, sender_role, body)
values (tests.thing('guest_a_conversation'), tests.uid('guest_a'), 'guest', 'It is back');

select tests.act_as_owner();
select is(
  (select status from public.conversations where id = tests.thing('guest_a_conversation')),
  'open',
  'a resolved conversation reopens when the contact writes again'
);

update public.conversations set status = 'closed'
where id = tests.thing('guest_b_conversation');
select tests.act_as('guest_b');
insert into public.messages (conversation_id, sender_id, sender_role, body)
values (tests.thing('guest_b_conversation'), tests.uid('guest_b'), 'guest', 'Hello again');
select tests.act_as_owner();
select is(
  (select status from public.conversations where id = tests.thing('guest_b_conversation')),
  'closed',
  'a closed conversation stays closed'
);

-- Message content.
select tests.act_as('guest_a');
select throws_ok(
  $$ insert into public.messages (conversation_id, sender_id, sender_role, body)
     values (tests.thing('guest_a_conversation'), tests.uid('guest_a'), 'guest', '') $$,
  '23514', null,
  'an empty message is rejected'
);
select throws_ok(
  $$ insert into public.messages (conversation_id, sender_id, sender_role, body)
     values (tests.thing('guest_a_conversation'), tests.uid('guest_a'), 'guest', repeat('a', 5001)) $$,
  '23514', null,
  'a message over 5,000 characters is rejected'
);

-- The limit on how fast a contact may write. guest_a has sent 3 messages in this minute.
select lives_ok(
  $$ insert into public.messages (conversation_id, sender_id, sender_role, body)
     select tests.thing('guest_a_conversation'), tests.uid('guest_a'), 'guest', 'Message ' || n
     from generate_series(1, 17) as n $$,
  'a guest may send 20 messages in a minute'
);
select throws_ok(
  $$ insert into public.messages (conversation_id, sender_id, sender_role, body)
     values (tests.thing('guest_a_conversation'), tests.uid('guest_a'), 'guest', 'One too many') $$,
  'HW429', null,
  'the 21st message in a minute is refused'
);

select tests.act_as('agent');
select lives_ok(
  $$ insert into public.messages (conversation_id, sender_id, sender_role, body)
     select tests.thing('guest_a_conversation'), tests.uid('agent'), 'agent', 'Reply ' || n
     from generate_series(1, 25) as n $$,
  'agents are not limited'
);

-- Starting a conversation.
select tests.act_as('guest_a');
select throws_ok(
  $$ select public.start_conversation(tests.uid('guest_a'), 'Hi', 'web') $$, '42501', null,
  'a guest cannot call start_conversation directly'
);
select tests.act_as_visitor();
select throws_ok(
  $$ select public.start_conversation(tests.uid('guest_a'), 'Hi', 'web') $$, '42501', null,
  'a visitor with no session cannot call start_conversation'
);

select tests.act_as_server();
select lives_ok(
  $$ insert into tests.things (name, id)
     select 'started', public.start_conversation(
       tests.uid('stranger'), 'Do you ship abroad?', 'web', '{"url": "https://example.com"}',
       'New Person', 'new@example.com', '+15550100'
     ) $$,
  'the server starts a conversation for someone with no contact yet'
);

select tests.act_as_owner();
select results_eq(
  $$ select k.kind, k.verified, k.name, k.email, k.phone, c.source, c.context ->> 'url',
            c.last_message_preview, c.unread_for_agents, m.sender_role
     from public.conversations c
     join public.contacts k on k.id = c.contact_id
     join public.messages m on m.conversation_id = c.id
     where c.id = tests.thing('started') $$,
  $$ values ('guest', false, 'New Person', 'new@example.com', '+15550100', 'web',
             'https://example.com', 'Do you ship abroad?', 1, 'guest') $$,
  'it creates the contact as an unverified guest, the conversation and the first message'
);

select tests.act_as_server();
select public.start_conversation(tests.uid('stranger'), 'Another question', 'web', '{}', null, null, '+15550199');
select tests.act_as_owner();
select results_eq(
  $$ select name, email, phone from public.contacts where id = tests.uid('stranger') $$,
  $$ values ('New Person', 'new@example.com', '+15550199') $$,
  'starting again keeps details that were left out and replaces those that were given'
);

select tests.act_as_server();
select lives_ok(
  $$ select public.start_conversation(tests.uid('stranger'), 'Question ' || n, 'web')
     from generate_series(3, 5) as n $$,
  'one person may start 5 conversations in an hour'
);
select throws_ok(
  $$ select public.start_conversation(tests.uid('stranger'), 'One too many', 'web') $$,
  'HW429', null,
  'the 6th conversation in an hour is refused'
);

select * from finish();
rollback;
