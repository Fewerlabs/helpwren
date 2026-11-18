begin;
\ir support/fixture.psql

select plan(9);

select tests.act_as_visitor();
select throws_ok(
  $$ select * from public.search_conversations('hello') $$, '42501', null,
  'a visitor with no session cannot search'
);

select tests.act_as('agent');
select is(
  (select count(*) from public.search_conversations('Hello from')), 4::bigint,
  'an agent finds conversations by what was said in them'
);
select results_eq(
  $$ select id from public.search_conversations('guest a') $$,
  $$ values (tests.thing('guest_a_conversation')) $$,
  'and by who they are with, whatever the capitals'
);
select is_empty(
  $$ select * from public.search_conversations('no such words anywhere') $$,
  'nothing is found when nothing matches'
);
select is_empty(
  $$ select * from public.search_conversations('h') $$,
  'one letter is too little to search for'
);
select is_empty(
  $$ select * from public.search_conversations('%') $$,
  'a wildcard character is searched for as itself'
);
select is_empty(
  $$ select * from public.search_conversations('Guest_A') $$,
  'and so is an underscore'
);

select tests.act_as('guest_a');
select results_eq(
  $$ select id from public.search_conversations('Hello from') $$,
  $$ values (tests.thing('guest_a_conversation')) $$,
  'a guest who searches finds only their own conversation'
);

select tests.act_as('former_agent');
select is_empty(
  $$ select * from public.search_conversations('Hello from') $$,
  'a deactivated agent finds nothing'
);

select * from finish();
rollback;
