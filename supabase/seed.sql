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

insert into public.notes (conversation_id, author_id, body) values
  ('d0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001',
   'Billing address was changed in February. Check whether the March invoice was issued first.');

insert into public.settings (key, value, is_public) values
  ('brand', '{"name": "Helpwren Demo"}', true),
  ('audiences', '["customer", "business"]', false),
  ('sources', '["web", "web_app"]', false),
  ('guest_details', '"email_or_phone"', true);
