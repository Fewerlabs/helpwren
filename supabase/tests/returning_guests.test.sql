begin;
\ir support/fixture.psql

select plan(19);

-- The fixture's guests signed in anonymously, as real guests do. `guest_c` is a new guest, the
-- same browser started again after it lost guest A's session, and has not written yet.
select tests.act_as_owner();
insert into tests.people (name) values ('guest_c');
insert into auth.users (id, email) values (tests.uid('guest_c'), null);
update auth.users set is_anonymous = true
where id in (tests.uid('guest_a'), tests.uid('guest_b'), tests.uid('guest_c'));
update public.contacts set email = 'guest_a@example.test' where id = tests.uid('guest_a');
insert into public.conversation_ratings (conversation_id, contact_id, score)
values (tests.thing('guest_a_conversation'), tests.uid('guest_a'), 4);

-- Only the server.
select tests.act_as('guest_a');
select throws_ok(
  $$ select public.issue_guest_key(tests.uid('guest_a'), repeat('a', 64)) $$,
  '42501', null,
  'a guest cannot make themselves a key'
);
select throws_ok(
  $$ select * from public.restore_guest(repeat('a', 64), tests.uid('guest_a'), repeat('b', 64)) $$,
  '42501', null,
  'nor restore anyone'
);
select throws_ok(
  $$ select * from public.guest_keys $$,
  '42501', null,
  'nor read the keys'
);

select tests.act_as_server();
select lives_ok(
  $$ select public.issue_guest_key(tests.uid('guest_a'), repeat('a', 64)) $$,
  'the server gives guest A''s browser a key'
);
select is(public.guest_for_key(repeat('a', 64)), tests.uid('guest_a'), 'which names guest A');
select is(public.guest_for_key(repeat('f', 64)), null, 'a key that was never given names nobody');

-- What it refuses.
select throws_ok(
  $$ select public.issue_guest_key(tests.uid('member'), repeat('c', 64)) $$,
  '22023', null,
  'a user is not given a guest key'
);
select throws_ok(
  $$ select public.issue_guest_key(tests.uid('agent'), repeat('c', 64)) $$,
  '22023', null,
  'nor is a team member'
);
select throws_ok(
  $$ select * from public.restore_guest(repeat('a', 64), tests.uid('member'), repeat('c', 64)) $$,
  '22023', null,
  'a guest''s conversations cannot be restored into a user'
);

-- The same guest coming back swaps their key for a new one.
select results_eq(
  $$ select previous_guest, moved from public.restore_guest(repeat('a', 64), tests.uid('guest_a'), repeat('b', 64)) $$,
  $$ values (tests.uid('guest_a'), 0) $$,
  'guest A''s own session swaps their key'
);
select is(public.guest_for_key(repeat('a', 64)), null, 'the old key is no longer good');

-- The browser lost guest A's session and started again as guest C.
select results_eq(
  $$ select previous_guest, moved from public.restore_guest(repeat('b', 64), tests.uid('guest_c'), repeat('d', 64)) $$,
  $$ values (tests.uid('guest_a'), 1) $$,
  'guest C takes over guest A''s conversation'
);
select is(public.guest_for_key(repeat('d', 64)), tests.uid('guest_c'), 'with a key of their own');
select is_empty(
  $$ select 1 from public.contacts where id = tests.uid('guest_a') $$,
  'guest A is gone'
);
select results_eq(
  $$ select kind, name, email from public.contacts where id = tests.uid('guest_c') $$,
  $$ values ('guest', 'Guest A', 'guest_a@example.test') $$,
  'guest C is a guest, with what guest A said about themselves'
);
select is(
  (select contact_id from public.conversation_ratings
   where conversation_id = tests.thing('guest_a_conversation')),
  tests.uid('guest_c'),
  'the rating comes along'
);

-- A blocked guest is not brought back.
select tests.act_as_owner();
update public.contacts set blocked_at = now() where id = tests.uid('guest_b');
select tests.act_as_server();
select public.issue_guest_key(tests.uid('guest_b'), repeat('e', 64));
select is_empty(
  $$ select * from public.restore_guest(repeat('e', 64), tests.uid('guest_c'), repeat('9', 64)) $$,
  'a guest the team blocked is not restored'
);
select is(
  (select contact_id from public.conversations where id = tests.thing('guest_b_conversation')),
  tests.uid('guest_b'),
  'their conversation stays where it is'
);

-- Logging out of the host product gives the key up.
select public.forget_guest_key(repeat('d', 64));
select is(public.guest_for_key(repeat('d', 64)), null, 'a forgotten key names nobody');

select * from finish();
rollback;
