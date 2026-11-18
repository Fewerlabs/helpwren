begin;
\ir support/fixture.psql

select plan(18);

insert into public.collections (id, name, slug) values
  ('f0000000-0000-4000-8000-000000000001', 'Getting started', 'getting-started'),
  ('f0000000-0000-4000-8000-000000000002', 'Billing', 'billing'),
  ('f0000000-0000-4000-8000-000000000003', 'Empty', 'empty');

insert into public.articles (collection_id, title, slug, status) values
  ('f0000000-0000-4000-8000-000000000001', 'Install the widget', 'install-the-widget', 'published'),
  ('f0000000-0000-4000-8000-000000000002', 'Read an invoice', 'read-an-invoice', 'draft');

select is(
  (select array_agg(slug order by position) from public.collections),
  array['getting-started', 'billing', 'empty'],
  'each new collection goes to the end'
);

select tests.act_as_visitor();
select is(
  (select array_agg(slug) from public.collections), array['getting-started'],
  'a visitor sees only collections with a published article'
);
select throws_ok(
  $$ insert into public.collections (name, slug) values ('Spam', 'spam') $$, '42501', null,
  'a visitor cannot make a collection'
);
select throws_ok(
  $$ delete from public.collections $$, '42501', null, 'a visitor cannot remove a collection'
);

select tests.act_as('guest_a');
select is(
  (select count(*) from public.collections), 1::bigint,
  'a guest sees only collections with a published article'
);
select throws_ok(
  $$ insert into public.collections (name, slug) values ('Spam', 'spam') $$, '42501', null,
  'a guest cannot make a collection'
);
select lives_ok(
  $$ update public.collections set name = 'Defaced' $$,
  'a guest''s attempt to rename collections is silently ignored'
);
select public.reorder_collections(array[
  'f0000000-0000-4000-8000-000000000003', 'f0000000-0000-4000-8000-000000000001'
]::uuid[]);

select tests.act_as('agent');
select is(
  (select array_agg(name order by position) from public.collections),
  array['Getting started', 'Billing', 'Empty'],
  'an agent sees every collection, and a guest renamed and reordered none'
);
select lives_ok(
  $$ insert into public.collections (name, slug, description, icon)
     values ('Account', 'account', 'Your profile and sign-in.', 'user') $$,
  'an agent makes a collection'
);
select throws_ok(
  $$ insert into public.collections (name, slug) values ('Again', 'billing') $$, '23505', null,
  'two collections cannot share a slug'
);
select throws_ok(
  $$ insert into public.collections (name, slug) values ('Search', 'search') $$, '23514', null,
  'a collection cannot take the address of the search page'
);
select lives_ok(
  $$ update public.collections set slug = 'invoices' where slug = 'billing' $$,
  'a collection with no published articles can change its slug'
);
select throws_ok(
  $$ update public.collections set slug = 'start' where slug = 'getting-started' $$,
  'HW409', null, 'a collection with published articles keeps its slug'
);
select lives_ok(
  $$ update public.collections set name = 'Start here' where slug = 'getting-started' $$,
  'and can still be renamed'
);
select lives_ok(
  $$ select public.reorder_collections(array[
       'f0000000-0000-4000-8000-000000000002', 'f0000000-0000-4000-8000-000000000001'
     ]::uuid[]) $$,
  'an agent puts the collections in a new order'
);
select is(
  (select array_agg(slug order by position) from public.collections where position < 3),
  array['invoices', 'getting-started'],
  'each collection takes the place it was given'
);
select throws_ok(
  $$ delete from public.collections where slug = 'getting-started' $$, '23503', null,
  'a collection cannot be removed while it holds articles'
);
select lives_ok(
  $$ delete from public.collections where slug = 'empty' $$, 'an empty collection can be removed'
);

select * from finish();
rollback;
