begin;
\ir support/fixture.psql

select plan(17);

-- Secrets: nobody but the server.
select tests.act_as_owner();
insert into public.secrets (key, value) values ('identity_keys', '[{"id":"k1","secret":"s"}]');

select tests.act_as_visitor();
select throws_ok(
  $$ select * from public.secrets $$, '42501', null,
  'a visitor with no session cannot read secrets'
);

select tests.act_as('guest_a');
select throws_ok(
  $$ select * from public.secrets $$, '42501', null,
  'a guest cannot read secrets'
);

select tests.act_as('agent');
select throws_ok(
  $$ select * from public.secrets $$, '42501', null,
  'an agent cannot read secrets'
);

select tests.act_as('admin');
select throws_ok(
  $$ select * from public.secrets $$, '42501', null,
  'an admin cannot read secrets from the browser'
);
select throws_ok(
  $$ insert into public.secrets (key, value) values ('other', '1') $$, '42501', null,
  'an admin cannot write secrets from the browser'
);

select tests.act_as_server();
select is(
  (select count(*) from public.secrets), 1::bigint,
  'the server reads secrets'
);
select lives_ok(
  $$ update public.secrets set value = '[]' where key = 'identity_keys' $$,
  'the server writes secrets'
);

-- Identifying a contact: only the server.
select tests.act_as('guest_a');
select throws_ok(
  $$ select public.identify_contact(tests.uid('guest_a'), 'u-1') $$, '42501', null,
  'a guest cannot verify themselves'
);

select tests.act_as('admin');
select throws_ok(
  $$ select public.identify_contact(tests.uid('guest_a'), 'u-1') $$, '42501', null,
  'an admin cannot verify a contact from the browser'
);

-- A guest who had been chatting is confirmed as a user in "acme".
select tests.act_as_server();
select lives_ok(
  $$
    select public.identify_contact(
      tests.uid('guest_a'), 'u-1',
      org_id => 'acme', org_name => 'Acme', audience => 'business',
      attributes => '{"plan":"pro"}'
    )
  $$,
  'the server confirms who a contact is'
);

select tests.act_as_owner();
select results_eq(
  $$
    select kind, verified, external_id, name, org_id, audience, attributes
    from public.contacts where id = tests.uid('guest_a')
  $$,
  $$ values ('user', true, 'u-1', 'Guest A', 'acme', 'business', '{"plan":"pro"}'::jsonb) $$,
  'they become a verified user, and keep the name they typed when none is given'
);
select is(
  (select org_id from public.conversations where id = tests.thing('guest_a_conversation')),
  'acme',
  'the conversations they already had join their organisation'
);

select tests.act_as('teammate');
select isnt_empty(
  $$ select 1 from public.conversations where id = tests.thing('guest_a_conversation') $$,
  'a teammate now reads the conversation they started as a guest'
);

-- Identified again, with newer details and no organisation.
select tests.act_as_server();
select lives_ok(
  $$
    select public.identify_contact(
      tests.uid('guest_a'), 'u-1',
      name => 'Ada Obi', email => 'ada@example.test', attributes => '{"seats":3}'
    )
  $$,
  'the server identifies the same contact again'
);

select tests.act_as_owner();
select results_eq(
  $$
    select name, email, org_id, audience, attributes
    from public.contacts where id = tests.uid('guest_a')
  $$,
  $$ values ('Ada Obi', 'ada@example.test', null, 'business', '{"plan":"pro","seats":3}'::jsonb) $$,
  'the host product''s details replace the old ones, and leaving the organisation out leaves it'
);

select tests.act_as('teammate');
select is_empty(
  $$ select 1 from public.conversations where id = tests.thing('guest_a_conversation') $$,
  'their old teammates stop reading their conversations'
);

-- Someone identified before they ever wrote.
select tests.act_as_server();
select is(
  (select kind from public.identify_contact(tests.uid('stranger'), 'u-2')),
  'user',
  'a person with no contact yet gets one'
);

select * from finish();
rollback;
