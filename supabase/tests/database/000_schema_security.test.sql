-- Guards that apply to the whole database, not to one feature.
begin;
create extension if not exists pgtap with schema extensions;
select plan(6);

-- SEC1: every table the API can reach must have row level security.
create function pg_temp.tables_without_rls()
returns bigint
language sql
as $$
  select count(*)
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind in ('r', 'p') and not c.relrowsecurity
$$;

select is(pg_temp.tables_without_rls(), 0::bigint,
  'every table in the public schema has row level security enabled (SEC1)');

-- The check above must be able to fail: a table without RLS is detected.
create table public.rls_probe (id int);
select is(pg_temp.tables_without_rls(), 1::bigint,
  'the RLS guard detects a table without row level security');
drop table public.rls_probe;

select ok(not has_schema_privilege('anon', 'private', 'usage'),
  'anonymous users cannot use the private schema');
select ok(not has_schema_privilege('anon', 'audit', 'usage'),
  'anonymous users cannot use the audit schema');
select ok(not has_schema_privilege('authenticated', 'audit', 'usage'),
  'signed-in users cannot read the audit schema directly');
select ok(not has_function_privilege('authenticated', 'private.set_updated_at()', 'execute'),
  'helper functions are not executable unless granted explicitly');

select * from finish();
rollback;
