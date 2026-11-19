begin;
\ir support/fixture.psql

select plan(6);

select is(
  (select public from storage.buckets where id = 'articles'), true,
  'the articles bucket is public, so a picture in a published article can be shown to anyone'
);

select tests.act_as_visitor();
select throws_ok(
  $$ insert into storage.objects (bucket_id, name) values ('articles', 'visitor.png') $$,
  '42501', null, 'a visitor cannot upload a picture'
);

select tests.act_as('guest_a');
select throws_ok(
  $$ insert into storage.objects (bucket_id, name) values ('articles', 'guest.png') $$,
  '42501', null, 'a guest cannot upload a picture'
);

select tests.act_as('former_agent');
select throws_ok(
  $$ insert into storage.objects (bucket_id, name) values ('articles', 'former.png') $$,
  '42501', null, 'a deactivated team member cannot upload a picture'
);

select tests.act_as('agent');
select lives_ok(
  $$ insert into storage.objects (bucket_id, name) values ('articles', 'agent.png') $$,
  'an agent uploads a picture for an article'
);
select throws_ok(
  $$ insert into storage.objects (bucket_id, name) values ('other', 'agent.png') $$,
  '42501', null, 'an agent cannot write to a bucket that is not the articles'''
);

select * from finish();
rollback;
