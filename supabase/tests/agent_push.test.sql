begin;
\ir support/fixture.psql

select plan(22);

-- A team member keeps their own browsers.
select tests.act_as('agent');
select lives_ok(
  $$
    insert into public.agent_push_subscriptions (endpoint, p256dh, auth, user_agent)
    values ('https://push.example.test/agent-phone', 'key-1', 'auth-1', 'Phone')
  $$,
  'a team member adds a browser of their own'
);
select is(
  (select agent_id from public.agent_push_subscriptions
   where endpoint = 'https://push.example.test/agent-phone'),
  tests.uid('agent'),
  'which is theirs without saying so'
);
select is(
  (select notify_about from public.agent_push_subscriptions
   where endpoint = 'https://push.example.test/agent-phone'),
  'all',
  'and tells them about every conversation unless they choose otherwise'
);
select throws_ok(
  format(
    $$
      insert into public.agent_push_subscriptions (agent_id, endpoint, p256dh, auth)
      values (%L, 'https://push.example.test/forged', 'key', 'auth')
    $$,
    tests.uid('admin')
  ),
  '42501', null,
  'but not one for somebody else'
);
select throws_ok(
  $$
    insert into public.agent_push_subscriptions (endpoint, p256dh, auth)
    values ('http://push.example.test/plain', 'key', 'auth')
  $$,
  '23514', null,
  'a push service is reached over HTTPS'
);
select throws_ok(
  $$
    insert into public.agent_push_subscriptions (endpoint, p256dh, auth, notify_about)
    values ('https://push.example.test/odd', 'key', 'auth', 'some')
  $$,
  '23514', null,
  'notify about is every conversation or only theirs'
);
select lives_ok(
  $$
    update public.agent_push_subscriptions set notify_about = 'mine'
    where endpoint = 'https://push.example.test/agent-phone'
  $$,
  'a team member changes which conversations they hear about'
);

-- Another team member sees and changes none of it.
select tests.act_as('admin');
select lives_ok(
  $$ select public.save_push_subscription(
       'https://push.example.test/admin-laptop', 'key-2', 'auth-2', 'Laptop', 'all') $$,
  'another team member saves a browser of their own'
);
select is(
  (select count(*) from public.agent_push_subscriptions), 1::bigint,
  'and sees only that one'
);
select is_empty(
  $$
    update public.agent_push_subscriptions set notify_about = 'all'
    where endpoint = 'https://push.example.test/agent-phone'
    returning id
  $$,
  'they cannot change somebody else''s'
);
select is_empty(
  $$
    delete from public.agent_push_subscriptions
    where endpoint = 'https://push.example.test/agent-phone'
    returning id
  $$,
  'or remove it'
);

-- A browser someone else used before moves to whoever saves it now.
select lives_ok(
  $$ select public.save_push_subscription(
       'https://push.example.test/agent-phone', 'key-3', 'auth-3', 'Phone', 'all') $$,
  'signing in on a shared browser saves it again'
);
select tests.act_as_owner();
select results_eq(
  $$
    select agent_id, p256dh from public.agent_push_subscriptions
    where endpoint = 'https://push.example.test/agent-phone'
  $$,
  format($$ values (%L::uuid, 'key-3') $$, tests.uid('admin')),
  'and it is theirs, with its new keys'
);

-- Nobody outside the team keeps a subscription.
select tests.act_as('member');
select throws_ok(
  $$ select public.save_push_subscription(
       'https://push.example.test/member', 'key', 'auth', null, 'all') $$,
  '42501', null,
  'a contact cannot turn on team notifications'
);
select is_empty(
  $$ select id from public.agent_push_subscriptions $$,
  'or see anyone''s'
);
select tests.act_as('former_agent');
select throws_ok(
  $$
    insert into public.agent_push_subscriptions (endpoint, p256dh, auth)
    values ('https://push.example.test/former', 'key', 'auth')
  $$,
  '42501', null,
  'nor can a deactivated team member'
);
select tests.act_as_visitor();
select throws_ok(
  $$ select * from public.agent_push_subscriptions $$, '42501', null,
  'a visitor cannot read subscriptions'
);

-- A contact's message is queued for the team; a reply is not.
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
select throws_ok(
  $$ select public.claim_agent_push_queue() $$, '42501', null,
  'a team member cannot claim pushes from the browser'
);

select tests.act_as_server();
select is(
  (select count(*) from public.claim_agent_push_queue()
   where conversation_id = tests.thing('member_conversation')),
  -- The fixture's own first message, and the one written above.
  2::bigint,
  'the server claims each contact message, and not the reply'
);

-- Deactivating a team member stops their pushes.
select tests.act_as('agent');
select public.save_push_subscription(
  'https://push.example.test/agent-tablet', 'key-4', 'auth-4', 'Tablet', 'all');
select tests.act_as_owner();
update public.agents set active = false where user_id = tests.uid('agent');
select is_empty(
  format(
    $$ select id from public.agent_push_subscriptions where agent_id = %L $$,
    tests.uid('agent')
  ),
  'a deactivated team member''s browsers are forgotten'
);

select * from finish();
rollback;
