-- Each contact with how many conversations they have and when they were last active, for the
-- dashboard's list of users. It runs with the caller's own access (security_invoker), so the
-- rules on `contacts` and `conversations` decide what anyone sees through it: agents see
-- everyone, and a contact sees only themselves.
create view public.contact_summaries with (security_invoker = true) as
select
  k.id,
  k.kind,
  k.verified,
  k.name,
  k.email,
  k.phone,
  k.org_name,
  k.created_at,
  count(c.id)::integer as conversation_count,
  max(c.last_message_at) as last_active_at
from public.contacts k
left join public.conversations c on c.contact_id = k.id
group by k.id;

revoke all on public.contact_summaries from anon, authenticated;
grant select on public.contact_summaries to authenticated;
