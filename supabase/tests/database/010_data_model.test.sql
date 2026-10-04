-- The data model enforces its own rules (DATA5): these run as the database
-- owner, so row level security isn't involved here (see 020_access_rules).
begin;
create extension if not exists pgtap with schema extensions;
select plan(14);

-- Fixed, readable IDs: users ...a/...b, ledgers 1..., accounts 2..., transactions 3...
insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-00000000000a', 'owner@example.test'),
  ('00000000-0000-4000-8000-00000000000b', 'other@example.test');

insert into public.ledgers (id, name, base_currency, time_zone, created_by) values
  ('10000000-0000-4000-8000-00000000000a', 'Personal', 'LKR', 'Asia/Colombo', '00000000-0000-4000-8000-00000000000a'),
  ('10000000-0000-4000-8000-00000000000b', 'Other',    'USD', 'UTC',          '00000000-0000-4000-8000-00000000000b');

insert into public.accounts (id, ledger_id, name, currency) values
  ('20000000-0000-4000-8000-00000000000a', '10000000-0000-4000-8000-00000000000a', 'Cash', 'LKR'),
  ('20000000-0000-4000-8000-00000000000b', '10000000-0000-4000-8000-00000000000b', 'Bank', 'USD');

select results_eq(
  $$ select user_id, role from public.ledger_members
     where ledger_id = '10000000-0000-4000-8000-00000000000a' $$,
  $$ values ('00000000-0000-4000-8000-00000000000a'::uuid, 'owner'::text) $$,
  'the creator of a ledger becomes its owner');

select lives_ok(
  $$ insert into public.transactions (id, ledger_id, account_id, amount_minor, currency, occurred_on, created_by)
     values ('30000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-00000000000a',
             '20000000-0000-4000-8000-00000000000a', -1250, 'LKR', '2026-10-04',
             '00000000-0000-4000-8000-00000000000a') $$,
  'a valid transaction is accepted');

select lives_ok(
  $$ insert into public.transactions (id, ledger_id, account_id, amount_minor, currency, occurred_on, created_by)
     values ('30000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-00000000000a',
             '20000000-0000-4000-8000-00000000000a', 9007199254740991, 'LKR', '2026-10-04',
             '00000000-0000-4000-8000-00000000000a') $$,
  'the largest safe-integer amount is accepted');

select throws_ok(
  $$ insert into public.transactions (id, ledger_id, account_id, amount_minor, currency, occurred_on, created_by)
     values ('30000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-00000000000a',
             '20000000-0000-4000-8000-00000000000a', 500, 'USD', '2026-10-04',
             '00000000-0000-4000-8000-00000000000a') $$,
  '23503', null, 'a transaction must use its account''s currency');

select throws_ok(
  $$ insert into public.transactions (id, ledger_id, account_id, amount_minor, currency, occurred_on, created_by)
     values ('30000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-00000000000a',
             '20000000-0000-4000-8000-00000000000b', 500, 'USD', '2026-10-04',
             '00000000-0000-4000-8000-00000000000a') $$,
  '23503', null, 'a transaction cannot use another ledger''s account');

select throws_ok(
  $$ insert into public.transactions (id, ledger_id, account_id, amount_minor, currency, occurred_on, created_by)
     values ('30000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-00000000000a',
             '20000000-0000-4000-8000-00000000000a', 9007199254740992, 'LKR', '2026-10-04',
             '00000000-0000-4000-8000-00000000000a') $$,
  '23514', null, 'amounts beyond the safe-integer range are rejected');

select throws_ok(
  $$ insert into public.ledgers (id, name, base_currency, time_zone, created_by)
     values ('10000000-0000-4000-8000-0000000000c1', 'Bad', 'lkr', 'UTC', '00000000-0000-4000-8000-00000000000a') $$,
  '23514', null, 'currency codes must be three uppercase letters');

select throws_ok(
  $$ insert into public.ledgers (id, name, base_currency, time_zone, created_by)
     values ('10000000-0000-4000-8000-0000000000c2', 'Bad', 'LKR', 'Mars/Olympus_Mons', '00000000-0000-4000-8000-00000000000a') $$,
  '22023', null, 'an unknown time zone is rejected');

select throws_ok(
  $$ insert into public.ledgers (id, name, base_currency, time_zone, created_by)
     values ('10000000-0000-4000-8000-0000000000c3', '', 'LKR', 'UTC', '00000000-0000-4000-8000-00000000000a') $$,
  '23514', null, 'names cannot be empty');

select throws_ok(
  $$ update public.transactions set ledger_id = '10000000-0000-4000-8000-00000000000b'
     where id = '30000000-0000-4000-8000-000000000001' $$,
  '23514', null, 'a transaction cannot move to another ledger');

select throws_ok(
  $$ update public.accounts set currency = 'EUR' where id = '20000000-0000-4000-8000-00000000000a' $$,
  '23514', null, 'an account''s currency can never change');

update public.transactions set description = 'Lunch', updated_at = '2000-01-01'
where id = '30000000-0000-4000-8000-000000000001';
select is(
  (select updated_at from public.transactions where id = '30000000-0000-4000-8000-000000000001'),
  now(), 'updated_at is set by the database on every update');

select throws_ok(
  $$ insert into public.ledger_members (id, ledger_id, user_id, role)
     values ('40000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-00000000000a',
             '00000000-0000-4000-8000-00000000000a', 'editor') $$,
  '23505', null, 'a user has at most one membership per ledger');

select throws_ok(
  $$ insert into public.ledger_members (id, ledger_id, user_id, role)
     values ('40000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-00000000000a',
             '00000000-0000-4000-8000-00000000000b', 'admin') $$,
  '23514', null, 'membership roles are owner, editor or viewer');

select * from finish();
rollback;
