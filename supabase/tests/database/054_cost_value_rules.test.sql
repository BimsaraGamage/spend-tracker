-- Cost planning amounts are positive, in the ledger's base currency and in
-- real months, and the base currency is locked once the ledger has costs
-- (FR-PLAN-4, AC-05, D-172, D-176, DATA1–2).
begin;
create extension if not exists pgtap with schema extensions;
select plan(17);

insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-00000000000a', 'a@example.test'),
  ('00000000-0000-4000-8000-00000000000b', 'b@example.test');

-- User a has a ledger in rupees with a cost type, and an empty ledger (set up
-- as the database owner).
insert into public.ledgers (id, name, base_currency, time_zone, created_by) values
  ('10000000-0000-4000-8000-00000000000a', 'Personal', 'LKR', 'Asia/Colombo', '00000000-0000-4000-8000-00000000000a'),
  ('10000000-0000-4000-8000-0000000000a2', 'Travel', 'LKR', 'Asia/Colombo', '00000000-0000-4000-8000-00000000000a');
insert into public.cost_types (id, ledger_id, name, created_by) values
  ('60000000-0000-4000-8000-00000000000a', '10000000-0000-4000-8000-00000000000a', 'Food', '00000000-0000-4000-8000-00000000000a');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000000a","role":"authenticated"}', true);
set local role authenticated;

-- Amounts
select throws_ok($$ insert into public.estimated_costs (id, ledger_id, month, cost_type_id, amount_minor, currency, created_by)
  values ('70000000-0000-4000-8000-0000000000a1', '10000000-0000-4000-8000-00000000000a', '2026-10', '60000000-0000-4000-8000-00000000000a', 0, 'LKR', '00000000-0000-4000-8000-00000000000a') $$,
  '23514', null, 'an estimated cost must be positive');
select throws_ok($$ insert into public.actual_costs (id, ledger_id, month, cost_type_id, amount_minor, currency, date, created_by)
  values ('80000000-0000-4000-8000-0000000000a1', '10000000-0000-4000-8000-00000000000a', '2026-10', '60000000-0000-4000-8000-00000000000a', -5000, 'LKR', '2026-10-04', '00000000-0000-4000-8000-00000000000a') $$,
  '23514', null, 'an actual cost cannot be negative: a refund will reduce the expense it refunds');
select throws_ok($$ insert into public.fixed_obligations (id, ledger_id, month, cost_type_id, amount_minor, currency, due_day, created_by)
  values ('90000000-0000-4000-8000-0000000000a1', '10000000-0000-4000-8000-00000000000a', '2026-10', '60000000-0000-4000-8000-00000000000a', 0, 'LKR', 1, '00000000-0000-4000-8000-00000000000a') $$,
  '23514', null, 'a fixed cost must be positive');
select lives_ok($$ insert into public.actual_costs (id, ledger_id, month, cost_type_id, amount_minor, currency, date, created_by)
  values ('80000000-0000-4000-8000-0000000000a2', '10000000-0000-4000-8000-00000000000a', '2026-10', '60000000-0000-4000-8000-00000000000a', 5000, 'LKR', '2026-10-04', '00000000-0000-4000-8000-00000000000a') $$,
  'a positive cost in the base currency is accepted');

-- Currencies
select throws_ok($$ insert into public.estimated_costs (id, ledger_id, month, cost_type_id, amount_minor, currency, created_by)
  values ('70000000-0000-4000-8000-0000000000a2', '10000000-0000-4000-8000-00000000000a', '2026-10', '60000000-0000-4000-8000-00000000000a', 100, 'USD', '00000000-0000-4000-8000-00000000000a') $$,
  '23503', null, 'an estimated cost must be in the ledger''s base currency');
select throws_ok($$ insert into public.actual_costs (id, ledger_id, month, cost_type_id, amount_minor, currency, date, created_by)
  values ('80000000-0000-4000-8000-0000000000a3', '10000000-0000-4000-8000-00000000000a', '2026-10', '60000000-0000-4000-8000-00000000000a', 100, 'USD', '2026-10-04', '00000000-0000-4000-8000-00000000000a') $$,
  '23503', null, 'an actual cost must be in the ledger''s base currency');
