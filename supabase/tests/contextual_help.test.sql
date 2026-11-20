begin;
\ir support/fixture.psql

select plan(32);

-- What an article carries for contextual help.
insert into public.collections (id, name, slug) values
  ('f0000000-0000-4000-8000-000000000001', 'Bookings', 'bookings'),
  ('f0000000-0000-4000-8000-000000000002', 'Billing', 'billing');

insert into public.articles
  (collection_id, title, slug, summary, status, tags, audiences, locale, fields) values
  ('f0000000-0000-4000-8000-000000000001', 'Cancel a booking', 'cancel-a-booking',
   'Free up the slot.', 'published', '{bookings,cancellations}', '{}', null, '{}'),
  ('f0000000-0000-4000-8000-000000000001', 'How refunds work', 'how-refunds-work',
   'When the money comes back.', 'published', '{refunds,cancellations}', '{business}', 'en',
   '{"plan": "pro"}'),
  ('f0000000-0000-4000-8000-000000000001', 'Réserver une table', 'reserver-une-table',
   null, 'published', '{bookings}', '{}', 'fr', '{}'),
  ('f0000000-0000-4000-8000-000000000002', 'Read your invoice', 'read-your-invoice',
   'Every line explained.', 'published', '{billing}', '{customer}', 'en-gb',
   '{"plan": "starter"}'),
  ('f0000000-0000-4000-8000-000000000002', 'Refunds for staff only', 'refunds-draft',
   null, 'draft', '{refunds}', '{}', null, '{}');

select throws_ok(
  $$ update public.articles set fields = '{"Plan Name": "pro"}' where slug = 'cancel-a-booking' $$,
  '23514', null,
  'a custom field''s name is plain lower case'
);
select throws_ok(
  $$ update public.articles set fields = '{"plan": 3}' where slug = 'cancel-a-booking' $$,
  '23514', null,
  'a custom field''s value is text'
);
select throws_ok(
  $$ update public.articles set locale = 'English' where slug = 'cancel-a-booking' $$,
  '23514', null,
  'a language is a short code'
);

-- find_articles, as a visitor with no session.
select tests.act_as_visitor();

select is(
  (select array_agg(slug) from public.find_articles('{"tags": {"any": ["refunds"]}}')),
  array['how-refunds-work'],
  'tags any of: published articles only'
);
select is(
  (select array_agg(slug) from public.find_articles(
    '{"tags": {"all": ["refunds", "cancellations"]}}')),
  array['how-refunds-work'],
  'tags all of'
);
select is(
  (select array_agg(slug) from public.find_articles(
    '{"collection": "bookings", "tags": {"none": ["refunds"]}}')),
  array['cancel-a-booking', 'reserver-une-table'],
  'tags none of, with a collection, in the collection''s order'
);
select is(
  (select array_agg(slug order by slug) from public.find_articles(
    '{"collection": ["bookings", "billing"], "limit": 50}')),
  array['cancel-a-booking', 'how-refunds-work', 'read-your-invoice', 'reserver-une-table'],
  'several collections'
);
select is(
  (select array_agg(slug) from public.find_articles('{"q": "money"}')),
  array['how-refunds-work'],
  'words are searched'
);
select is(
  (select count(*) from public.find_articles('{"q": "money invoice"}')), 0::bigint,
  'every word has to match'
);
select is(
  (select count(*) from public.find_articles('{"q": "money invoice"}', true)), 2::bigint,
  'or any of them, for the fallback'
);
select is(
  (select array_agg(slug order by slug) from public.find_articles(
    '{"audience": "business", "collection": "bookings"}')),
  array['cancel-a-booking', 'how-refunds-work', 'reserver-une-table'],
  'an audience takes articles for everyone and for it'
);
select is(
  (select count(*) from public.find_articles('{"audience": "business", "collection": "billing"}')),
  0::bigint,
  'and leaves out articles for another audience'
);
select is(
  (select array_agg(slug order by slug) from public.find_articles('{"locale": "en", "limit": 50}')),
  array['cancel-a-booking', 'how-refunds-work', 'read-your-invoice'],
  'a language takes articles in it, in a regional form of it, and in no particular one'
);
select is(
  (select array_agg(slug) from public.find_articles('{"fields": {"plan": "pro"}}')),
  array['how-refunds-work'],
  'custom fields'
);
select is(
  (select array_agg(slug) from public.find_articles(
    '{"articles": ["read-your-invoice", "cancel-a-booking"]}')),
  array['read-your-invoice', 'cancel-a-booking'],
  'pinned articles alone give those, in the order given'
);
select is(
  (select array_agg(slug) from public.find_articles(
    '{"articles": ["read-your-invoice"], "tags": {"any": ["cancellations"]}}')),
  array['read-your-invoice', 'cancel-a-booking', 'how-refunds-work'],
  'pinned articles come first, then what the rest of the filter picks'
);
select is(
  (select count(*) from public.find_articles('{"articles": ["refunds-draft"]}')), 0::bigint,
  'a draft cannot be pinned into view'
);
select is(
  (select count(*) from public.find_articles('{}')), 4::bigint,
  'an empty filter picks published articles, five at most by default'
);
select is(
  (select count(*) from public.find_articles('{"limit": 2}')), 2::bigint,
  'a limit'
);
select is(
  (select count(*) from public.find_articles('{"limit": 1000}')), 4::bigint,
  'a limit past fifty is held to fifty'
);
select throws_ok(
  $$ select * from public.find_articles('[]') $$,
  '22023', null,
  'a filter is an object'
);

