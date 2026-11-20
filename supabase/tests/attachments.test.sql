begin;
\ir support/fixture.psql

select plan(11);

-- Files are stored by the app's server, after it has checked their bytes. Storage fills in a
-- file's type and size when it is uploaded; here they are written directly.
select tests.act_as_server();
insert into storage.objects (bucket_id, name, metadata) values
  ('attachments', tests.thing('guest_b_conversation') || '/b-file.png',
   '{"mimetype": "image/png", "size": 2048}'),
  ('attachments', tests.thing('guest_a_conversation') || '/invoice.pdf',
   '{"mimetype": "application/pdf", "size": 1234}');

select tests.act_as('guest_a');
select throws_ok(
  format(
    $$ insert into storage.objects (bucket_id, name, metadata)
       values ('attachments', %L, '{"mimetype": "image/png", "size": 10}') $$,
    tests.thing('guest_a_conversation') || '/page.png'
  ),
  '42501', null, 'a guest cannot put a file in the bucket, even in their own conversation'
);
select throws_ok(
  format(
    $$ insert into storage.objects (bucket_id, name) values ('attachments', %L) $$,
    tests.thing('guest_b_conversation') || '/planted.png'
  ),
  '42501', null, 'nor in someone else''s'
);
select is(
  (select count(*) from storage.objects where bucket_id = 'attachments'), 1::bigint,
  'a guest sees only the files in their own conversation'
);

select lives_ok(
  format(
    $$ insert into public.messages (conversation_id, sender_id, sender_role, attachments)
       values (%L, %L, 'guest', %L) $$,
    tests.thing('guest_a_conversation'), tests.uid('guest_a'),
    jsonb_build_array(jsonb_build_object(
      'path', tests.thing('guest_a_conversation') || '/invoice.pdf',
      'name', 'March invoice.pdf', 'type', 'text/html', 'size', 1
    ))
  ),
  'a guest sends a message that is only a file'
);
select is(
  (select attachments -> 0 from public.messages where body is null),
  jsonb_build_object(
    'path', tests.thing('guest_a_conversation') || '/invoice.pdf',
    'name', 'March invoice.pdf', 'type', 'application/pdf', 'size', 1234
  ),
  'the file''s type and size come from what was stored, not from what the sender said'
);
select is(
  (select last_message_preview from public.conversations
   where id = tests.thing('guest_a_conversation')),
  'Sent a file: March invoice.pdf',
  'the conversation''s preview says a file was sent'
);

select throws_ok(
  format(
    $$ insert into public.messages (conversation_id, sender_id, sender_role, body, attachments)
       values (%L, %L, 'guest', 'Look', %L) $$,
    tests.thing('guest_a_conversation'), tests.uid('guest_a'),
    jsonb_build_array(jsonb_build_object(
      'path', tests.thing('guest_b_conversation') || '/b-file.png', 'name', 'theirs.png'
    ))
  ),
  '23514', null, 'a message cannot carry a file from another conversation'
);
select throws_ok(
  format(
    $$ insert into public.messages (conversation_id, sender_id, sender_role, body, attachments)
       values (%L, %L, 'guest', 'Look', %L) $$,
    tests.thing('guest_a_conversation'), tests.uid('guest_a'),
    jsonb_build_array(jsonb_build_object(
      'path', tests.thing('guest_a_conversation') || '/never-uploaded.png', 'name', 'ghost.png'
    ))
  ),
  '23514', null, 'a message cannot carry a file that was never uploaded'
);
select throws_ok(
  format(
    $$ insert into public.messages (conversation_id, sender_id, sender_role)
       values (%L, %L, 'guest') $$,
    tests.thing('guest_a_conversation'), tests.uid('guest_a')
  ),
  '23514', null, 'a message with no words and no file is refused'
);

select tests.act_as('agent');
select is(
  (select count(*) from storage.objects where bucket_id = 'attachments'), 2::bigint,
  'an agent sees the files in every conversation'
);
select throws_ok(
  format(
    $$ insert into storage.objects (bucket_id, name) values ('attachments', %L) $$,
    tests.thing('guest_a_conversation') || '/reply.png'
  ),
  '42501', null, 'an agent does not put a file in the bucket either: the server does'
);

select * from finish();
rollback;
