begin;
\ir support/fixture.psql

select plan(17);

-- What the insert trigger did with the fixture rows.
select is(
  (select org_id from public.conversations where id = tests.thing('member_conversation')),
  'acme',
  'a verified contact''s conversation is shared with their organisation'
);
select is(
  (select org_id from public.conversations where id = tests.thing('pretender_conversation')),
  null,
  'an unverified contact''s conversation is not shared, whatever organisation they claim'
);

select tests.act_as_visitor();
select throws_ok(
  $$ select * from public.conversations $$, '42501', null,
  'a visitor with no session cannot read conversations'
);

select tests.act_as('guest_a');
select results_eq(
  $$ select id from public.conversations $$,
  $$ values (tests.thing('guest_a_conversation')) $$,
  'a guest reads only their own conversation'
);
select throws_ok(
  $$ insert into public.conversations (contact_id, source)
     values (tests.uid('guest_a'), 'web') $$,
  '42501', null,
  'a guest cannot create a conversation directly; the server does it'
);
select lives_ok(
  $$ update public.conversations
     set status = 'closed', priority = 'high', assignee_id = tests.uid('agent'),
         ticket_number = 1, contact_id = tests.uid('guest_b') $$,
  'a guest''s attempt to update conversations is silently ignored'
);
select throws_ok(
  $$ delete from public.conversations $$, '42501', null,
  'a guest cannot delete conversations'
);

select tests.act_as_owner();
select results_eq(
  $$ select status, priority, assignee_id, ticket_number, contact_id
     from public.conversations where id = tests.thing('guest_a_conversation') $$,
  $$ values ('open', 'normal', null::uuid, null::bigint, tests.uid('guest_a')) $$,
  'the guest''s conversation is unchanged after that attempt'
);

select tests.act_as('teammate');
select results_eq(
  $$ select id from public.conversations $$,
  $$ values (tests.thing('member_conversation')) $$,
  'a verified teammate reads conversations shared with their organisation'
);
select lives_ok(
  $$ update public.conversations set status = 'closed' $$,
  'a teammate''s attempt to update is silently ignored'
);

select tests.act_as('pretender');
select results_eq(
  $$ select id from public.conversations $$,
  $$ values (tests.thing('pretender_conversation')) $$,
  'an unverified user claiming the organisation reads only their own conversation'
);

select tests.act_as('stranger');
select is_empty(
  $$ select * from public.conversations $$,
  'a signed-in person with no contact reads nothing'
);

select tests.act_as('agent');
select is(
  (select count(*) from public.conversations), 4::bigint,
  'an agent reads every conversation'
);
select lives_ok(
  $$ update public.conversations set status = 'pending', assignee_id = tests.uid('agent'),
                                      updated_at = '2000-01-01'
     where id = tests.thing('guest_a_conversation') $$,
  'an agent updates a conversation'
);
select throws_ok(
  $$ delete from public.conversations $$, '42501', null,
  'an agent cannot delete conversations'
);

select tests.act_as_owner();
select results_eq(
  $$ select c.status, c.updated_at = now(), m.status
     from public.conversations c, public.conversations m
     where c.id = tests.thing('guest_a_conversation')
       and m.id = tests.thing('member_conversation') $$,
  $$ values ('pending', true, 'open') $$,
  'the agent''s update was saved and stamped with the real time; the teammate''s was not'
);

select tests.act_as('former_agent');
select is_empty(
  $$ select * from public.conversations $$,
  'a deactivated agent reads no conversations'
);

select * from finish();
rollback;
