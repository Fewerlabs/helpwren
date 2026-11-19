begin;
\ir support/fixture.psql

select plan(28);

-- Who may read and write browsers' rows.
select tests.act_as_server();
select public.record_visit(
  'visitor-reader-0001', 'https://shop.test/pricing', 'Pricing', 'https://search.test/',
  'Chrome', 'macOS', 'desktop', 'en-GB', 'Europe/London', 'GB', 'England', 'London'
);

select tests.act_as_visitor();
select throws_ok(
  $$ select * from public.visitors $$, '42501', null,
  'a visitor with no session cannot read the list of visitors'
);

select tests.act_as('guest_a');
select is_empty($$ select * from public.visitors $$, 'a guest sees no visitors');
select throws_ok(
  $$ insert into public.visitors (id, page_url) values ('visitor-forged-0001', 'https://x.test') $$,
  '42501', null,
  'nor can they add one'
);
select throws_ok(
  $$ select public.record_visit('visitor-forged-0002', 'https://x.test') $$,
  '42501', null,
  'or check in without the app''s server'
);

select tests.act_as('agent');
select results_eq(
  $$ select page_title, country, city, browser from public.visitors where id = 'visitor-reader-0001' $$,
  $$ values ('Pricing', 'GB', 'London', 'Chrome') $$,
  'an agent sees who is on the site and where'
);
select throws_ok(
  $$ update public.visitors set pending_message = 'Hi' where id = 'visitor-reader-0001' $$,
  '42501', null,
  'but leaves a message only through the app''s server'
);
select throws_ok(
  $$ select public.claim_visitor_outreach('visitor-reader-0001', tests.uid('agent'), 'web') $$,
  '42501', null,
  'and cannot take one up from the browser'
);

select tests.act_as('former_agent');
select is_empty($$ select * from public.visitors $$, 'a deactivated agent sees nobody');

-- Checking in.
select tests.act_as_server();
select throws_ok(
  $$ select public.record_visit('short', 'https://shop.test/') $$,
  '22023', null,
  'a visitor id must look like one'
);
select is(
  public.record_visit('visitor-browse-0001', 'https://shop.test/', 'Home', 'https://news.test/'),
  false,
  'a check-in says when no message is waiting'
);
select public.record_visit('visitor-browse-0001', 'https://shop.test/a', 'A');
select public.record_visit('visitor-browse-0001', 'https://shop.test/a', 'A, again');
select public.record_visit('visitor-browse-0001', 'https://shop.test/b', 'B', 'https://shop.test/a');

select tests.act_as_owner();
select results_eq(
  $$ select jsonb_path_query_array(recent_pages, '$[*].title'), session_count, referrer, contact_id
     from public.visitors where id = 'visitor-browse-0001' $$,
  $$ values ('["B", "A, again", "Home"]'::jsonb, 1, 'https://news.test/', null::uuid) $$,
  'pages are kept newest first, the same page twice is one visit, and the session keeps its referrer'
);

-- Only ten pages are kept.
select tests.act_as_server();
select public.record_visit('visitor-browse-0001', 'https://shop.test/p' || n, 'P' || n)
from generate_series(1, 12) as n;
select tests.act_as_owner();
select is(
  (select jsonb_array_length(recent_pages) from public.visitors where id = 'visitor-browse-0001'),
  10,
  'only the last ten pages are kept'
);

-- Half an hour away starts a new session, with its own referrer.
update public.visitors
set last_seen_at = now() - interval '31 minutes', session_started_at = now() - interval '2 hours'
where id = 'visitor-browse-0001';
select tests.act_as_server();
select public.record_visit('visitor-browse-0001', 'https://shop.test/', 'Home', 'https://mail.test/');
select tests.act_as_owner();
select results_eq(
  $$ select session_count, referrer, session_started_at > now() - interval '1 minute'
     from public.visitors where id = 'visitor-browse-0001' $$,
  $$ values (2, 'https://mail.test/', true) $$,
  'coming back after half an hour counts a new session'
);

-- A session that is not a contact yet leaves the browser belonging to nobody.
select tests.act_as_server();
select public.record_visit(
  'visitor-nobody-0001', 'https://shop.test/', 'Home', contact_id => tests.uid('stranger')
);
select tests.act_as_owner();
select is(
  (select contact_id from public.visitors where id = 'visitor-nobody-0001'), null,
  'a session with no contact yet ties the browser to nobody'
);

-- A contact's browser gives them its details.
select tests.act_as_server();
select public.record_visit(
  'visitor-member-0001', 'https://shop.test/account', 'Account', 'https://search.test/',
  'Firefox', 'Windows', 'desktop', 'nb-NO', 'Europe/Oslo', 'NO', 'Oslo', 'Oslo',
  contact_id => tests.uid('member')
);
select public.record_visit(
  'visitor-member-0001', 'https://shop.test/orders', 'Orders', contact_id => tests.uid('member')
);
select tests.act_as('agent');
select results_eq(
  $$ select country, city, browser, os, device, language, timezone, session_count,
            last_page_url, last_page_title, referrer, last_seen_at is not null,
            first_seen_at is not null
     from public.contact_summaries where id = tests.uid('member') $$,
  $$ values ('NO', 'Oslo', 'Firefox', 'Windows', 'desktop', 'nb-NO', 'Europe/Oslo', 1,
             'https://shop.test/orders', 'Orders', 'https://search.test/', true, true) $$,
  'a contact''s browser fills in their details, which the contact list shows'
);

