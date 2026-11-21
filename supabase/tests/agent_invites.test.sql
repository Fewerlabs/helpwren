begin;
\ir support/fixture.psql

select plan(14);

insert into public.agent_invites (agent_id, token_hash, created_by) values
  (tests.uid('agent'), repeat('a', 64), tests.uid('admin')),
  (tests.uid('agent'), repeat('b', 64), tests.uid('admin'));
update public.agent_invites set used_at = now() where token_hash = repeat('b', 64);

-- Nobody but the server can see or make an invite.
select tests.act_as_visitor();
select throws_ok(
  $$ select * from public.agent_invites $$, '42501', null,
  'a visitor cannot read invites'
);
select throws_ok(
  $$ insert into public.agent_invites (agent_id, token_hash) values (tests.uid('agent'), repeat('c', 64)) $$,
  '42501', null,
  'nor make one'
);
select tests.act_as('admin');
select throws_ok(
  $$ select * from public.agent_invites $$, '42501', null,
  'an admin cannot read invites from the browser'
);
select throws_ok(
  $$ insert into public.agent_invites (agent_id, token_hash) values (tests.uid('agent'), repeat('c', 64)) $$,
  '42501', null,
  'nor make one'
);
select throws_ok(
  $$ update public.agent_invites set used_at = null $$, '42501', null,
  'nor bring a used one back'
);
select tests.act_as('agent');
select throws_ok(
  $$ select * from public.agent_invites $$, '42501', null,
  'the invited person cannot read their own invite from the browser'
);

select tests.act_as_server();
select is(
  (select count(*) from public.agent_invites where agent_id = tests.uid('agent')), 2::bigint,
  'the server reads invites'
);
select ok(
  (select expires_at between now() + interval '7 days' - interval '1 minute'
     and now() + interval '7 days' + interval '1 minute'
   from public.agent_invites where token_hash = repeat('a', 64)),
  'an invite lasts seven days'
);
select throws_ok(
  $$ insert into public.agent_invites (agent_id, token_hash) values (tests.uid('agent'), 'the-token') $$,
  '23514', null,
  'only a hash is kept, never a token'
);

-- Deactivating someone takes back the invites they have not used.
select tests.act_as_owner();
update public.agents set active = false where user_id = tests.uid('agent');
select results_eq(
  $$ select token_hash from public.agent_invites where agent_id = tests.uid('agent') $$,
  $$ values (repeat('b', 64)) $$,
  'deactivating a member removes their unused invites and keeps the used one'
);

-- Who has signed in, which only the server may ask.
update auth.users set last_sign_in_at = now() where id = tests.uid('admin');
select tests.act_as_server();
select results_eq(
  $$ select user_id, last_sign_in_at is null from public.agent_sign_ins()
     where user_id in (tests.uid('admin'), tests.uid('former_agent')) order by user_id = tests.uid('admin') $$,
  $$ values (tests.uid('former_agent'), true), (tests.uid('admin'), false) $$,
  'the server sees who has signed in and who never has'
);
select is(
  (select count(*) from public.agent_sign_ins() where user_id in (tests.uid('guest_a'), tests.uid('stranger'))),
  0::bigint,
  'and only for people on the team'
);
select tests.act_as('admin');
select throws_ok(
  $$ select * from public.agent_sign_ins() $$, '42501', null,
  'an admin cannot ask from the browser'
);
select tests.act_as_visitor();
select throws_ok(
  $$ select * from public.agent_sign_ins() $$, '42501', null,
  'nor can a visitor'
);

select * from finish();
rollback;
