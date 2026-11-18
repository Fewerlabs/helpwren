-- Core tables: the people who chat, the support team, conversations, messages, internal notes
-- and settings. Access rules are in the next migration.

-- Everyone who chats: guests and the product's users. A contact is a Supabase Auth user, so
-- `id` equals `auth.uid()` for that person's session.
create table public.contacts (
  id          uuid primary key references auth.users on delete cascade,
  kind        text not null default 'guest' check (kind in ('guest', 'user')),
  -- True once an identity adapter has confirmed who this is. Only verified contacts share
  -- conversations with their organisation.
  verified    boolean not null default false,
  audience    text,
  attributes  jsonb not null default '{}',
  -- The host product's own id for this user. Null for guests.
  external_id text unique,
  org_id      text,
  org_name    text,
  name        text,
  email       text,
  created_at  timestamptz not null default now()
);

create index contacts_org_id_idx on public.contacts (org_id) where org_id is not null;

-- Support team members.
create table public.agents (
  user_id    uuid primary key references auth.users on delete cascade,
  name       text not null,
  email      text not null,
  role       text not null default 'agent' check (role in ('admin', 'agent')),
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.conversations (
  id                   uuid primary key default gen_random_uuid(),
  contact_id           uuid not null references public.contacts,
  -- Copied from the contact when the conversation is created, if the contact is verified.
  org_id               text,
  type                 text not null default 'chat' check (type in ('chat', 'ticket')),
  status               text not null default 'open'
    check (status in ('open', 'pending', 'resolved', 'closed')),
  ticket_number        bigint unique,
  subject              text,
  priority             text not null default 'normal' check (priority in ('low', 'normal', 'high')),
  category             text,
  assignee_id          uuid references public.agents,
  -- A source from settings, for example 'web'.
  source               text not null,
  -- Platform, app version, screen and page URL, captured when the chat opens.
  context              jsonb not null default '{}',
  last_message_preview text,
  last_message_at      timestamptz,
  unread_for_contact   integer not null default 0,
  unread_for_agents    integer not null default 0,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index conversations_contact_id_idx on public.conversations (contact_id);
create index conversations_org_id_idx on public.conversations (org_id) where org_id is not null;
create index conversations_assignee_id_idx on public.conversations (assignee_id);
create index conversations_last_message_at_idx on public.conversations (last_message_at desc);

create table public.messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations on delete cascade,
  -- The contact or agent who sent it. Not a foreign key, because it can be either.
  sender_id       uuid not null,
  sender_role     text not null check (sender_role in ('guest', 'user', 'agent', 'system')),
  body            text,
  channel         text not null default 'chat' check (channel in ('chat', 'email')),
  created_at      timestamptz not null default now()
);

create index messages_conversation_id_created_at_idx
  on public.messages (conversation_id, created_at);

-- Internal agent notes. A separate table, so no access rule can ever show one to a contact.
create table public.notes (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations on delete cascade,
  author_id       uuid not null references public.agents,
  body            text not null,
  created_at      timestamptz not null default now()
);

create index notes_conversation_id_idx on public.notes (conversation_id);
create index notes_author_id_idx on public.notes (author_id);

-- Install settings, so nothing about the host product is hard-coded.
create table public.settings (
  key        text primary key,
  value      jsonb not null,
  -- Public settings (brand name, colours) are readable by anyone. The rest are for agents.
  is_public  boolean not null default false,
  updated_at timestamptz not null default now()
);
