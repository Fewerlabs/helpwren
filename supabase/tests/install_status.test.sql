begin;
\ir support/fixture.psql

select plan(16);

-- Nobody but the server reads or changes the install's status.
select tests.act_as_visitor();
select throws_ok(
  $$ select * from public.install_status $$, '42501', null,
  'a visitor cannot read the install status'
);
select tests.act_as('admin');
select throws_ok(
  $$ select * from public.install_status $$, '42501', null,
  'not even an admin reads the install status directly'
);
select throws_ok(
  $$ update public.install_status set setup_completed_at = null $$, '42501', null,
  'an admin cannot change the install status directly'
);

-- Only the server may make the first admin, record the widget, or read the schema version.
select throws_ok(
  $$ select public.create_first_admin(tests.uid('stranger'), 'Stranger', 'stranger@example.test') $$,
  '42501', null,
  'a signed-in person cannot make themselves the first admin'
);
select tests.act_as_visitor();
select throws_ok(
  $$ select public.create_first_admin(tests.uid('stranger'), 'Stranger', 'stranger@example.test') $$,
  '42501', null,
  'a visitor cannot make the first admin'
);
select throws_ok(
  $$ select public.record_widget_seen('https://planted.example') $$, '42501', null,
  'a visitor cannot record the widget as seen'
);
select throws_ok(
  $$ select public.schema_version() $$, '42501', null,
  'a visitor cannot read the schema version'
);

-- With a team in place, the first-admin door is shut, even for the server.
select tests.act_as_server();
select is(
  public.create_first_admin(tests.uid('stranger'), 'Stranger', 'stranger@example.test'), false,
  'the server cannot make a first admin while anyone is on the team'
);
select tests.act_as_owner();
select is(
  (select count(*) from public.agents where user_id = tests.uid('stranger')), 0::bigint,
  'and nobody was added'
);

-- A new install: nobody on the team at all, not even someone deactivated.
truncate public.agents cascade;
select tests.act_as_server();
select is(
  public.create_first_admin(tests.uid('stranger'), 'First Admin', 'first@example.test'), true,
  'on an install with no team, the server makes the first admin'
);
select is(
  public.create_first_admin(tests.uid('member'), 'Second', 'second@example.test'), false,
  'a second call is refused once the first admin exists'
);
select tests.act_as_owner();
select results_eq(
  $$ select user_id, role, active from public.agents $$,
  $$ values (tests.uid('stranger'), 'admin'::text, true) $$,
  'there is exactly one agent, an active admin'
);

-- The widget is recorded once a minute per site, and the first site is kept.
select tests.act_as_server();
update public.install_status set widget_first_seen_origin = null, widget_first_seen_at = null,
  widget_last_seen_origin = null, widget_last_seen_at = null;
select public.record_widget_seen('https://shop.example');
select results_eq(
  $$ select widget_first_seen_origin, widget_last_seen_origin from public.install_status $$,
  $$ values ('https://shop.example'::text, 'https://shop.example'::text) $$,
  'the first site the widget loads on is recorded'
);
select public.record_widget_seen('https://blog.example');
select results_eq(
  $$ select widget_first_seen_origin, widget_last_seen_origin from public.install_status $$,
  $$ values ('https://shop.example'::text, 'https://blog.example'::text) $$,
  'another site becomes the latest, and the first is kept'
);
update public.install_status set widget_last_seen_at = '2000-01-01';
select public.record_widget_seen('https://blog.example');
select ok(
  (select widget_last_seen_at > now() - interval '1 minute' from public.install_status),
  'a site seen a while ago is seen again'
);

select ok(
  public.schema_version() is not null,
  'the server can read the newest migration'
);

select * from finish();
rollback;
