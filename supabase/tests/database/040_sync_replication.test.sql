-- The sync service can read the synced tables and nothing else
-- (ADR-0004, SYNC1, SYNC6).
begin;
create extension if not exists pgtap with schema extensions;
select plan(14);

-- Published tables that powersync_role can't read. Replication would fail on
-- them.
create function pg_temp.unreadable_published_tables()
returns bigint
language sql
as $$
  select count(*)
  from pg_publication_tables t
  where t.pubname = 'powersync'
    and not has_table_privilege('powersync_role', format('%I.%I', t.schemaname, t.tablename), 'select')
$$;

-- Table privileges powersync_role holds beyond reading published tables, in
-- the schemas that hold app data or sign-in data.
create function pg_temp.excess_sync_privileges()
returns bigint
language sql
as $$
  select count(*)
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  cross join unnest(array['select', 'insert', 'update', 'delete', 'truncate', 'references', 'trigger'])
    as p (privilege)
  where n.nspname in ('public', 'private', 'audit', 'auth')
    and c.relkind in ('r', 'p', 'v', 'm', 'f')
    and has_table_privilege('powersync_role', c.oid, p.privilege)
    and not (p.privilege = 'select' and exists (
      select
      from pg_publication_tables t
      where t.pubname = 'powersync' and t.schemaname = n.nspname and t.tablename = c.relname
    ))
$$;

-- Columns every synced table must publish (SYNC1). The ledgers table's own id
-- is its ledger id, so it has no ledger_id column.
create function pg_temp.missing_sync_columns()
returns bigint
language sql
as $$
  select count(*)
  from pg_publication_tables t
  cross join unnest(array['id', 'ledger_id', 'created_at', 'updated_at', 'deleted_at']) as required (column_name)
  where t.pubname = 'powersync'
    and not (t.schemaname = 'public' and t.tablename = 'ledgers' and required.column_name = 'ledger_id')
    and required.column_name <> all (t.attnames::text[])
$$;

-- The publication
select ok(exists (select from pg_publication where pubname = 'powersync'),
  'the powersync publication exists');
select ok((select not puballtables and pubinsert and pubupdate and pubdelete
           from pg_publication where pubname = 'powersync'),
  'the publication lists its tables, and publishes inserts, updates and deletes');
select set_eq(
  $$ select format('%I.%I', schemaname, tablename) from pg_publication_tables where pubname = 'powersync' $$,
  array['public.ledgers', 'public.ledger_members', 'public.accounts', 'public.transactions'],
  'exactly the ledger tables are published; internal tables such as audit.events are not (SYNC6)');
select is(pg_temp.missing_sync_columns(), 0::bigint,
  'every published table has the synced-table columns (SYNC1)');

-- The role
select ok((select rolreplication and rolbypassrls from pg_roles where rolname = 'powersync_role'),
  'the sync service role can stream changes and copy every published row');
select ok((select not (rolsuper or rolcreatedb or rolcreaterole) from pg_roles where rolname = 'powersync_role'),
  'the sync service role has no administrative powers');
select is((select count(*) from pg_auth_members where member = 'powersync_role'::regrole), 0::bigint,
  'the sync service role inherits no other role''s privileges');
select is(pg_temp.unreadable_published_tables(), 0::bigint,
  'the sync service role can read every published table');
select is(pg_temp.excess_sync_privileges(), 0::bigint,
  'the sync service role can read only published tables, and can change nothing');
select ok(not has_table_privilege('powersync_role', 'auth.users', 'select'),
  'the sync service role cannot read sign-in data');
select ok(not has_table_privilege('powersync_role', 'audit.events', 'select'),
  'the sync service role cannot read the audit trail');

-- Each guard must be able to fail.
create table public.sync_probe (id int);
alter publication powersync add table public.sync_probe;
select is(pg_temp.unreadable_published_tables(), 1::bigint,
  'the read guard detects a published table the sync service role cannot read');
select is(pg_temp.missing_sync_columns(), 4::bigint,
  'the shape guard detects a published table without the synced-table columns');
alter publication powersync drop table public.sync_probe;
drop table public.sync_probe;

grant insert on public.transactions to powersync_role;
select is(pg_temp.excess_sync_privileges(), 1::bigint,
  'the privilege guard detects a write privilege');
revoke insert on public.transactions from powersync_role;

select * from finish();
rollback;
