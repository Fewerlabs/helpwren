begin;
\ir support/fixture.psql

select plan(12);

select tests.act_as('guest_a');
select throws_ok(
  $$ insert into public.conversation_ratings (conversation_id, contact_id, score)
     values (tests.thing('guest_a_conversation'), tests.uid('guest_a'), 5) $$,
  '42501', null,
  'a contact cannot rate a conversation that is still open'
);

select tests.act_as_owner();
update public.conversations set status = 'resolved'
where id in (tests.thing('guest_a_conversation'), tests.thing('guest_b_conversation'));

select tests.act_as('guest_a');
select throws_ok(
  $$ insert into public.conversation_ratings (conversation_id, contact_id, score)
     values (tests.thing('guest_b_conversation'), tests.uid('guest_a'), 1) $$,
  '42501', null,
  'a contact cannot rate someone else''s conversation'
);
select throws_ok(
  $$ insert into public.conversation_ratings (conversation_id, contact_id, score)
     values (tests.thing('guest_a_conversation'), tests.uid('guest_b'), 1) $$,
  '42501', null,
  'or rate their own in somebody else''s name'
);
select throws_ok(
  $$ insert into public.conversation_ratings (conversation_id, contact_id, score)
     values (tests.thing('guest_a_conversation'), tests.uid('guest_a'), 6) $$,
  '23514', null,
  'a score is from 1 to 5'
);
select lives_ok(
  $$ insert into public.conversation_ratings (conversation_id, contact_id, score, comment)
     values (tests.thing('guest_a_conversation'), tests.uid('guest_a'), 4, 'Quick and clear.') $$,
  'a contact rates their own resolved conversation'
);
select throws_ok(
  $$ insert into public.conversation_ratings (conversation_id, contact_id, score)
     values (tests.thing('guest_a_conversation'), tests.uid('guest_a'), 1) $$,
  '23505', null,
  'and only once'
);
select throws_ok(
  $$ update public.conversation_ratings set score = 5 $$, '42501', null,
  'a rating cannot be changed'
);
select results_eq(
  $$ select kind, actor_id, data from public.conversation_events where kind = 'rated' $$,
  $$ values ('rated', tests.uid('guest_a'), '{"score": 4}'::jsonb) $$,
  'the rating is part of the conversation''s history, which the contact can see'
);

select tests.act_as('guest_b');
select is_empty(
  $$ select * from public.conversation_ratings $$,
  'another guest cannot read it'
);

select tests.act_as('agent');
select results_eq(
  $$ select score, comment from public.conversation_ratings $$,
  $$ values (4::smallint, 'Quick and clear.') $$,
  'an agent reads the rating and the comment'
);
select throws_ok(
  $$ insert into public.conversation_ratings (conversation_id, contact_id, score)
     values (tests.thing('guest_b_conversation'), tests.uid('guest_b'), 5) $$,
  '42501', null,
  'an agent cannot rate on a contact''s behalf'
);

select tests.act_as_visitor();
select throws_ok(
  $$ select * from public.conversation_ratings $$, '42501', null,
  'a visitor with no session cannot read ratings'
);

select * from finish();
rollback;
