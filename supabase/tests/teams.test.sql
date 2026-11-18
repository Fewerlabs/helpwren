begin;
\ir support/fixture.psql

select plan(13);

select tests.act_as('admin');
select lives_ok(
  $$ insert into public.teams (id, name) values
       ('e0000000-0000-4000-8000-000000000001', 'Billing'),
       ('e0000000-0000-4000-8000-000000000002', 'Support') $$,
  'an admin makes teams'
);
select throws_ok(
  $$ insert into public.teams (name) values ('  billing ') $$, '23505', null,
  'two teams cannot share a name, however it is written'
);
select lives_ok(
  format(
    $$ insert into public.team_members (team_id, agent_id)
       values ('e0000000-0000-4000-8000-000000000001', %L) $$,
    tests.uid('agent')
  ),
  'an admin puts a team member in a team'
);

select tests.act_as('agent');
select is((select count(*) from public.teams), 2::bigint, 'an agent sees the teams');
select is((select count(*) from public.team_members), 1::bigint, 'an agent sees who is in them');
select throws_ok(
  $$ insert into public.teams (name) values ('Rogue') $$, '42501', null,
  'an agent who is not an admin cannot make a team'
);
select lives_ok(
  $$ delete from public.team_members $$,
  'an agent''s attempt to empty a team is silently ignored'
);
select lives_ok(
  format(
    $$ update public.conversations set team_id = 'e0000000-0000-4000-8000-000000000001'
       where id = %L $$,
    tests.thing('guest_a_conversation')
  ),
  'an agent gives a conversation to a team'
);
select is(
  (select data from public.conversation_events where kind = 'team_changed'),
  '{"to": "e0000000-0000-4000-8000-000000000001", "name": "Billing"}'::jsonb,
  'the conversation''s history says which team, by name'
);

select tests.act_as('guest_a');
select is((select count(*) from public.teams), 0::bigint, 'a guest sees no teams');
select is(
  (select count(*) from public.conversation_events where kind = 'team_changed'), 0::bigint,
  'a guest is not told which team has their conversation'
);

select tests.act_as('admin');
select lives_ok(
  $$ delete from public.teams where name = 'Billing' $$,
  'an admin removes a team'
);
select is(
  (select count(*) from public.conversation_events where kind = 'team_changed'), 1::bigint,
  'removing a team leaves its conversations without one, and adds nothing to their history'
);

select * from finish();
rollback;
