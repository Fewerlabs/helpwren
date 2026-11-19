-- Says outright what the missing grants already ensure: nobody signed in reads or writes the
-- email queue. Every table states its rule in a policy, so that a grant added by mistake later
-- still opens nothing.
create policy email_queue_server_only on public.email_queue for all to authenticated
  using (false)
  with check (false);
