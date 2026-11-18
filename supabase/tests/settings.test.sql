begin;
\ir support/fixture.psql

select plan(11);

select tests.act_as_visitor();
select results_eq(
  $$ select key from public.settings $$, $$ values ('brand') $$,
  'a visitor with no session reads only public settings'
);
select throws_ok(
  $$ update public.settings set value = '{"name": "Defaced"}' $$, '42501', null,
  'a visitor cannot change settings'
);

select tests.act_as('guest_a');
select results_eq(
  $$ select key from public.settings $$, $$ values ('brand') $$,
  'a guest reads only public settings'
);
select lives_ok(
  $$ update public.settings set value = '{"name": "Defaced"}', is_public = true $$,
  'a guest''s attempt to change settings is silently ignored'
);
select throws_ok(
  $$ insert into public.settings (key, value) values ('planted', '1') $$, '42501', null,
  'a guest cannot add settings'
);

select tests.act_as('agent');
select is(
  (select count(*) from public.settings), 2::bigint,
  'an agent reads every setting'
);
select throws_ok(
  $$ insert into public.settings (key, value) values ('planted', '1') $$, '42501', null,
  'an agent who is not an admin cannot add settings'
);
select lives_ok(
  $$ delete from public.settings $$,
  'an agent''s attempt to delete settings is silently ignored'
);

select tests.act_as('admin');
select results_eq(
  $$ select key, value, is_public from public.settings order by key $$,
  $$ values ('brand', '{"name": "Test"}'::jsonb, true), ('signing_secret', '"hidden"'::jsonb, false) $$,
  'the settings are unchanged after those attempts'
);
select lives_ok(
  $$ insert into public.settings (key, value) values ('audiences', '["customer"]');
     update public.settings set value = '{"name": "Renamed"}' where key = 'brand';
     delete from public.settings where key = 'audiences' $$,
  'an admin adds, changes and removes settings'
);

select tests.act_as('former_agent');
select results_eq(
  $$ select key from public.settings $$, $$ values ('brand') $$,
  'a deactivated agent reads only public settings'
);

select * from finish();
rollback;
