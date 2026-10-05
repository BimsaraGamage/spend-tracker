-- Cost planning rows stay inside their own ledger, and an actual cost's month
-- is the month of its date (DATA3, DATA5, NFR-SEC-1).
begin;
create extension if not exists pgtap with schema extensions;
select plan(5);

insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-00000000000a', 'a@example.test'),
  ('00000000-0000-4000-8000-00000000000b', 'b@example.test');

-- Each user has a ledger with one cost type (set up as the database owner).
insert into public.ledgers (id, name, base_currency, time_zone, created_by) values
  ('10000000-0000-4000-8000-00000000000a', 'A', 'LKR', 'Asia/Colombo', '00000000-0000-4000-8000-00000000000a'),
  ('10000000-0000-4000-8000-00000000000b', 'B', 'LKR', 'Asia/Colombo', '00000000-0000-4000-8000-00000000000b');
insert into public.cost_types (id, ledger_id, name, created_by) values
  ('60000000-0000-4000-8000-00000000000a', '10000000-0000-4000-8000-00000000000a', 'Rent', '00000000-0000-4000-8000-00000000000a'),
  ('60000000-0000-4000-8000-00000000000b', '10000000-0000-4000-8000-00000000000b', 'Rent', '00000000-0000-4000-8000-00000000000b');

-- User b, acting in their own ledger.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000000b","role":"authenticated"}', true);
set local role authenticated;
select lives_ok($$ insert into public.estimated_costs (id, ledger_id, month, cost_type_id, amount_minor, currency, created_by)
  values ('70000000-0000-4000-8000-0000000000b1', '10000000-0000-4000-8000-00000000000b', '2026-10', '60000000-0000-4000-8000-00000000000b', 1, 'LKR', '00000000-0000-4000-8000-00000000000b') $$,
  'a cost can use its own ledger''s cost type');
select throws_ok($$ insert into public.estimated_costs (id, ledger_id, month, cost_type_id, amount_minor, currency, created_by)
  values ('70000000-0000-4000-8000-0000000000b2', '10000000-0000-4000-8000-00000000000b', '2026-10', '60000000-0000-4000-8000-00000000000a', 1, 'LKR', '00000000-0000-4000-8000-00000000000b') $$,
  '23503', null, 'an estimated cost cannot use another ledger''s cost type');
select throws_ok($$ insert into public.actual_costs (id, ledger_id, month, cost_type_id, amount_minor, currency, date, created_by)
  values ('80000000-0000-4000-8000-0000000000b1', '10000000-0000-4000-8000-00000000000b', '2026-10', '60000000-0000-4000-8000-00000000000a', 1, 'LKR', '2026-10-04', '00000000-0000-4000-8000-00000000000b') $$,
  '23503', null, 'an actual cost cannot use another ledger''s cost type');
select throws_ok($$ insert into public.fixed_obligations (id, ledger_id, month, cost_type_id, amount_minor, currency, due_day, created_by)
  values ('90000000-0000-4000-8000-0000000000b1', '10000000-0000-4000-8000-00000000000b', '2026-10', '60000000-0000-4000-8000-00000000000a', 1, 'LKR', 1, '00000000-0000-4000-8000-00000000000b') $$,
  '23503', null, 'a fixed obligation cannot use another ledger''s cost type');
select throws_ok($$ insert into public.actual_costs (id, ledger_id, month, cost_type_id, amount_minor, currency, date, created_by)
  values ('80000000-0000-4000-8000-0000000000b2', '10000000-0000-4000-8000-00000000000b', '2026-10', '60000000-0000-4000-8000-00000000000b', 1, 'LKR', '2026-11-01', '00000000-0000-4000-8000-00000000000b') $$,
  '23514', null, 'an actual cost''s month must be the month of its date');
reset role;

select * from finish();
rollback;
