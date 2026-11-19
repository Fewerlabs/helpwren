begin;
\ir support/fixture.psql

select plan(14);

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
  $$ select * from public.search_conversations('Hello_from') $$,
  'and so is an underscore'
);

-- Tickets are found by number, with or without the hash, and by subject.
update public.conversations set type = 'ticket', subject = 'Refund for a damaged order'
where id = tests.thing('guest_b_conversation');

select results_eq(
  $$ select id from public.search_conversations(
       (select ticket_number::text from public.conversations
        where id = tests.thing('guest_b_conversation'))) $$,
  $$ values (tests.thing('guest_b_conversation')) $$,
  'a ticket is found by its number'
);
select results_eq(
  $$ select id from public.search_conversations(
       (select '#' || ticket_number from public.conversations
        where id = tests.thing('guest_b_conversation'))) $$,
  $$ values (tests.thing('guest_b_conversation')) $$,
  'and by its number written with a hash'
);
select results_eq(
  $$ select id from public.search_conversations('damaged order') $$,
  $$ values (tests.thing('guest_b_conversation')) $$,
  'and by its subject'
);
select is_empty(
  $$ select * from public.search_conversations('#999999') $$,
  'a number that is no ticket''s finds nothing'
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

-- There is no cap: the ticket list pages through every match, so all of them come back.
select tests.act_as_owner();
insert into public.conversations (contact_id, source, type, subject)
select tests.uid('guest_a'), 'web', 'ticket', 'Missing parcel ' || n
from generate_series(1, 60) as n;

select tests.act_as('agent');
select is(
  (select count(*) from public.search_conversations('missing parcel')), 60::bigint,
  'a search returns every match, more than fifty'
);

select * from finish();
rollback;
