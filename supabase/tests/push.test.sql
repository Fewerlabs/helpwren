begin;
\ir support/fixture.psql

select plan(16);

-- A device the server registered for Member, and one for a product user who has not written.
select tests.act_as_server();
select lives_ok(
  $$
    insert into public.devices (contact_id, push_token, platform, app)
    values (tests.uid('member'), 'ExponentPushToken[member]', 'ios', 'customer_app')
  $$,
  'the server registers a contact''s device'
);
select lives_ok(
  $$
    insert into public.devices (external_id, push_token, platform, app)
    values ('user-77', 'ExponentPushToken[user-77]', 'android', 'customer_app')
  $$,
  'and a product user''s device, before they have written'
);
select throws_ok(
  $$
    insert into public.devices (push_token, platform, app)
    values ('ExponentPushToken[nobody]', 'ios', 'customer_app')
  $$,
  '23514', null,
  'a device must belong to someone'
);
select throws_ok(
  $$
    insert into public.devices (external_id, push_token, platform, app)
    values ('user-78', 'ExponentPushToken[user-77]', 'ios', 'customer_app')
  $$,
  '23505', null,
  'a push token is one device'
);

-- Nobody signed in reads or writes devices, the queue or the tickets.
select tests.act_as('member');
select throws_ok(
  $$ select * from public.devices $$, '42501', null,
  'a contact cannot see devices, not even their own'
);
select throws_ok(
  $$
    insert into public.devices (contact_id, push_token, platform, app)
    values (tests.uid('member'), 'ExponentPushToken[forged]', 'ios', 'customer_app')
  $$,
  '42501', null,
  'a contact cannot register a device themselves'
);
select throws_ok(
  $$ select * from public.push_queue $$, '42501', null,
  'a contact cannot read the push queue'
);

select tests.act_as('admin');
select throws_ok(
  $$ select * from public.devices $$, '42501', null,
  'an admin cannot see devices from the browser'
);
select throws_ok(
  $$ select * from public.push_tickets $$, '42501', null,
  'an admin cannot read push tickets from the browser'
);
select throws_ok(
  $$ select public.claim_push_queue() $$, '42501', null,
  'an admin cannot claim pushes from the browser'
);

-- Replies queue a push; the contact's own messages do not.
select tests.act_as('member');
select lives_ok(
  format(
    $$ insert into public.messages (conversation_id, sender_id, sender_role, body)
       values (%L, %L, 'user', 'Any news?') $$,
    tests.thing('member_conversation'), tests.uid('member')
  ),
  'a contact writes'
);
select tests.act_as('agent');
select lives_ok(
  format(
    $$ insert into public.messages (conversation_id, sender_id, sender_role, body)
       values (%L, %L, 'agent', 'On its way.') $$,
    tests.thing('member_conversation'), tests.uid('agent')
  ),
  'an agent replies'
);

select tests.act_as_owner();
select results_eq(
  $$
    select count(*)::integer, bool_and(send_after > created_at) from public.push_queue
    where conversation_id = tests.thing('member_conversation')
  $$,
  $$ values (1, true) $$,
  'only the reply is queued, a moment later'
);

-- Due pushes go to the server, once each.
update public.push_queue set send_after = now() - interval '1 second';
select tests.act_as_server();
select is(
  (select count(*) from public.claim_push_queue()), 1::bigint,
  'the server claims what is due'
);
select is(
  (select count(*) from public.claim_push_queue()), 0::bigint,
  'and a second run at the same moment gets nothing'
);

-- A contact who is removed takes their devices with them.
select tests.act_as_owner();
delete from public.conversations where contact_id = tests.uid('member');
delete from public.contacts where id = tests.uid('member');
select is_empty(
  $$ select * from public.devices where push_token = 'ExponentPushToken[member]' $$,
  'a removed contact''s devices go too'
);

select * from finish();
rollback;
