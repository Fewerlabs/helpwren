begin;
\ir support/fixture.psql

select plan(6);

select tests.act_as_visitor();
select throws_ok(
  $$ select * from public.contact_summaries $$, '42501', null,
  'a visitor with no session cannot read the list of contacts'
);

select tests.act_as('guest_a');
select results_eq(
  $$ select name, conversation_count from public.contact_summaries $$,
  $$ values ('Guest A', 1) $$,
  'a guest sees only themselves'
);

select tests.act_as('teammate');
select results_eq(
  $$ select name, conversation_count from public.contact_summaries $$,
  -- The teammate can read the organisation's shared conversation, but it is not theirs.
  $$ values ('Teammate', 0) $$,
  'a verified teammate sees only themselves, with only their own conversations counted'
);

select tests.act_as('agent');
select is(
  (select count(*) from public.contact_summaries), 5::bigint,
  'an agent sees every contact'
);
select results_eq(
  $$ select conversation_count, last_active_at is not null
     from public.contact_summaries where name = 'Member' $$,
  $$ values (1, true) $$,
  'with their number of conversations and when they were last active'
);

select tests.act_as('former_agent');
select is_empty(
  $$ select * from public.contact_summaries $$,
  'a deactivated agent sees nobody'
);

select * from finish();
rollback;