-- A check-in with no location from the platform keeps the one known.
select tests.act_as_server();
select public.record_visit(
  'visitor-member-0001', 'https://shop.test/orders', 'Orders', country => 'SE'
);
select tests.act_as_owner();
select results_eq(
  $$ select country, region, city from public.visitors where id = 'visitor-member-0001' $$,
  $$ values ('SE', null::text, null::text) $$,
  'a new country replaces the whole location, so no city is paired with the wrong one'
);

-- Writing for the first time ties the browser to the new contact.
select tests.act_as_server();
select public.link_visitor('visitor-nobody-0001', tests.uid('guest_b'));
select tests.act_as_owner();
select results_eq(
  $$ select v.contact_id, k.last_page_title
     from public.visitors v join public.contacts k on k.id = v.contact_id
     where v.id = 'visitor-nobody-0001' $$,
  $$ values (tests.uid('guest_b'), 'Home') $$,
  'a browser is tied to the contact who wrote from it, and gives them its details'
);

-- The team leaves a message, and the browser takes it up.
update public.visitors
set pending_message = 'Can I help you choose a plan?', pending_agent_id = tests.uid('agent'),
    pending_at = now()
where id = 'visitor-reader-0001';

select tests.act_as_server();
select is(
  public.record_visit('visitor-reader-0001', 'https://shop.test/pricing', 'Pricing'),
  true,
  'the next check-in says a message is waiting'
);
select throws_ok(
  $$ select public.claim_visitor_outreach('visitor-reader-0001', tests.uid('admin'), 'web') $$,
  '22023', null,
  'a team member cannot take up a message meant for a visitor'
);

-- The stranger has a session but has never written: they become a contact now.
insert into tests.things (name, id)
select 'outreach', public.claim_visitor_outreach(
  'visitor-reader-0001', tests.uid('stranger'), 'web', '{"url": "https://shop.test/pricing"}'
);

select tests.act_as_owner();
select isnt(tests.thing('outreach'), null, 'taking up the message starts a conversation');
select results_eq(
  $$ select k.kind, c.contact_id, c.assignee_id, c.source, c.unread_for_contact,
            c.last_message_preview
     from public.conversations c join public.contacts k on k.id = c.contact_id
     where c.id = tests.thing('outreach') $$,
  $$ values ('guest', tests.uid('stranger'), tests.uid('agent'), 'web', 1,
             'Can I help you choose a plan?') $$,
  'with a new guest, assigned to the team member, unread for the visitor'
);
select results_eq(
  $$ select sender_id, sender_role, body from public.messages
     where conversation_id = tests.thing('outreach') $$,
  $$ values (tests.uid('agent'), 'agent', 'Can I help you choose a plan?') $$,
  'whose first message is the team member''s'
);
select results_eq(
  $$ select contact_id, pending_message, pending_agent_id, outreach_conversation_id
     from public.visitors where id = 'visitor-reader-0001' $$,
  $$ values (tests.uid('stranger'), null::text, null::uuid, tests.thing('outreach')) $$,
  'the browser is tied to them, nothing is waiting any more, and the conversation is noted'
);
select is(
  (select city from public.contacts where id = tests.uid('stranger')), 'London',
  'and the new contact has the browser''s details'
);

select tests.act_as_server();
select is(
  public.claim_visitor_outreach('visitor-reader-0001', tests.uid('stranger'), 'web'), null,
  'a message is taken up once'
);

-- A guest who signs in brings their browsers.
-- Within one transaction every check-in has the same time, so the member's own browser is
-- set back a minute to make the guest's the latest.
select tests.act_as_owner();
update public.visitors set last_seen_at = now() - interval '1 minute'
where id = 'visitor-member-0001';
select tests.act_as_server();
select public.record_visit(
  'visitor-guest-a-0001', 'https://shop.test/cart', 'Cart', browser => 'Safari',
  contact_id => tests.uid('guest_a')
);
select public.merge_guest_into_user(tests.uid('guest_a'), tests.uid('member'));
select tests.act_as_owner();
select results_eq(
  $$ select v.contact_id, k.browser, k.last_page_title
     from public.visitors v join public.contacts k on k.id = v.contact_id
     where v.id = 'visitor-guest-a-0001' $$,
  $$ values (tests.uid('member'), 'Safari', 'Cart') $$,
  'a guest who signs in brings their browsers, and the latest one''s details'
);

-- Browsers that stopped coming are forgotten, unless someone is attached to them.
update public.visitors set last_seen_at = now() - interval '31 days'
where id in ('visitor-browse-0001', 'visitor-member-0001');
select is(private.prune_visitors(), 1, 'a month away forgets one browser');
select results_eq(
  $$ select id from public.visitors where id in ('visitor-browse-0001', 'visitor-member-0001') $$,
  $$ values ('visitor-member-0001'::text) $$,
  'the one nobody was attached to'
);

select * from finish();
rollback;
