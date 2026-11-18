begin;
\ir support/fixture.psql

select plan(6);

-- The team has one active admin, one active agent and one deactivated agent.
select throws_ok(
  $$ update public.agents set role = 'agent' where user_id = tests.uid('admin') $$,
  'HW409', null,
  'the last admin cannot be made an agent'
);
select throws_ok(
  $$ update public.agents set active = false where user_id = tests.uid('admin') $$,
  'HW409', null,
  'the last admin cannot be deactivated'
);
select throws_ok(
  $$ delete from public.agents where user_id = tests.uid('admin') $$,
  'HW409', null,
  'the last admin cannot be removed'
);

select lives_ok(
  $$ update public.agents set role = 'admin' where user_id = tests.uid('agent') $$,
  'an agent can be made an admin'
);
select lives_ok(
  $$ update public.agents set active = false where user_id = tests.uid('admin') $$,
  'with a second admin, the first can be deactivated'
);
select lives_ok(
  $$ update public.agents set active = false where user_id = tests.uid('former_agent') $$,
  'changes that leave an admin in place are not affected'
);

select * from finish();
rollback;