select throws_ok($$ insert into public.fixed_obligations (id, ledger_id, month, cost_type_id, amount_minor, currency, due_day, created_by)
  values ('90000000-0000-4000-8000-0000000000a2', '10000000-0000-4000-8000-00000000000a', '2026-10', '60000000-0000-4000-8000-00000000000a', 100, 'USD', 1, '00000000-0000-4000-8000-00000000000a') $$,
  '23503', null, 'a fixed cost must be in the ledger''s base currency');
select throws_ok($$ insert into public.monthly_budgets (id, ledger_id, month, amount_minor, currency, created_by)
  values ('a0000000-0000-4000-8000-0000000000a1', '10000000-0000-4000-8000-00000000000a', '2026-10', 100, 'USD', '00000000-0000-4000-8000-00000000000a') $$,
  '23503', null, 'a budget must be in the ledger''s base currency');
select throws_ok($$ update public.actual_costs set currency = 'USD' where id = '80000000-0000-4000-8000-0000000000a2' $$,
  '23503', null, 'a cost cannot change to another currency');

-- Months
select throws_ok($$ insert into public.estimated_costs (id, ledger_id, month, cost_type_id, amount_minor, currency, created_by)
  values ('70000000-0000-4000-8000-0000000000a3', '10000000-0000-4000-8000-00000000000a', '2026-13', '60000000-0000-4000-8000-00000000000a', 100, 'LKR', '00000000-0000-4000-8000-00000000000a') $$,
  '23514', null, 'an estimated cost''s month must be a real month');
select throws_ok($$ insert into public.fixed_obligations (id, ledger_id, month, cost_type_id, amount_minor, currency, due_day, created_by)
  values ('90000000-0000-4000-8000-0000000000a3', '10000000-0000-4000-8000-00000000000a', '2026-00', '60000000-0000-4000-8000-00000000000a', 100, 'LKR', 1, '00000000-0000-4000-8000-00000000000a') $$,
  '23514', null, 'a fixed cost''s month must be a real month');

-- The base currency lock
select lives_ok($$ update public.ledgers set base_currency = 'USD' where id = '10000000-0000-4000-8000-0000000000a2' $$,
  'the base currency can change while the ledger has no costs');
select lives_ok($$ insert into public.monthly_budgets (id, ledger_id, month, amount_minor, currency, created_by)
  values ('a0000000-0000-4000-8000-0000000000a2', '10000000-0000-4000-8000-0000000000a2', '2026-10', 100, 'USD', '00000000-0000-4000-8000-00000000000a') $$,
  'later amounts use the new base currency');
select throws_ok($$ update public.ledgers set base_currency = 'LKR' where id = '10000000-0000-4000-8000-0000000000a2' $$,
  '23503', null, 'a budget locks the base currency');
select throws_ok($$ update public.ledgers set base_currency = 'USD' where id = '10000000-0000-4000-8000-00000000000a' $$,
  '23503', null, 'a cost locks the base currency');
update public.actual_costs set deleted_at = now() where id = '80000000-0000-4000-8000-0000000000a2';
select throws_ok($$ update public.ledgers set base_currency = 'USD' where id = '10000000-0000-4000-8000-00000000000a' $$,
  '23503', null, 'a deleted cost still locks the base currency: it remains part of the ledger''s history');
reset role;

-- Another user can't use these rules to learn about the ledger: RLS refuses
-- the change before any of them is checked.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000000b","role":"authenticated"}', true);
set local role authenticated;
select throws_ok($$ insert into public.estimated_costs (id, ledger_id, month, cost_type_id, amount_minor, currency, created_by)
  values ('70000000-0000-4000-8000-0000000000b1', '10000000-0000-4000-8000-00000000000a', '2026-10', '60000000-0000-4000-8000-00000000000a', 100, 'USD', '00000000-0000-4000-8000-00000000000b') $$,
  '42501', null, 'another user''s cost in a guessed currency is refused as an access error');
reset role;

select * from finish();
rollback;
