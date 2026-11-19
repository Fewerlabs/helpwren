begin;
\ir support/fixture.psql

select plan(9);

insert into public.collections (id, name, slug) values
  ('f0000000-0000-4000-8000-000000000001', 'Getting started', 'getting-started');

insert into public.articles (collection_id, title, slug, summary, body, status) values
  ('f0000000-0000-4000-8000-000000000001', 'Install the widget', 'install-the-widget',
   'Add the chat to your site.',
   '{"type": "doc", "content": [{"type": "paragraph", "content": [
      {"type": "text", "text": "Paste the snippet before the closing body tag."}]}]}',
   'published'),
  ('f0000000-0000-4000-8000-000000000001', 'Change your colours', 'change-your-colours',
   'Make the widget match your brand.',
   '{"type": "doc", "content": [{"type": "heading", "attrs": {"level": 2}, "content": [
      {"type": "text", "text": "Pick an accent"}]}]}',
   'published'),
  ('f0000000-0000-4000-8000-000000000001', 'Installing on mobile', 'installing-on-mobile',
   null, default, 'draft');

select tests.act_as_visitor();
select is(
  (select array_agg(slug) from public.search_articles('install')),
  array['install-the-widget'],
  'a visitor finds a published article by a word in its title, and no drafts'
);
select is(
  (select array_agg(slug) from public.search_articles('instal')),
  array['install-the-widget'],
  'a word still being typed matches from its start'
);
select is(
  (select array_agg(slug) from public.search_articles('snippet')),
  array['install-the-widget'],
  'the text of the body is searched'
);
select is(
  (select array_agg(slug) from public.search_articles('brand')),
  array['change-your-colours'],
  'the summary is searched'
);
select is(
  (select (array_agg(slug))[1] from public.search_articles('widget')),
  'install-the-widget',
  'a match in the title ranks above one in the summary'
);
select is(
  (select count(*) from public.search_articles('paragraph')), 0::bigint,
  'the names of the body''s parts are not searched, only its words'
);
select is(
  (select count(*) from public.search_articles('widget & | !! ''')), 2::bigint,
  'punctuation in the search is ignored'
);
select is(
  (select count(*) from public.search_articles('   ')), 0::bigint,
  'an empty search finds nothing'
);

select tests.act_as('agent');
select is(
  (select count(*) from public.search_articles('install')), 2::bigint,
  'an agent finds drafts too'
);

select * from finish();
rollback;
