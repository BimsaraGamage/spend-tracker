-- Guards that apply to the whole database, not to one feature.
begin;
create extension if not exists pgtap with schema extensions;
select plan(8);

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

-- Functions in the internal schemas that a client role may execute.
-- Signed-in users may run only the helpers listed here, which RLS policies need.
create function pg_temp.callable_internal_functions(role_name text)
returns bigint
language sql
as $$
  select count(*)
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname in ('private', 'audit')
    and has_function_privilege(role_name, p.oid, 'execute')
    and (role_name <> 'authenticated' or p.oid::regprocedure::text <> all (array[]::text[]))
$$;

select is(pg_temp.tables_without_rls(), 0::bigint,
  'every table in the public schema has row level security enabled (SEC1)');
select is(pg_temp.callable_internal_functions('anon'), 0::bigint,
  'anonymous users cannot execute any internal function');
select is(pg_temp.callable_internal_functions('authenticated'), 0::bigint,
  'signed-in users can execute only allow-listed internal functions');

-- Each guard must be able to fail.
create table public.rls_probe (id int);
select is(pg_temp.tables_without_rls(), 1::bigint,
  'the RLS guard detects a table without row level security');
drop table public.rls_probe;

create function private.execute_probe() returns int language sql as 'select 1';
select is(pg_temp.callable_internal_functions('authenticated'), 1::bigint,
  'the function guard detects a helper whose execute right was not revoked');
drop function private.execute_probe();

select ok(not has_schema_privilege('anon', 'private', 'usage'),
  'anonymous users cannot use the private schema');
select ok(not has_schema_privilege('anon', 'audit', 'usage'),
  'anonymous users cannot use the audit schema');
select ok(not has_schema_privilege('authenticated', 'audit', 'usage'),
  'signed-in users cannot read the audit schema directly');

select * from finish();
rollback;
