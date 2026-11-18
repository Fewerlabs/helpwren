begin;
\ir support/fixture.psql

select plan(7);

select tests.act_as_visitor();
select throws_ok(
  $$ select * from public.agents $$, '42501', null,
  'a visitor with no session cannot read the team'
);

select tests.act_as('guest_a');
select is_empty(
  $$ select * from public.agents $$,
  'a guest cannot read the team'
);
select throws_ok(
  $$ insert into public.agents (user_id, name, email, role)
     values (tests.uid('guest_a'), 'Me', 'me@example.test', 'admin') $$,
  '42501', null,
  'a guest cannot make themselves an agent'
);

select tests.act_as('agent');
select is(
  (select count(*) from public.agents), 3::bigint,
  'an agent reads the whole team'
);
select throws_ok(
  $$ update public.agents set role = 'admin' where user_id = tests.uid('agent') $$,
  '42501', null,
  'an agent cannot make themselves an admin'
);

select tests.act_as('admin');
select throws_ok(
  $$ delete from public.agents where user_id = tests.uid('agent') $$, '42501', null,
  'even an admin changes the team only through the server'
);

select tests.act_as('former_agent');
select is_empty(
  $$ select * from public.agents $$,
  'a deactivated agent cannot read the team, including their own row'
);

select * from finish();
rollback;