-- A team member gets what a visitor would.
select tests.act_as('agent');
select is(
  (select count(*) from public.find_articles('{"tags": {"any": ["refunds"]}}')), 1::bigint,
  'a team member finds no drafts either'
);

-- Rules: the team reads them, admins write them.
select tests.act_as('admin');
select lives_ok(
  $$ insert into public.help_rules (id, name, url_match, url_value, filter) values
       ('e0000000-0000-4000-8000-000000000001', 'Bookings', 'matches', '/bookings/*',
        '{"collection": "bookings"}'),
       ('e0000000-0000-4000-8000-000000000002', 'Checkout', 'contains', 'checkout',
        '{"q": "payment failed", "limit": 3}') $$,
  'an admin adds rules'
);
select is(
  (select array_agg(name order by position) from public.help_rules),
  array['Bookings', 'Checkout'],
  'a new rule goes to the end'
);
select lives_ok(
  $$ select public.reorder_help_rules(array[
       'e0000000-0000-4000-8000-000000000002', 'e0000000-0000-4000-8000-000000000001']::uuid[]) $$,
  'an admin reorders them'
);
select is(
  (select array_agg(name order by position) from public.help_rules),
  array['Checkout', 'Bookings'],
  'in the order given'
);
select throws_ok(
  $$ insert into public.help_rules (name, url_match, url_value) values ('Bad', 'starts', '/x') $$,
  '23514', null,
  'a rule matches an address in one of three ways'
);

select tests.act_as('agent');
select is((select count(*) from public.help_rules), 2::bigint, 'an agent reads the rules');
select throws_ok(
  $$ insert into public.help_rules (name, url_match, url_value) values ('Mine', 'is', '/x') $$,
  '42501', null,
  'an agent cannot add one'
);
select is_empty(
  $$ update public.help_rules set name = 'Changed' returning id $$,
  'nor change one'
);

select tests.act_as('member');
select is((select count(*) from public.help_rules), 0::bigint, 'a contact sees no rules');

select tests.act_as_visitor();
select throws_ok(
  $$ select count(*) from public.help_rules $$,
  '42501', null,
  'and a visitor with no session cannot read them at all'
);

select * from finish();
rollback;
