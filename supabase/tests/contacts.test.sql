begin;
\ir support/fixture.psql

select plan(9);

select tests.act_as_visitor();
select throws_ok(
  $$ select * from public.contacts $$, '42501', null,
  'a visitor with no session cannot read contacts'
);

select tests.act_as('guest_a');
select results_eq(
  $$ select name from public.contacts $$, $$ values ('Guest A') $$,
  'a guest reads only their own contact'
);
select throws_ok(
  $$ update public.contacts set verified = true, org_id = 'acme' $$, '42501', null,
  'a guest cannot verify themselves or join an organisation'
);
select throws_ok(
  $$ insert into public.contacts (id) values (tests.uid('stranger')) $$, '42501', null,
  'a guest cannot create contacts'
);
select throws_ok(
  $$ delete from public.contacts $$, '42501', null,
  'a guest cannot delete contacts'
);

select tests.act_as('teammate');
select results_eq(
  $$ select name from public.contacts $$, $$ values ('Teammate') $$,
  'a verified user does not see the other contacts in their organisation'
);

select tests.act_as('stranger');
select is_empty(
  $$ select * from public.contacts $$,
  'a signed-in person with no contact sees nothing'
);

select tests.act_as('agent');
select is(
  (select count(*) from public.contacts), 5::bigint,
  'an agent reads every contact'
);

select tests.act_as('former_agent');
select is_empty(
  $$ select * from public.contacts $$,
  'a deactivated agent reads no contacts'
);

select * from finish();
rollback;
