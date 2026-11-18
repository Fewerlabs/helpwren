-- Demo data for local development. Loaded by `pnpm db:reset`, never by a real install.
--
-- Sign in to the inbox as ada@example.com (admin) or sam@example.com (agent). The sign-in code
-- arrives in the local test mailbox, whose address `pnpm db:status` prints.

-- Auth users, written the way Supabase Auth writes them so that signing in works.
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, is_anonymous, created_at, updated_at,
  confirmation_token, recovery_token, email_change, email_change_token_new
)
select
  '00000000-0000-0000-0000-000000000000', id, 'authenticated', 'authenticated', email, '',
  case when email is null then null else now() end,
  case
    when email is null then '{}'::jsonb
    else '{"provider": "email", "providers": ["email"]}'::jsonb
  end,
  '{}', email is null, now(), now(), '', '', '', ''
from (
  values
    ('a0000000-0000-4000-8000-000000000001'::uuid, 'ada@example.com'),
    ('a0000000-0000-4000-8000-000000000002', 'sam@example.com'),
    ('c0000000-0000-4000-8000-000000000001', null),
    ('c0000000-0000-4000-8000-000000000002', null),
    ('c0000000-0000-4000-8000-000000000003', null),
    ('c0000000-0000-4000-8000-000000000004', null)
) as people (id, email);

insert into auth.identities (
  id, user_id, provider_id, provider, identity_data, created_at, updated_at
)
select
  gen_random_uuid(), id, id::text, 'email',
  jsonb_build_object('sub', id::text, 'email', email, 'email_verified', true), now(), now()
from auth.users
where email is not null;

insert into public.agents (user_id, name, email, role) values
  ('a0000000-0000-4000-8000-000000000001', 'Ada Okafor', 'ada@example.com', 'admin'),
  ('a0000000-0000-4000-8000-000000000002', 'Sam Rivera', 'sam@example.com', 'agent');

insert into public.contacts (id, kind, verified, external_id, org_id, org_name, name, email) values
  ('c0000000-0000-4000-8000-000000000001', 'guest', false, null, null, null, null, null),
  ('c0000000-0000-4000-8000-000000000002', 'guest', false, null, null, null,
   'Priya Nair', 'priya@example.org'),
  ('c0000000-0000-4000-8000-000000000003', 'user', true, 'user_1001', 'org_42', 'Northwind Studio',
   'Jonas Berg', 'jonas@northwind.example'),
  ('c0000000-0000-4000-8000-000000000004', 'user', true, 'user_1002', 'org_42', 'Northwind Studio',
   'Mei Tanaka', 'mei@northwind.example');

insert into public.conversations (
  id, contact_id, source, status, assignee_id, context,
  last_message_preview, last_message_at, unread_for_agents, unread_for_contact
) values
  ('d0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001', 'web',
   'open', null, '{"url": "https://example.com/pricing"}',
   'Do you offer a discount for charities?', now() - interval '4 minutes', 1, 0),
  ('d0000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000002', 'web',
   'pending', 'a0000000-0000-4000-8000-000000000002', '{"url": "https://example.com/contact"}',
   'Thanks, I will try that and let you know.', now() - interval '2 hours', 0, 0),
  ('d0000000-0000-4000-8000-000000000003', 'c0000000-0000-4000-8000-000000000003', 'web_app',
   'open', 'a0000000-0000-4000-8000-000000000001', '{"screen": "Invoices"}',
   'It is the March invoice, number 2031.', now() - interval '20 minutes', 1, 0),
  ('d0000000-0000-4000-8000-000000000004', 'c0000000-0000-4000-8000-000000000004', 'web_app',
   'resolved', 'a0000000-0000-4000-8000-000000000002', '{"screen": "Team"}',
   'All sorted. Thanks for the quick reply!', now() - interval '3 days', 0, 0);

