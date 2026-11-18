begin;
\ir support/fixture.psql

select plan(4);

select is_empty(
  $$
    select c.relname from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity
  $$,
  'every table in the public schema has Row Level Security switched on'
);

select is_empty(
  $$
    select c.relname from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r'
      and not exists (select 1 from pg_policy p where p.polrelid = c.oid)
  $$,
  'every table in the public schema has at least one policy'
);

select is_empty(
  $$
    select table_name, privilege_type from information_schema.role_table_grants
    where table_schema = 'public' and grantee = 'anon'
      and (table_name, privilege_type) <> ('settings', 'SELECT')
  $$,
  'visitors with no session are granted nothing except reading settings'
);

select is_empty(
  $$
    select p.proname from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prosecdef
  $$,
  'no security definer function is exposed through the public schema'
);

select * from finish();
rollback;
