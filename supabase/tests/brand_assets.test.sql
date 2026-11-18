begin;
\ir support/fixture.psql

select plan(5);

select is(
  (select public from storage.buckets where id = 'brand'), true,
  'the brand bucket is public, so a logo can be shown to anyone'
);

select tests.act_as('guest_a');
select throws_ok(
  $$ insert into storage.objects (bucket_id, name) values ('brand', 'logo-guest.png') $$,
  '42501', null, 'a guest cannot upload a logo'
);

select tests.act_as('agent');
select throws_ok(
  $$ insert into storage.objects (bucket_id, name) values ('brand', 'logo-agent.png') $$,
  '42501', null, 'an agent who is not an admin cannot upload a logo'
);

select tests.act_as('admin');
select lives_ok(
  $$ insert into storage.objects (bucket_id, name) values ('brand', 'logo-admin.png') $$,
  'an admin uploads a logo'
);
select throws_ok(
  $$ insert into storage.objects (bucket_id, name) values ('other', 'logo-admin.png') $$,
  '42501', null, 'an admin cannot write to a bucket that is not the brand''s'
);

select * from finish();
rollback;
