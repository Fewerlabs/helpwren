begin;
\ir support/fixture.psql

select plan(18);

select tests.act_as_visitor();
select throws_ok(
  $$ select * from public.messages $$, '42501', null,
  'a visitor with no session cannot read messages'
);

select tests.act_as('guest_a');
select results_eq(
  $$ select body from public.messages $$, $$ values ('Hello from Guest A') $$,
  'a guest reads only the messages in their own conversation'
);
select lives_ok(
  $$ insert into public.messages (conversation_id, sender_id, sender_role, body, channel, created_at)
     values (tests.thing('guest_a_conversation'), tests.uid('guest_a'), 'agent', 'Forged', 'email',
             '2000-01-01') $$,
  'a guest adds a message to their own conversation'
);
select throws_ok(
  $$ insert into public.messages (conversation_id, sender_id, sender_role, body)
     values (tests.thing('guest_b_conversation'), tests.uid('guest_a'), 'guest', 'Intruding') $$,
  '42501', null,
  'a guest cannot add a message to someone else''s conversation'
);
select throws_ok(
  $$ insert into public.messages (conversation_id, sender_id, sender_role, body)
     values (tests.thing('guest_a_conversation'), tests.uid('agent'), 'agent', 'Impersonating') $$,
  '42501', null,
  'a guest cannot send a message as somebody else'
);
select throws_ok(
  $$ update public.messages set body = 'Edited' $$, '42501', null,
  'a guest cannot edit messages'
);
select throws_ok(
  $$ delete from public.messages $$, '42501', null,
  'a guest cannot delete messages'
);

select tests.act_as_owner();
select results_eq(
  $$ select sender_role, channel, created_at > now() - interval '1 minute'
     from public.messages where body = 'Forged' $$,
  $$ values ('guest', 'chat', true) $$,
  'the role, channel and time a guest claimed were replaced with the real ones'
);

select tests.act_as('teammate');
select results_eq(
  $$ select body from public.messages $$, $$ values ('Hello from Member') $$,
  'a verified teammate reads the messages in a shared conversation'
);
select throws_ok(
  $$ insert into public.messages (conversation_id, sender_id, sender_role, body)
     values (tests.thing('member_conversation'), tests.uid('teammate'), 'user', 'Joining in') $$,
  '42501', null,
  'a teammate reads a shared conversation but cannot add to it'
);

select tests.act_as('pretender');
select results_eq(
  $$ select body from public.messages $$, $$ values ('Hello from Pretender') $$,
  'an unverified user claiming the organisation reads only their own messages'
);

select tests.act_as('stranger');
select throws_ok(
  $$ insert into public.messages (conversation_id, sender_id, sender_role, body)
     values (tests.thing('guest_a_conversation'), tests.uid('stranger'), 'guest', 'Hi') $$,
  null, null,
  'a signed-in person with no contact cannot add messages'
);

select tests.act_as('agent');
select is(
  (select count(*) from public.messages), 5::bigint,
  'an agent reads every message'
);
select lives_ok(
  $$ insert into public.messages (conversation_id, sender_id, sender_role, body)
     values (tests.thing('guest_b_conversation'), tests.uid('agent'), 'guest', 'Agent reply') $$,
  'an agent replies in any conversation'
);
select is(
  (select sender_role from public.messages where body = 'Agent reply'), 'agent',
  'an agent''s message is marked as an agent''s whatever role was sent'
);
select throws_ok(
  $$ update public.messages set body = 'Edited' $$, '42501', null,
  'an agent cannot edit messages'
);

select tests.act_as('former_agent');
select throws_ok(
  $$ insert into public.messages (conversation_id, sender_id, sender_role, body)
     values (tests.thing('guest_a_conversation'), tests.uid('former_agent'), 'agent', 'Hi') $$,
  null, null,
  'a deactivated agent cannot add messages'
);

select tests.act_as_server();
select lives_ok(
  $$ insert into public.messages (conversation_id, sender_id, sender_role, body, channel)
     values (tests.thing('guest_a_conversation'), tests.uid('guest_a'), 'guest', 'By email', 'email') $$,
  'the server adds a message on someone''s behalf, for example an email reply'
);

select * from finish();
rollback;
