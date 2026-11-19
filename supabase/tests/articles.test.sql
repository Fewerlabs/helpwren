begin;
\ir support/fixture.psql

select plan(36);

-- Two collections and three articles, made by the server so the tests start from known rows.
insert into public.collections (id, name, slug) values
  ('f0000000-0000-4000-8000-000000000001', 'Getting started', 'getting-started'),
  ('f0000000-0000-4000-8000-000000000002', 'Billing', 'billing');

insert into public.articles (id, collection_id, title, slug, summary, body, status) values
  ('f1000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-000000000001',
   'Install the widget', 'install-the-widget', 'Add the chat to your site.',
   '{"type": "doc", "content": [{"type": "paragraph", "content": [
      {"type": "text", "text": "Paste the snippet before the closing body tag."}]}]}',
   'published'),
  ('f1000000-0000-4000-8000-000000000002', 'f0000000-0000-4000-8000-000000000001',
   'Invite your team', 'invite-your-team', null, default, 'draft'),
  ('f1000000-0000-4000-8000-000000000003', null,
   'Loose notes', 'loose-notes', null, default, 'draft');

select is(
  (select array_agg(position order by slug) from public.articles
   where collection_id = 'f0000000-0000-4000-8000-000000000001'),
  array[1, 2],
  'each new article goes to the end of its collection'
);
select isnt(
  (select published_at from public.articles where slug = 'install-the-widget'), null,
  'publishing an article records when'
);

-- A visitor with no session.
select tests.act_as_visitor();
select is(
  (select array_agg(slug) from public.articles), array['install-the-widget'],
  'a visitor reads published articles and no drafts'
);
select throws_ok(
  $$ insert into public.articles (title, slug) values ('Spam', 'spam') $$, '42501', null,
  'a visitor cannot write an article'
);
select throws_ok(
  $$ update public.articles set title = 'Defaced' $$, '42501', null,
  'a visitor cannot change an article'
);
select throws_ok(
  $$ delete from public.articles $$, '42501', null, 'a visitor cannot remove an article'
);

-- A guest in the chat is signed in, and still not on the team.
select tests.act_as('guest_a');
select is(
  (select count(*) from public.articles), 1::bigint, 'a guest reads published articles only'
);
select throws_ok(
  $$ insert into public.articles (title, slug) values ('Spam', 'spam') $$, '42501', null,
  'a guest cannot write an article'
);
select lives_ok(
  $$ update public.articles set title = 'Defaced' $$,
  'a guest''s attempt to change an article is silently ignored'
);
select lives_ok(
  $$ delete from public.articles $$, 'a guest''s attempt to remove articles is silently ignored'
);

select tests.act_as('former_agent');
select is(
  (select count(*) from public.articles), 1::bigint,
  'a deactivated team member sees no more than a visitor does'
);

select tests.act_as('agent');
select is(
  (select count(*) from public.articles where title <> 'Defaced'), 3::bigint,
  'an agent reads every article, drafts included, and none was defaced or removed'
);
select lives_ok(
  $$ insert into public.articles (id, title, slug, author_id) values
       ('f1000000-0000-4000-8000-000000000004', 'Reset a password', 'reset-a-password',
        tests.uid('admin')) $$,
  'an agent writes a draft'
);
select is(
  (select author_id from public.articles where slug = 'reset-a-password'), tests.uid('agent'),
  'an article is recorded as written by whoever made it, whatever they sent'
);
select throws_ok(
  $$ update public.articles set status = 'published' where slug = 'reset-a-password' $$,
  '23514', null, 'an article cannot be published without a collection'
);
select throws_ok(
  $$ insert into public.articles (title, slug) values ('Again', 'install-the-widget') $$,
  '23505', null, 'two articles cannot share a slug'
);
select throws_ok(
  $$ insert into public.articles (title, slug) values ('Bad', 'Not A Slug') $$,
  '23514', null, 'a slug is lower case words joined by hyphens'
);
select lives_ok(
  $$ update public.articles set slug = 'invite-teammates' where slug = 'invite-your-team' $$,
  'a draft''s slug can change'
);
select throws_ok(
  $$ update public.articles set slug = 'moved' where slug = 'install-the-widget' $$,
  'HW409', null, 'a published article keeps its slug'
);

