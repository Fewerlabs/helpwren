-- Saved replies (macros): text a team member puts into the reply box in one go, with
-- placeholders such as {contact.first_name} filled in as it goes in. A reply is either the
-- team's, for everyone, or personal, for its owner alone.

create table public.saved_replies (
  id         uuid primary key default gen_random_uuid(),
  title      text not null check (char_length(btrim(title)) between 1 and 80),
  body       text not null check (char_length(btrim(body)) between 1 and 5000),
  -- Typed after `/` in the reply box to find it. Lowercase words joined by hyphens.
  shortcut   text unique check (
    shortcut ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(shortcut) <= 40
  ),
  visibility text not null default 'team' check (visibility in ('team', 'personal')),
  -- Who a personal reply belongs to. A team reply belongs to nobody in particular.
  owner_id   uuid references public.agents on delete cascade,
  created_by uuid default auth.uid() references public.agents on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint saved_replies_owner_check check ((visibility = 'personal') = (owner_id is not null))
);

create index saved_replies_owner_id_idx on public.saved_replies (owner_id) where owner_id is not null;
create index saved_replies_created_by_idx on public.saved_replies (created_by);

create trigger saved_replies_touch before update on public.saved_replies
  for each row execute function private.touch_updated_at();

-- Every team member reads the team's replies and their own. Any of them may add one, as
-- themselves. A personal reply is changed only by its owner; a team reply by an admin or by
-- whoever wrote it, so a shared reply cannot be rewritten by anyone on the team, and its
-- author is never locked out of fixing it.
alter table public.saved_replies enable row level security;
revoke all on public.saved_replies from anon, authenticated;
grant select, insert, delete on public.saved_replies to authenticated;
-- Who wrote a reply stays who wrote it.
grant update (title, body, shortcut, visibility, owner_id) on public.saved_replies to authenticated;

create policy saved_replies_read on public.saved_replies for select to authenticated using (
  (select private.is_agent())
  and (visibility = 'team' or owner_id = (select auth.uid()))
);

create policy saved_replies_insert on public.saved_replies for insert to authenticated with check (
  (select private.is_agent())
  and created_by = (select auth.uid())
  and (visibility = 'team' or owner_id = (select auth.uid()))
);

create policy saved_replies_update on public.saved_replies for update to authenticated
  using (
    (select private.is_agent())
    and (
      owner_id = (select auth.uid())
      or (visibility = 'team' and ((select private.is_admin()) or created_by = (select auth.uid())))
    )
  )
  -- Making a reply personal makes it the changer's own, never someone else's.
  with check (
    (select private.is_agent())
    and (
      owner_id = (select auth.uid())
      or (visibility = 'team' and ((select private.is_admin()) or created_by = (select auth.uid())))
    )
  );

create policy saved_replies_delete on public.saved_replies for delete to authenticated using (
  (select private.is_agent())
  and (
    owner_id = (select auth.uid())
    or (visibility = 'team' and ((select private.is_admin()) or created_by = (select auth.uid())))
  )
);
