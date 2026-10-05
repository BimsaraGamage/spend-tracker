-- A ledger has one current budget per month, and a budget stays in its month
-- (FR-PLAN-3, D-166, DATA5).
begin;
create extension if not exists pgtap with schema extensions;
select plan(9);

insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-00000000000a', 'a@example.test'),
  ('00000000-0000-4000-8000-00000000000b', 'b@example.test');

-- Each user has a ledger (set up as the database owner).
insert into public.ledgers (id, name, base_currency, time_zone, created_by) values
  ('10000000-0000-4000-8000-00000000000a', 'A', 'LKR', 'Asia/Colombo', '00000000-0000-4000-8000-00000000000a'),
  ('10000000-0000-4000-8000-00000000000b', 'B', 'LKR', 'Asia/Colombo', '00000000-0000-4000-8000-00000000000b');

-- User a budgets for October.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000000a","role":"authenticated"}', true);
set local role authenticated;
select lives_ok($$ insert into public.monthly_budgets (id, ledger_id, month, amount_minor, currency, created_by)
  values ('a0000000-0000-4000-8000-0000000000a1', '10000000-0000-4000-8000-00000000000a', '2026-10', 300000, 'LKR', '00000000-0000-4000-8000-00000000000a') $$,
  'a member can set a month''s budget');
select throws_ok($$ insert into public.monthly_budgets (id, ledger_id, month, amount_minor, currency, created_by)
  values ('a0000000-0000-4000-8000-0000000000a2', '10000000-0000-4000-8000-00000000000a', '2026-10', 250000, 'LKR', '00000000-0000-4000-8000-00000000000a') $$,
  '23505', null, 'a month has only one current budget');
select lives_ok($$ update public.monthly_budgets set amount_minor = 250000 where id = 'a0000000-0000-4000-8000-0000000000a1' $$,
  'a budget''s amount can change');
select throws_ok($$ update public.monthly_budgets set month = '2026-11' where id = 'a0000000-0000-4000-8000-0000000000a1' $$,
  '23514', null, 'a budget stays in its month');
select throws_ok($$ insert into public.monthly_budgets (id, ledger_id, month, amount_minor, currency, created_by)
  values ('a0000000-0000-4000-8000-0000000000a3', '10000000-0000-4000-8000-00000000000a', '2026-13', 1, 'LKR', '00000000-0000-4000-8000-00000000000a') $$,
  '23514', null, 'a budget''s month must be a real month');
select throws_ok($$ insert into public.monthly_budgets (id, ledger_id, month, amount_minor, currency, created_by)
  values ('a0000000-0000-4000-8000-0000000000a4', '10000000-0000-4000-8000-00000000000a', '2026-11', 0, 'LKR', '00000000-0000-4000-8000-00000000000a') $$,
  '23514', null, 'a budget must be positive');

update public.monthly_budgets set deleted_at = now() where id = 'a0000000-0000-4000-8000-0000000000a1';
select lives_ok($$ insert into public.monthly_budgets (id, ledger_id, month, amount_minor, currency, created_by)
  values ('a0000000-0000-4000-8000-0000000000a5', '10000000-0000-4000-8000-00000000000a', '2026-10', 200000, 'LKR', '00000000-0000-4000-8000-00000000000a') $$,
  'a deleted budget can be replaced');
select throws_ok($$ update public.monthly_budgets set deleted_at = null where id = 'a0000000-0000-4000-8000-0000000000a1' $$,
  '23505', null, 'a deleted budget cannot come back beside its replacement');
reset role;

-- User b budgets for the same month in their own ledger.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000000b","role":"authenticated"}', true);
set local role authenticated;
select lives_ok($$ insert into public.monthly_budgets (id, ledger_id, month, amount_minor, currency, created_by)
  values ('a0000000-0000-4000-8000-0000000000b1', '10000000-0000-4000-8000-00000000000b', '2026-10', 100000, 'LKR', '00000000-0000-4000-8000-00000000000b') $$,
  'each ledger has its own budget for a month');
reset role;

select * from finish();
rollback;