insert into public.messages (conversation_id, sender_id, sender_role, body, created_at) values
  ('d0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001', 'guest',
   'Do you offer a discount for charities?', now() - interval '4 minutes'),

  ('d0000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000002', 'guest',
   'The contact form says my message is too long. Is there a limit?', now() - interval '3 hours'),
  ('d0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000002', 'agent',
   'There is: 2,000 characters. You can also send it here in parts.',
   now() - interval '150 minutes'),
  ('d0000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000002', 'guest',
   'Thanks, I will try that and let you know.', now() - interval '2 hours'),

  ('d0000000-0000-4000-8000-000000000003', 'c0000000-0000-4000-8000-000000000003', 'user',
   'One of our invoices shows the wrong billing address.', now() - interval '35 minutes'),
  ('d0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001', 'agent',
   'Sorry about that. Which invoice is it?', now() - interval '30 minutes'),
  ('d0000000-0000-4000-8000-000000000003', 'c0000000-0000-4000-8000-000000000003', 'user',
   'It is the March invoice, number 2031.', now() - interval '20 minutes'),

  ('d0000000-0000-4000-8000-000000000004', 'c0000000-0000-4000-8000-000000000004', 'user',
   'How do I add a colleague to our account?', now() - interval '3 days 1 hour'),
  ('d0000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000002', 'agent',
   'Go to Team, then Invite, and enter their email address.',
   now() - interval '3 days 30 minutes'),
  ('d0000000-0000-4000-8000-000000000004', 'c0000000-0000-4000-8000-000000000004', 'user',
   'All sorted. Thanks for the quick reply!', now() - interval '3 days');

-- Each message above counted as unread, and the last one reopened the resolved conversation.
-- Set the state the demo should open with.
update public.conversations set unread_for_contact = 0, unread_for_agents = case
  when id in ('d0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000003')
  then 1 else 0 end;
update public.conversations set status = 'resolved'
where id = 'd0000000-0000-4000-8000-000000000004';

-- One conversation is a ticket, assigned to Ada, so the demo shows tickets and assignment.
update public.conversations
set type = 'ticket', subject = 'Wrong billing address on an invoice', priority = 'high',
    assignee_id = 'a0000000-0000-4000-8000-000000000001'
where id = 'd0000000-0000-4000-8000-000000000003';

-- The resolved conversation was rated by its contact.
insert into public.conversation_ratings (conversation_id, contact_id, score, comment) values
  ('d0000000-0000-4000-8000-000000000004', 'c0000000-0000-4000-8000-000000000004', 5,
   'Sorted in minutes. Thank you!');

insert into public.notes (conversation_id, author_id, body) values
  ('d0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001',
   'Billing address was changed in February. Check whether the March invoice was issued first.');

insert into public.settings (key, value, is_public) values
  ('brand', '{"name": "Helpwren Demo"}', true),
  ('audiences', '["customer", "business"]', false),
  ('sources', '["web", "web_app"]', false),
  ('guest_details', '"email_or_phone"', true);

-- The knowledge base: three collections and a handful of articles, one of them a draft, so the
-- help center, its search and the editor all have something to show.
insert into public.collections (id, name, slug, description, icon) values
  ('f0000000-0000-4000-8000-000000000001', 'Getting started', 'getting-started',
   'Set up your account and add the chat to your site.', 'rocket-launch'),
  ('f0000000-0000-4000-8000-000000000002', 'Account and billing', 'account-and-billing',
   'Plans, invoices and who can sign in.', 'credit-card'),
  ('f0000000-0000-4000-8000-000000000003', 'Troubleshooting', 'troubleshooting',
   'What to check when something is not working.', 'wrench');

