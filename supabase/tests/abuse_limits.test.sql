begin;
\ir support/fixture.psql

select plan(36);

-- Shared request counts.
select tests.act_as_server();
select is(
  array[
    public.hit_rate_limit('test:key', 2, 60),
    public.hit_rate_limit('test:key', 2, 60),
    public.hit_rate_limit('test:key', 2, 60)
  ],
  array[true, true, false],
  'the server counts requests against a key, up to its limit in a window'
);
select ok(public.hit_rate_limit('test:other', 2, 60), 'each key has its own count');

select tests.act_as('guest_a');
select throws_ok(
  $$ select public.hit_rate_limit('test:key', 1000, 60) $$, '42501', null,
  'a browser cannot count, or reset, a limit'
);
select throws_ok(
  $$ select * from public.rate_limits $$, '42501', null, 'nor read the counts'
);
select tests.act_as_visitor();
select throws_ok(
  $$ select public.hit_rate_limit('test:key', 1000, 60) $$, '42501', null,
  'nor can a visitor with no session'
);

-- Blocking a contact.
select tests.act_as('guest_a');
update public.contacts set blocked_at = now() where id in (tests.uid('guest_a'), tests.uid('guest_b'));
select tests.act_as_owner();
select is(
  (select count(*) from public.contacts where blocked_at is not null), 0::bigint,
  'a contact cannot block anyone, themselves included'
);
select tests.act_as('guest_a');
select throws_ok(
  $$ update public.contacts set verified = true where id = tests.uid('guest_a') $$, '42501', null,
  'nor change anything else about themselves'
);

select tests.act_as('agent');
select throws_ok(
  $$ update public.contacts set name = 'Renamed' where id = tests.uid('guest_a') $$, '42501', null,
  'an agent changes nothing about a contact but whether they are blocked'
);
update public.contacts set blocked_at = '2000-01-01' where id = tests.uid('guest_a');
select tests.act_as_owner();
select results_eq(
  $$ select blocked_at > now() - interval '1 minute', blocked_by from public.contacts
     where id = tests.uid('guest_a') $$,
  $$ values (true, tests.uid('agent')) $$,
  'an agent blocks a contact, at the database''s time and as themselves, whatever was sent'
);
select results_eq(
  $$ select actor_id, action from public.audit_events where contact_id = tests.uid('guest_a') $$,
  $$ values (tests.uid('agent'), 'contact_blocked') $$,
  'the block is written to the audit log'
);

select tests.act_as('guest_a');
select throws_ok(
  format(
    $$ insert into public.messages (conversation_id, sender_id, sender_role, body)
       values (%L, %L, 'guest', 'Let me back in') $$,
    tests.thing('guest_a_conversation'), tests.uid('guest_a')
  ),
  'HW403', null, 'a blocked contact cannot write'
);
select is_empty($$ select * from public.audit_events $$, 'a contact cannot read the audit log');

select tests.act_as_server();
select throws_ok(
  $$ select public.start_conversation(tests.uid('guest_a'), 'Hello again', 'web') $$,
  'HW403', null, 'nor start a conversation'
);

select tests.act_as('agent');
update public.contacts set blocked_at = null where id = tests.uid('guest_a');
select tests.act_as('guest_a');
select lives_ok(
  format(
    $$ insert into public.messages (conversation_id, sender_id, sender_role, body)
       values (%L, %L, 'guest', 'Thank you') $$,
    tests.thing('guest_a_conversation'), tests.uid('guest_a')
  ),
  'once unblocked, they write again'
);
select tests.act_as('agent');
select results_eq(
  $$ select action from public.audit_events where contact_id = tests.uid('guest_a')
     order by created_at, action $$,
  $$ values ('contact_blocked'), ('contact_unblocked') $$,
  'and the team reads both in the audit log'
);
select throws_ok(
  $$ insert into public.audit_events (action) values ('contact_blocked') $$, '42501', null,
  'nobody writes to the audit log by hand'
);

-- Blocking a network.
select tests.act_as_server();
select lives_ok(
  $$ select public.start_conversation(
       tests.uid('stranger'), 'Buy now', 'web', network_key => repeat('a', 64)) $$,
  'the server records the network a conversation was started from'
);
select is(
  (select network_key from public.contacts where id = tests.uid('stranger')), repeat('a', 64),
  'on the contact'
);

select tests.act_as('agent');
select throws_ok(
  format($$ insert into public.blocked_networks (key) values (%L) $$, repeat('b', 64)),
  '42501', null, 'an agent can only block a network some contact has written from'
);
select lives_ok(
  format(
    $$ insert into public.blocked_networks (key, contact_id) values (%L, %L) $$,
    repeat('a', 64), tests.uid('stranger')
  ),
  'an agent blocks the network a contact wrote from'
);

