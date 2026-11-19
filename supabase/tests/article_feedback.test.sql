begin;
\ir support/fixture.psql

select plan(9);

insert into public.collections (id, name, slug) values
  ('f0000000-0000-4000-8000-000000000001', 'Getting started', 'getting-started');
insert into public.articles (id, collection_id, title, slug, status) values
  ('f1000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-000000000001',
   'Install the widget', 'install-the-widget', 'published'),
  ('f1000000-0000-4000-8000-000000000002', 'f0000000-0000-4000-8000-000000000001',
   'Invite your team', 'invite-your-team', 'draft');

-- Answers arrive through the app's server, which limits how often one network may answer.
select tests.act_as_server();
insert into public.article_feedback (article_id, helpful)
values ('f1000000-0000-4000-8000-000000000001', true);

select tests.act_as_visitor();
select throws_ok(
  $$ insert into public.article_feedback (article_id, helpful)
     values ('f1000000-0000-4000-8000-000000000001', true) $$,
  '42501', null, 'a visitor cannot answer straight into the database, where nothing limits it'
);
select throws_ok(
  $$ select * from public.article_feedback $$, '42501', null,
  'a visitor cannot read what others answered'
);
select throws_ok(
  $$ select * from public.article_feedback_totals $$, '42501', null,
  'nor the totals'
);

select tests.act_as('guest_a');
select throws_ok(
  $$ insert into public.article_feedback (article_id, helpful)
     values ('f1000000-0000-4000-8000-000000000001', false) $$,
  '42501', null, 'nor can a guest'
);
select tests.act_as_server();
insert into public.article_feedback (article_id, helpful)
values ('f1000000-0000-4000-8000-000000000001', false);
select tests.act_as('guest_a');
select is(
  (select count(*) from public.article_feedback), 0::bigint,
  'a guest cannot read what others answered'
);
select throws_ok(
  $$ delete from public.article_feedback $$, '42501', null, 'nobody removes an answer'
);

select tests.act_as('agent');
select is(
  (select count(*) from public.article_feedback), 2::bigint, 'an agent reads the answers'
);
select is(
  (select array[helpful, unhelpful] from public.article_feedback_totals
   where article_id = 'f1000000-0000-4000-8000-000000000001'),
  array[1, 1], 'and how many said yes and no'
);

select tests.act_as_owner();
delete from public.articles where id = 'f1000000-0000-4000-8000-000000000001';
select is(
  (select count(*) from public.article_feedback), 0::bigint,
  'removing an article removes its answers'
);

select * from finish();
rollback;
