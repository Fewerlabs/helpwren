begin;
\ir support/fixture.psql

select plan(11);

select tests.act_as_visitor();
select throws_ok(
  $$ select * from public.notes $$, '42501', null,
  'a visitor with no session cannot read notes'
);

select tests.act_as('guest_a');
select is_empty(
  $$ select * from public.notes $$,
  'a guest cannot read the notes on their own conversation'
);
select throws_ok(
  $$ insert into public.notes (conversation_id, author_id, body)
     values (tests.thing('guest_a_conversation'), tests.uid('agent'), 'Planted') $$,
  '42501', null,
  'a guest cannot write notes'
);

select tests.act_as('teammate');
select is_empty(
  $$ select * from public.notes $$,
  'a verified user cannot read notes'
);

select tests.act_as('agent');
select results_eq(
  $$ select body from public.notes $$, $$ values ('Internal note') $$,
  'an agent reads notes'
);
select lives_ok(
  $$ update public.notes set body = 'Reworded' where id = tests.thing('agent_note') $$,
  'an agent edits their own note'
);
select throws_ok(
  $$ insert into public.notes (conversation_id, author_id, body)
     values (tests.thing('guest_a_conversation'), tests.uid('admin'), 'In another name') $$,
  '42501', null,
  'an agent cannot write a note in another agent''s name'
);

select tests.act_as('admin');
select lives_ok(
  $$ update public.notes set body = 'Overwritten' $$,
  'an admin''s attempt to edit another agent''s note is silently ignored'
);
select lives_ok(
  $$ delete from public.notes $$,
  'an admin''s attempt to delete another agent''s note is silently ignored'
);
select results_eq(
  $$ select body from public.notes $$, $$ values ('Reworded') $$,
  'the note still holds its author''s wording'
);

select tests.act_as('former_agent');
select is_empty(
  $$ select * from public.notes $$,
  'a deactivated agent cannot read notes'
);

select * from finish();
rollback;