select tests.act_as_server();
select throws_ok(
  format(
    $$ select public.start_conversation(%L, 'New guest, same spammer', 'web', network_key => %L) $$,
    tests.uid('guest_b'), repeat('a', 64)
  ),
  'HW403', null, 'nobody can start a conversation from a blocked network'
);
select tests.act_as('stranger');
select throws_ok(
  $$ insert into public.messages (conversation_id, sender_id, sender_role, body)
     select id, tests.uid('stranger'), 'guest', 'Still here'
     from public.conversations where contact_id = tests.uid('stranger') $$,
  'HW403', null, 'and a contact whose network is blocked cannot write'
);
select tests.act_as('agent');
select results_eq(
  $$ select actor_id, action, contact_id from public.audit_events
     where action = 'network_blocked' $$,
  $$ values (tests.uid('agent'), 'network_blocked', tests.uid('stranger')) $$,
  'the network block is in the audit log too'
);
select tests.act_as('guest_b');
select is_empty(
  $$ select * from public.blocked_networks $$, 'a contact cannot see which networks are blocked'
);

-- What guests may send.
select tests.act_as('guest_b');
select throws_ok(
  format(
    $$ insert into public.messages (conversation_id, sender_id, sender_role, body)
       values (%L, %L, 'guest', 'https://spam.example/win') $$,
    tests.thing('guest_b_conversation'), tests.uid('guest_b')
  ),
  'HW422', null, 'a guest''s bare link is refused before the team has replied'
);
select lives_ok(
  format(
    $$ insert into public.messages (conversation_id, sender_id, sender_role, body)
       values (%L, %L, 'guest', 'The page https://shop.example/cart will not load') $$,
    tests.thing('guest_b_conversation'), tests.uid('guest_b')
  ),
  'a link with something said about it is fine'
);
select throws_ok(
  format(
    $$ insert into public.messages (conversation_id, sender_id, sender_role, body)
       values (%L, %L, 'guest', %L) $$,
    tests.thing('guest_b_conversation'), tests.uid('guest_b'),
    'See ' || (select string_agg('https://a' || n || '.example', ' ') from generate_series(1, 6) n)
  ),
  'HW422', null, 'more than five links in one message is refused'
);
select tests.act_as('member');
select lives_ok(
  format(
    $$ insert into public.messages (conversation_id, sender_id, sender_role, body)
       values (%L, %L, 'user', 'https://acme.example/order/1') $$,
    tests.thing('member_conversation'), tests.uid('member')
  ),
  'a verified user of the host product may send a bare link'
);

select tests.act_as('guest_b');
insert into public.messages (conversation_id, sender_id, sender_role, body)
values (tests.thing('guest_b_conversation'), tests.uid('guest_b'), 'guest', 'Hello?');
insert into public.messages (conversation_id, sender_id, sender_role, body)
values (tests.thing('guest_b_conversation'), tests.uid('guest_b'), 'guest', 'Hello?');
select throws_ok(
  format(
    $$ insert into public.messages (conversation_id, sender_id, sender_role, body)
       values (%L, %L, 'guest', 'Hello?') $$,
    tests.thing('guest_b_conversation'), tests.uid('guest_b')
  ),
  'HW422', null, 'the same words a third time in a few minutes are refused'
);

-- Everyone on the contact's side of a shared conversation counts towards its limit.
select tests.act_as_owner();
insert into public.messages (conversation_id, sender_id, sender_role, body, created_at)
select tests.thing('member_conversation'), tests.uid('teammate'), 'user', 'Note ' || n, now()
from generate_series(1, 30) n;
select tests.act_as('member');
select throws_ok(
  format(
    $$ insert into public.messages (conversation_id, sender_id, sender_role, body)
       values (%L, %L, 'user', 'And one more') $$,
    tests.thing('member_conversation'), tests.uid('member')
  ),
  'HW429', null, 'a conversation takes thirty messages a minute from its contacts at most'
);

-- Starting conversations and tickets.
select tests.act_as_server();
select throws_ok(
  $$ select public.start_conversation(tests.uid('guest_b'), 'https://spam.example', 'web') $$,
  'HW422', null, 'a guest cannot start a conversation with a bare link'
);
select lives_ok(
  $$ select public.start_conversation(tests.uid('guest_b'), 'Ticket ' || n, 'web',
       ticket_subject => 'Subject ' || n) from generate_series(1, 3) n $$,
  'a guest opens three tickets in an hour'
);
select throws_ok(
  $$ select public.start_conversation(tests.uid('guest_b'), 'Ticket four', 'web',
       ticket_subject => 'Subject four') $$,
  'HW429', null, 'but not a fourth'
);
select tests.act_as_owner();
insert into public.conversations (contact_id, source, created_at)
select tests.uid('teammate'), 'web', now() - interval '2 hours' from generate_series(1, 20);
select tests.act_as_server();
select throws_ok(
  $$ select public.start_conversation(tests.uid('teammate'), 'Again', 'web') $$,
  'HW429', null, 'nobody starts more than twenty conversations a day'
);

-- A browser tied to one contact is not handed to another by naming it.
insert into public.visitors (id, contact_id, page_url)
values ('visitor-abcdefghijkl', tests.uid('guest_a'), 'https://example.com');
select public.link_visitor('visitor-abcdefghijkl', tests.uid('guest_b'));
select is(
  (select contact_id from public.visitors where id = 'visitor-abcdefghijkl'), tests.uid('guest_a'),
  'a browser that belongs to one contact cannot be claimed by another'
);

-- Search reads only the start of a very long query.
select lives_ok(
  $$ select * from public.search_articles(repeat('word ', 5000)) $$,
  'a very long search is cut short, not refused'
);

select * from finish();
rollback;