insert into public.articles (id, collection_id, title, slug, summary, status, author_id, body)
values
  ('f1000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-000000000001',
   'Add the chat to your website', 'add-the-chat-to-your-website',
   'Paste one snippet and the chat appears on every page.', 'published',
   'a0000000-0000-4000-8000-000000000001',
   $json${"type": "doc", "content": [
     {"type": "paragraph", "content": [
       {"type": "text", "text": "The chat is one small script. Add it once and it shows on every page that loads it."}]},
     {"type": "heading", "attrs": {"level": 2}, "content": [{"type": "text", "text": "Before you start"}]},
     {"type": "bulletList", "content": [
       {"type": "listItem", "content": [{"type": "paragraph", "content": [
         {"type": "text", "text": "You can edit your site's HTML, or its layout template."}]}]},
       {"type": "listItem", "content": [{"type": "paragraph", "content": [
         {"type": "text", "text": "You are signed in as an "},
         {"type": "text", "marks": [{"type": "bold"}], "text": "admin"},
         {"type": "text", "text": "."}]}]}]},
     {"type": "heading", "attrs": {"level": 2}, "content": [{"type": "text", "text": "Add the snippet"}]},
     {"type": "orderedList", "attrs": {"start": 1}, "content": [
       {"type": "listItem", "content": [{"type": "paragraph", "content": [
         {"type": "text", "text": "Open "},
         {"type": "text", "marks": [{"type": "bold"}], "text": "Settings, then Installation"},
         {"type": "text", "text": "."}]}]},
       {"type": "listItem", "content": [{"type": "paragraph", "content": [
         {"type": "text", "text": "Copy the snippet."}]}]},
       {"type": "listItem", "content": [{"type": "paragraph", "content": [
         {"type": "text", "text": "Paste it just before the closing "},
         {"type": "text", "marks": [{"type": "code"}], "text": "</body>"},
         {"type": "text", "text": " tag."}]}]}]},
     {"type": "codeBlock", "attrs": {"language": "html"}, "content": [
       {"type": "text", "text": "<script src=\"https://support.example.com/widget.js\" async></script>"}]},
     {"type": "callout", "attrs": {"tone": "tip"}, "content": [{"type": "paragraph", "content": [
       {"type": "text", "text": "Using a tag manager? Add the same snippet as a custom HTML tag that fires on every page."}]}]},
     {"type": "heading", "attrs": {"level": 2}, "content": [{"type": "text", "text": "Check it works"}]},
     {"type": "paragraph", "content": [
       {"type": "text", "text": "Reload your site. A round button appears in the bottom corner. Send a message and it arrives in your inbox."}]},
     {"type": "heading", "attrs": {"level": 3}, "content": [{"type": "text", "text": "If the button does not appear"}]},
     {"type": "paragraph", "content": [
       {"type": "text", "text": "See "},
       {"type": "text", "marks": [{"type": "link", "attrs": {"href": "/help/troubleshooting/the-chat-does-not-appear"}}], "text": "The chat does not appear"},
       {"type": "text", "text": "."}]}]}$json$),

  ('f1000000-0000-4000-8000-000000000002', 'f0000000-0000-4000-8000-000000000001',
   'Invite your team', 'invite-your-team',
   'Add the people who will answer, and choose who can change settings.', 'published',
   'a0000000-0000-4000-8000-000000000001',
   $json${"type": "doc", "content": [
     {"type": "paragraph", "content": [
       {"type": "text", "text": "Everyone who answers conversations needs their own sign-in. There is no limit on how many people you add."}]},
     {"type": "heading", "attrs": {"level": 2}, "content": [{"type": "text", "text": "Add someone"}]},
     {"type": "orderedList", "attrs": {"start": 1}, "content": [
       {"type": "listItem", "content": [{"type": "paragraph", "content": [
         {"type": "text", "text": "Open "},
         {"type": "text", "marks": [{"type": "bold"}], "text": "Settings, then Team"},
         {"type": "text", "text": "."}]}]},
       {"type": "listItem", "content": [{"type": "paragraph", "content": [
         {"type": "text", "text": "Choose "},
         {"type": "text", "marks": [{"type": "bold"}], "text": "Add team member"},
         {"type": "text", "text": " and enter their name and email address."}]}]},
       {"type": "listItem", "content": [{"type": "paragraph", "content": [
         {"type": "text", "text": "Tell them to sign in. A code is emailed to them each time."}]}]}]},
     {"type": "heading", "attrs": {"level": 2}, "content": [{"type": "text", "text": "Admins and agents"}]},
     {"type": "paragraph", "content": [
       {"type": "text", "text": "An agent answers conversations and writes articles. An admin can also change settings and the team."}]},
     {"type": "callout", "attrs": {"tone": "warning"}, "content": [{"type": "paragraph", "content": [
       {"type": "text", "text": "Keep at least two admins, so one of you can always get in."}]}]}]}$json$),

  ('f1000000-0000-4000-8000-000000000003', 'f0000000-0000-4000-8000-000000000001',
   'Make the chat match your brand', 'make-the-chat-match-your-brand',
   'Set your logo, colours and the words visitors read first.', 'published',
   'a0000000-0000-4000-8000-000000000002',
   $json${"type": "doc", "content": [
     {"type": "paragraph", "content": [
       {"type": "text", "text": "Visitors should feel they are talking to you, not to a tool. Everything they see can carry your brand."}]},
     {"type": "heading", "attrs": {"level": 2}, "content": [{"type": "text", "text": "Logo and colours"}]},
     {"type": "paragraph", "content": [
       {"type": "text", "text": "Open "},
       {"type": "text", "marks": [{"type": "bold"}], "text": "Settings, then Branding"},
       {"type": "text", "text": ". Upload a logo and pick a colour, or a gradient of two. The preview beside the form shows the result before you save."}]},
     {"type": "heading", "attrs": {"level": 2}, "content": [{"type": "text", "text": "Greeting and quick replies"}]},
     {"type": "paragraph", "content": [
       {"type": "text", "text": "On the Widget tab, write the greeting a visitor reads when the chat opens, and up to five replies they can send with one tap."}]},
     {"type": "blockquote", "content": [{"type": "paragraph", "content": [
       {"type": "text", "text": "Short greetings work best. Say who you are and how quickly you usually reply."}]}]}]}$json$),

  ('f1000000-0000-4000-8000-000000000004', 'f0000000-0000-4000-8000-000000000002',
   'Read your invoice', 'read-your-invoice',
   'What each line on an invoice means, and where to download it.', 'published',
   'a0000000-0000-4000-8000-000000000002',
   $json${"type": "doc", "content": [
     {"type": "paragraph", "content": [
       {"type": "text", "text": "An invoice is issued on the first day of each billing period and emailed to the billing contact."}]},
     {"type": "heading", "attrs": {"level": 2}, "content": [{"type": "text", "text": "Download an invoice"}]},
     {"type": "paragraph", "content": [
       {"type": "text", "text": "Open "},
       {"type": "text", "marks": [{"type": "bold"}], "text": "Billing, then Invoices"},
       {"type": "text", "text": " and choose the month. Invoices are PDF files."}]},
     {"type": "heading", "attrs": {"level": 2}, "content": [{"type": "text", "text": "Change the billing address"}]},
     {"type": "paragraph", "content": [
       {"type": "text", "text": "A new address applies to future invoices. To correct one already issued, start a chat and tell us its number."}]},
     {"type": "callout", "attrs": {"tone": "info"}, "content": [{"type": "paragraph", "content": [
       {"type": "text", "text": "Invoices are numbered in order and cannot be deleted, only corrected with a credit note."}]}]}]}$json$),

  ('f1000000-0000-4000-8000-000000000005', 'f0000000-0000-4000-8000-000000000002',
   'Change who can sign in', 'change-who-can-sign-in',
   'Deactivate someone who has left, or make a colleague an admin.', 'published',
   'a0000000-0000-4000-8000-000000000001',
   $json${"type": "doc", "content": [
     {"type": "paragraph", "content": [
       {"type": "text", "text": "Only admins change the team. Open "},
       {"type": "text", "marks": [{"type": "bold"}], "text": "Settings, then Team"},
       {"type": "text", "text": "."}]},
     {"type": "heading", "attrs": {"level": 2}, "content": [{"type": "text", "text": "When someone leaves"}]},
     {"type": "paragraph", "content": [
       {"type": "text", "text": "Choose "},
       {"type": "text", "marks": [{"type": "bold"}], "text": "Deactivate"},
       {"type": "text", "text": " beside their name. They lose access at once. Their replies and notes stay in every conversation."}]},
     {"type": "heading", "attrs": {"level": 2}, "content": [{"type": "text", "text": "Make someone an admin"}]},
     {"type": "paragraph", "content": [
       {"type": "text", "text": "Choose "},
       {"type": "text", "marks": [{"type": "bold"}], "text": "Make admin"},
       {"type": "text", "text": ". You cannot change your own role, so nobody locks themselves out by accident."}]}]}$json$),

  ('f1000000-0000-4000-8000-000000000006', 'f0000000-0000-4000-8000-000000000003',
   'The chat does not appear', 'the-chat-does-not-appear',
   'Three things to check when the button is missing from your site.', 'published',
   'a0000000-0000-4000-8000-000000000002',
   $json${"type": "doc", "content": [
     {"type": "paragraph", "content": [
       {"type": "text", "text": "Work through these in order. The first is the cause nine times in ten."}]},
     {"type": "heading", "attrs": {"level": 2}, "content": [{"type": "text", "text": "1. The site is not on the allowed list"}]},
     {"type": "paragraph", "content": [
       {"type": "text", "text": "Under "},
       {"type": "text", "marks": [{"type": "bold"}], "text": "Settings, then Installation"},
       {"type": "text", "text": ", check that your site's address is listed, for example "},
       {"type": "text", "marks": [{"type": "code"}], "text": "example.com"},
       {"type": "text", "text": " or "},
       {"type": "text", "marks": [{"type": "code"}], "text": "*.example.com"},
       {"type": "text", "text": ". An empty list allows every site."}]},
     {"type": "heading", "attrs": {"level": 2}, "content": [{"type": "text", "text": "2. The snippet is missing from the page"}]},
     {"type": "paragraph", "content": [
       {"type": "text", "text": "View the page's source and search for "},
       {"type": "text", "marks": [{"type": "code"}], "text": "widget.js"},
       {"type": "text", "text": ". If it is not there, the template you edited is not the one this page uses."}]},
     {"type": "heading", "attrs": {"level": 2}, "content": [{"type": "text", "text": "3. Something is blocking it"}]},
     {"type": "paragraph", "content": [
       {"type": "text", "text": "Ad blockers and strict content security policies can stop the script. Try a private window with extensions off."}]},
     {"type": "horizontalRule"},
     {"type": "paragraph", "content": [
       {"type": "text", "text": "Still stuck? Start a chat and tell us the address of the page."}]}]}$json$),

  ('f1000000-0000-4000-8000-000000000007', 'f0000000-0000-4000-8000-000000000003',
   'Messages arrive late', 'messages-arrive-late',
   'A draft about slow connections. Not published yet.', 'draft',
   'a0000000-0000-4000-8000-000000000001',
   $json${"type": "doc", "content": [
     {"type": "paragraph", "content": [
       {"type": "text", "text": "Messages are delivered live. If they arrive in bursts, the connection is being interrupted."}]}]}$json$);

insert into public.article_feedback (article_id, helpful) values
  ('f1000000-0000-4000-8000-000000000001', true),
  ('f1000000-0000-4000-8000-000000000001', true),
  ('f1000000-0000-4000-8000-000000000001', false),
  ('f1000000-0000-4000-8000-000000000006', true);
