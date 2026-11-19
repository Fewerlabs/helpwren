begin;
\ir support/fixture.psql

select plan(19);

select tests.act_as('agent');
select lives_ok(
  format(
    $$ insert into public.saved_replies (id, title, body, shortcut, visibility, owner_id) values
         ('f0000000-0000-4000-8000-000000000001', 'Greeting', 'Hi {contact.first_name}', 'hi',
          'team', null),
         ('f0000000-0000-4000-8000-000000000002', 'My sign-off', 'Cheers, {agent.first_name}',
          'cheers', 'personal', %L) $$,
    tests.uid('agent')
  ),
  'an agent adds a team reply and a personal one'
);
select is(
  (select created_by from public.saved_replies where shortcut = 'hi'), tests.uid('agent'),
  'a reply records who wrote it'
);
select throws_ok(
  $$ insert into public.saved_replies (title, body, shortcut) values ('Again', 'Hello', 'hi') $$,
  '23505', null,
  'two replies cannot share a shortcut'
);
select throws_ok(
  $$ insert into public.saved_replies (title, body, shortcut) values ('Loud', 'Hello', 'Hi There') $$,
  '23514', null,
  'a shortcut is lowercase words joined by hyphens'
);
select throws_ok(
  format(
    $$ insert into public.saved_replies (title, body, visibility, owner_id)
       values ('Planted', 'Hello', 'personal', %L) $$,
    tests.uid('admin')
  ),
  '42501', null,
  'an agent cannot give someone else a personal reply'
);
select throws_ok(
  format(
    $$ insert into public.saved_replies (title, body, created_by) values ('Framed', 'Hello', %L) $$,
    tests.uid('admin')
  ),
  '42501', null,
  'an agent cannot add a reply in someone else''s name'
);
select throws_ok(
  format(
    $$ insert into public.saved_replies (title, body, visibility, owner_id)
       values ('Mine and yours', 'Hi', 'team', %L) $$,
    tests.uid('agent')
  ),
  '23514', null,
  'a team reply has no owner'
);
select lives_ok(
  $$ update public.saved_replies set title = 'Hello' where shortcut = 'hi' $$,
  'the author changes their team reply'
);

select tests.act_as('admin');
select is(
  (select array_agg(shortcut order by shortcut) from public.saved_replies), array['hi'],
  'another team member sees the team''s replies, not someone else''s personal ones'
);
update public.saved_replies set body = 'Snooped' where shortcut = 'cheers';
select tests.act_as_owner();
select is(
  (select body from public.saved_replies where shortcut = 'cheers'), 'Cheers, {agent.first_name}',
  'nobody else may change a personal reply, not even an admin'
);
select tests.act_as('admin');
select lives_ok(
  $$ update public.saved_replies set body = 'Hi {contact.first_name}!' where shortcut = 'hi' $$,
  'an admin changes any team reply'
);
select throws_ok(
  format($$ update public.saved_replies set created_by = %L where shortcut = 'hi' $$,
         tests.uid('admin')),
  '42501', null,
  'who wrote a reply cannot be changed'
);

-- Another team member who is neither the author nor an admin.
select tests.act_as_owner();
insert into tests.people (name) values ('second_agent');
insert into auth.users (id, email) values (tests.uid('second_agent'), 'second@example.test');
insert into public.agents (user_id, name, email, role, active)
values (tests.uid('second_agent'), 'Second', 'second@example.test', 'agent', true);

select tests.act_as('second_agent');
update public.saved_replies set body = 'Rewritten' where shortcut = 'hi';
delete from public.saved_replies where shortcut = 'hi';
select tests.act_as_owner();
select is(
  (select body from public.saved_replies where shortcut = 'hi'), 'Hi {contact.first_name}!',
  'an agent can neither rewrite nor delete a team reply someone else wrote'
);

select tests.act_as('agent');
select throws_ok(
  format(
    $$ update public.saved_replies set visibility = 'personal', owner_id = %L
       where shortcut = 'hi' $$,
    tests.uid('admin')
  ),
  '42501', null,
  'a team reply cannot be made someone else''s personal one'
);
select lives_ok(
  format(
    $$ update public.saved_replies set visibility = 'team', owner_id = null
       where shortcut = 'cheers' and owner_id = %L $$,
    tests.uid('agent')
  ),
  'the owner shares a personal reply with the team'
);
select lives_ok(
  $$ delete from public.saved_replies where shortcut = 'cheers' $$,
  'the author deletes their reply'
);
select is((select count(*) from public.saved_replies), 1::bigint, 'and it is gone');

select tests.act_as('former_agent');
select is((select count(*) from public.saved_replies), 0::bigint, 'a deactivated agent sees none');

select tests.act_as('guest_a');
select is((select count(*) from public.saved_replies), 0::bigint, 'a contact sees none');

select * from finish();
rollback;
