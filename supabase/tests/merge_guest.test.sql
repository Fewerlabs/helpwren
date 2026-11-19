begin;
\ir support/fixture.psql

select plan(20);

-- Guest A rated their conversation before signing in, so there is a rating and a line of
-- history to bring along.
select tests.act_as_owner();
update public.contacts set email = 'guest_a@example.test', phone = '+81312345678'
where id = tests.uid('guest_a');
insert into public.conversation_ratings (conversation_id, contact_id, score)
values (tests.thing('guest_a_conversation'), tests.uid('guest_a'), 5);

-- Only the server.
select tests.act_as('guest_a');
select throws_ok(
  $$ select public.merge_guest_into_user(tests.uid('guest_a'), tests.uid('member')) $$,
  '42501', null,
  'a guest cannot move their conversations to a user themselves'
);

select tests.act_as('member');
select throws_ok(
  $$ select public.merge_guest_into_user(tests.uid('guest_b'), tests.uid('member')) $$,
  '42501', null,
  'a user cannot take a guest''s conversations themselves'
);

select tests.act_as('admin');
select throws_ok(
  $$ select public.merge_guest_into_user(tests.uid('guest_a'), tests.uid('member')) $$,
  '42501', null,
  'an admin cannot merge contacts from the browser'
);

-- What it refuses, even from the server.
select tests.act_as_server();
select throws_ok(
  $$ select public.merge_guest_into_user(tests.uid('teammate'), tests.uid('member')) $$,
  '22023', null,
  'one user''s conversations cannot be moved to another'
);
select throws_ok(
  $$ select public.merge_guest_into_user(tests.uid('pretender'), tests.uid('member')) $$,
  '22023', null,
  'nor an unverified user''s'
);
select throws_ok(
  $$ select public.merge_guest_into_user(tests.uid('agent'), tests.uid('member')) $$,
  '22023', null,
  'a team member is not a guest'
);
select throws_ok(
  $$ select public.merge_guest_into_user(tests.uid('guest_a'), tests.uid('guest_b')) $$,
  '22023', null,
  'a guest cannot take over another guest'
);
select throws_ok(
  $$ select public.merge_guest_into_user(tests.uid('guest_a'), tests.uid('pretender')) $$,
  '22023', null,
  'nor can an unverified user'
);
select is(
  public.merge_guest_into_user(tests.uid('stranger'), tests.uid('member')), 0,
  'a guest who never wrote has nothing to move'
);
select is(
  public.merge_guest_into_user(tests.uid('member'), tests.uid('member')), 0,
  'a user merged into themselves changes nothing'
);

-- Guest A signs in and turns out to be Member.
select is(
  public.merge_guest_into_user(tests.uid('guest_a'), tests.uid('member')), 1,
  'the server moves a guest''s conversations to the user they are'
);

select tests.act_as_owner();
select results_eq(
  $$
    select contact_id, org_id from public.conversations
    where id = tests.thing('guest_a_conversation')
  $$,
  $$ select tests.uid('member'), 'acme' $$,
  'the conversation is the user''s, in their organisation'
);
select is(
  (select count(*) from public.messages where sender_id = tests.uid('guest_a')), 0::bigint,
  'no message is left in the guest''s name'
);
select is(
  (select contact_id from public.conversation_ratings
   where conversation_id = tests.thing('guest_a_conversation')),
  tests.uid('member'),
  'their rating comes with them'
);
select is(
  (select actor_id from public.conversation_events
   where conversation_id = tests.thing('guest_a_conversation') and kind = 'rated'),
  tests.uid('member'),
  'and so does their part in the conversation''s history'
);
select is_empty(
  $$ select 1 from public.contacts where id = tests.uid('guest_a') $$,
  'the guest is gone'
);
select results_eq(
  $$ select name, email, phone from public.contacts where id = tests.uid('member') $$,
  $$ values ('Member', 'guest_a@example.test', '+81312345678') $$,
  'what the guest typed fills in what the host product did not say, and replaces nothing'
);

select tests.act_as('member');
select is(
  (select count(*) from public.conversations), 2::bigint,
  'the user reads the conversation they had as a guest beside their own'
);
select lives_ok(
  $$
    insert into public.messages (conversation_id, sender_id, body)
    values (tests.thing('guest_a_conversation'), tests.uid('member'), 'Signed in now')
  $$,
  'and carries it on'
);

select tests.act_as('teammate');
select isnt_empty(
  $$ select 1 from public.conversations where id = tests.thing('guest_a_conversation') $$,
  'their teammate reads it too'
);

select * from finish();
rollback;