-- Times: only a change of words moves `updated_at`.
select tests.act_as_owner();
update public.articles set updated_at = '2020-01-01', published_at = '2020-01-01'
where slug = 'install-the-widget';
select tests.act_as('agent');
update public.articles set position = 5 where slug = 'install-the-widget';
select is(
  (select updated_at from public.articles where slug = 'install-the-widget'),
  '2020-01-01'::timestamptz, 'reordering an article does not count as changing it'
);
update public.articles set title = 'Install the chat widget' where slug = 'install-the-widget';
select isnt(
  (select updated_at from public.articles where slug = 'install-the-widget'),
  '2020-01-01'::timestamptz, 'changing its words does'
);
update public.articles set status = 'draft' where slug = 'install-the-widget';
update public.articles set status = 'published' where slug = 'install-the-widget';
select is(
  (select published_at from public.articles where slug = 'install-the-widget'),
  '2020-01-01'::timestamptz, 'publishing again keeps the day it was first published'
);

-- Order.
select lives_ok(
  $$ select public.reorder_articles(array[
       'f1000000-0000-4000-8000-000000000002', 'f1000000-0000-4000-8000-000000000001'
     ]::uuid[]) $$,
  'an agent puts a collection''s articles in a new order'
);
select is(
  (select array_agg(slug order by position) from public.articles
   where collection_id = 'f0000000-0000-4000-8000-000000000001'),
  array['invite-teammates', 'install-the-widget'],
  'each article takes the place it was given'
);
update public.articles set collection_id = 'f0000000-0000-4000-8000-000000000001'
where slug = 'loose-notes';
select is(
  (select position from public.articles where slug = 'loose-notes'), 3,
  'an article moved into a collection goes to its end'
);

select tests.act_as('guest_a');
select public.reorder_articles(array[
  'f1000000-0000-4000-8000-000000000001', 'f1000000-0000-4000-8000-000000000002'
]::uuid[]);
select tests.act_as('agent');
select is(
  (select array_agg(slug order by position) from public.articles
   where collection_id = 'f0000000-0000-4000-8000-000000000001' and position < 3),
  array['invite-teammates', 'install-the-widget'],
  'a guest''s attempt to reorder articles changes nothing'
);

-- What an article carries besides its words.
select lives_ok(
  $$ update public.articles
     set tags = '{refunds,ios}', visibility = 'in_app', featured = true,
         meta_title = 'Install the widget', meta_description = 'One snippet.',
         author_id = tests.uid('admin')
     where slug = 'install-the-widget' $$,
  'an agent sets tags, where it shows, a title for search engines, and who wrote it'
);
select is(
  (select author_id from public.articles where slug = 'install-the-widget'), tests.uid('admin'),
  'the author can be changed after the article is made'
);
select is(
  (select array_agg(slug) from public.search_articles('refund')), array['install-the-widget'],
  'an article is found by its tags'
);
select throws_ok(
  $$ update public.articles set visibility = 'secret' where slug = 'install-the-widget' $$,
  '23514', null, 'an article is shown on the help center and in the chat, or in the chat only'
);
select throws_ok(
  $$ update public.articles set tags = array_fill('x'::text, array[21])
     where slug = 'install-the-widget' $$,
  '23514', null, 'an article carries twenty tags at most'
);
select tests.act_as_visitor();
select is(
  (select visibility from public.articles where slug = 'install-the-widget'), 'in_app',
  'an article shown only in the chat can still be read by a visitor, who may be in the chat'
);
select tests.act_as('agent');

-- The byline: the author's name and photo travel with the article, for readers who cannot
-- read the team.
select is(
  (select author_name from public.articles where slug = 'install-the-widget'), 'Admin',
  'an article carries its author''s name'
);
select tests.act_as_owner();
update public.agents set name = 'Ada Admin', photo = 'https://example.test/ada.png'
where user_id = tests.uid('admin');
select tests.act_as_visitor();
select is(
  (select array[author_name, author_photo] from public.articles where slug = 'install-the-widget'),
  array['Ada Admin', 'https://example.test/ada.png'],
  'a visitor sees the author''s new name and photo once they change them'
);
select tests.act_as('agent');
update public.articles set author_id = null where slug = 'install-the-widget';
select is(
  (select author_name from public.articles where slug = 'install-the-widget'), null,
  'an article with no author names nobody'
);

select lives_ok(
  $$ delete from public.articles where slug = 'reset-a-password' $$, 'an agent removes an article'
);

select * from finish();
rollback;
