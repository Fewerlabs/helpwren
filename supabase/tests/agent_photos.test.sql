begin;
\ir support/fixture.psql

select plan(4);

select tests.act_as('agent');
select lives_ok(
  format(
    $$ insert into storage.objects (bucket_id, name) values ('avatars', %L) $$,
    tests.uid('agent') || '/me.png'
  ),
  'a team member adds a photo to their own folder'
);
select throws_ok(
  format(
    $$ insert into storage.objects (bucket_id, name) values ('avatars', %L) $$,
    tests.uid('admin') || '/planted.png'
  ),
  '42501', null, 'a team member cannot add a photo to someone else''s folder'
);
select throws_ok(
  $$ update public.agents set photo = 'https://example.com/x.png' $$, '42501', null,
  'a team member cannot set a photo on the team table directly'
);

select tests.act_as('guest_a');
select throws_ok(
  format(
    $$ insert into storage.objects (bucket_id, name) values ('avatars', %L) $$,
    tests.uid('guest_a') || '/me.png'
  ),
  '42501', null, 'a guest cannot add a photo'
);

select * from finish();
rollback;
