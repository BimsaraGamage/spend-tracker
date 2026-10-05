-- The audit trail records every change to ledger data, and clients can
-- neither read nor alter it (NFR-SEC-5, DATA7).
begin;
create extension if not exists pgtap with schema extensions;
select plan(12);

insert into auth.users (id, email) values ('00000000-0000-4000-8000-00000000000a', 'a@example.test');

-- As user a: the walking-skeleton flow, then an edit and a soft delete.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000000a","role":"authenticated"}', true);
set local role authenticated;
insert into public.ledgers (id, name, base_currency, time_zone, created_by)
values ('10000000-0000-4000-8000-00000000000a', 'Personal', 'LKR', 'Asia/Colombo', '00000000-0000-4000-8000-00000000000a');
insert into public.accounts (id, ledger_id, name, currency) values ('20000000-0000-4000-8000-00000000000a', '10000000-0000-4000-8000-00000000000a', 'Cash', 'LKR');
insert into public.transactions (id, ledger_id, account_id, amount_minor, currency, occurred_on, created_by)
values ('30000000-0000-4000-8000-00000000000a', '10000000-0000-4000-8000-00000000000a', '20000000-0000-4000-8000-00000000000a', -1250, 'LKR', '2026-10-04', '00000000-0000-4000-8000-00000000000a');
update public.transactions set amount_minor = -1500 where id = '30000000-0000-4000-8000-00000000000a';
update public.transactions set deleted_at = now() where id = '30000000-0000-4000-8000-00000000000a';

-- Clients can't touch the audit trail.
select throws_ok($$ select count(*) from audit.events $$,
  '42501', null, 'signed-in users cannot read the audit trail');
select throws_ok($$ insert into audit.events (table_name, row_id, ledger_id, action)
  values ('transactions', '30000000-0000-4000-8000-00000000000a', '10000000-0000-4000-8000-00000000000a', 'insert') $$,
  '42501', null, 'signed-in users cannot write to the audit trail');
select throws_ok($$ update audit.events set actor = null $$,
  '42501', null, 'signed-in users cannot rewrite the audit trail');
select throws_ok($$ delete from audit.events $$,
  '42501', null, 'signed-in users cannot erase the audit trail');
reset role;

-- What was recorded (read as the database owner).
select bag_eq(
  $$ select table_name, action from audit.events $$,
  $$ values ('ledgers', 'insert'), ('ledger_members', 'insert'), ('accounts', 'insert'),
            ('transactions', 'insert'), ('transactions', 'update'), ('transactions', 'update') $$,
  'every change is recorded, including the automatic owner membership');
select results_eq($$ select distinct actor from audit.events $$, $$ values ('00000000-0000-4000-8000-00000000000a'::uuid) $$,
  'the signed-in user is recorded as the actor');
select is((select count(*) from audit.events where ledger_id <> '10000000-0000-4000-8000-00000000000a'), 0::bigint,
  'every event is attributed to its ledger');
select results_eq(
  $$ select (old_row ->> 'amount_minor')::bigint, (new_row ->> 'amount_minor')::bigint
     from audit.events
     where table_name = 'transactions' and action = 'update'
       and old_row ->> 'amount_minor' <> new_row ->> 'amount_minor' $$,
  $$ values (-1250::bigint, -1500::bigint) $$,
  'an update records the row before and after');

-- A change made without a signed-in user (for example a maintenance job).
select set_config('request.jwt.claims', '', true);
delete from public.transactions where id = '30000000-0000-4000-8000-00000000000a';
select results_eq($$ select actor, action from audit.events where action = 'delete' $$,
  $$ values (null::uuid, 'delete'::text) $$,
  'changes without a signed-in user are recorded without an actor');
select ok((select old_row is not null and new_row is null from audit.events where action = 'delete'),
  'a delete records the row as it was');

-- Synced tables hold ledger data, so each must record every change (DATA7).
create function pg_temp.unaudited_synced_tables()
returns bigint
language sql
as $$
  select count(*)
  from pg_publication_tables t
  where t.pubname = 'powersync'
    and not exists (
      select
      from pg_trigger tr
      where tr.tgrelid = format('%I.%I', t.schemaname, t.tablename)::regclass
        and tr.tgfoid = 'audit.record_change()'::regprocedure
        -- After each inserted, deleted and updated row: bits 1, 4, 8 and 16 set, 2 (before) not.
        and tr.tgtype & 31 = 29
    )
$$;
select is(pg_temp.unaudited_synced_tables(), 0::bigint,
  'every synced table records its changes in the audit trail');

-- The guard must be able to fail.
create table public.audit_probe (id uuid primary key);
alter publication powersync add table public.audit_probe;
select is(pg_temp.unaudited_synced_tables(), 1::bigint,
  'the audit guard detects a synced table without the audit trigger');
alter publication powersync drop table public.audit_probe;
drop table public.audit_probe;

select * from finish();
rollback;
