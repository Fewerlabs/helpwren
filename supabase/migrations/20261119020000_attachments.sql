-- Files sent with a message. The files live in a private storage bucket, one folder per
-- conversation, and each message lists the ones sent with it.

-- Up to this many files a message, each up to 10 MB. The client library checks the same limits
-- before uploading, so a person is told at once.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'attachments', 'attachments', false, 10485760,
  array[
    'image/png', 'image/jpeg', 'image/webp', 'image/gif',
    'application/pdf', 'text/plain', 'text/csv',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
on conflict (id) do nothing;

-- A file is read by whoever may read its conversation: the lookup only finds the conversation
-- if the caller may, so this inherits conversations_read. The first part of a file's path is
-- its conversation's id.
create policy attachments_read on storage.objects for select to authenticated using (
  bucket_id = 'attachments'
  and exists (
    select 1 from public.conversations c
    where c.id::text = (storage.foldername(name))[1]
  )
);

-- A file is added by the conversation's own contact, or by an agent. Nobody changes or removes
-- one, as nobody edits a message.
create policy attachments_insert on storage.objects for insert to authenticated with check (
  bucket_id = 'attachments'
  and exists (
    select 1 from public.conversations c
    where c.id::text = (storage.foldername(name))[1]
      and (c.contact_id = (select auth.uid()) or (select private.is_agent()))
  )
);

-- What was sent with a message: a list of { path, name, type, size }.
alter table public.messages
  add column attachments jsonb not null default '[]',
  add constraint messages_attachments_list check (
    jsonb_typeof(attachments) = 'array' and jsonb_array_length(attachments) <= 5
  ),
  -- A message says something or carries something.
  add constraint messages_not_empty check (
    body is not null or jsonb_array_length(attachments) > 0
  );

-- The sender names the files; this checks each one is really there, in this conversation's own
-- folder, and takes its type and size from the stored file and not from what the sender said.
-- Runs as its owner, because the sender may not read storage's own tables directly.
create function private.check_attachments() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  given jsonb;
  stored record;
  checked jsonb := '[]';
begin
  if jsonb_typeof(new.attachments) is distinct from 'array' then
    return new;
  end if;

  for given in select * from jsonb_array_elements(new.attachments) loop
    select o.name, o.metadata into stored
    from storage.objects o
    where o.bucket_id = 'attachments'
      and o.name = given ->> 'path'
      and o.name like new.conversation_id::text || '/%';

    if not found then
      raise exception 'An attachment is not a file in this conversation.'
        using errcode = '23514';
    end if;

    checked := checked || jsonb_build_object(
      'path', stored.name,
      'name', left(coalesce(nullif(given ->> 'name', ''), 'file'), 200),
      'type', coalesce(stored.metadata ->> 'mimetype', 'application/octet-stream'),
      'size', coalesce((stored.metadata ->> 'size')::bigint, 0)
    );
  end loop;

  new.attachments := checked;
  return new;
end;
$$;

create trigger messages_check_attachments before insert on public.messages
  for each row execute function private.check_attachments();

-- The preview shown in lists says what was sent when there are no words to show.
create or replace function private.apply_message_to_conversation() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  from_contact boolean := new.sender_role in ('guest', 'user');
  files integer := jsonb_array_length(new.attachments);
begin
  update public.conversations set
    last_message_preview = left(
      coalesce(
        new.body,
        case when files = 1 then 'Sent a file: ' || (new.attachments -> 0 ->> 'name')
             else 'Sent ' || files || ' files' end
      ),
      140
    ),
    last_message_at = new.created_at,
    unread_for_agents = unread_for_agents + (case when from_contact then 1 else 0 end),
    unread_for_contact = unread_for_contact + (case when new.sender_role = 'agent' then 1 else 0 end),
    status = case when from_contact and status = 'resolved' then 'open' else status end
  where id = new.conversation_id;
  return null;
end;
$$;
