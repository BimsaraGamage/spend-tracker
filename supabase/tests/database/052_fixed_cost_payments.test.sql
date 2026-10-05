-- Fixed costs are paid by the actual costs recorded against them, in the same
-- ledger (FR-FORECAST-2, D-167, NFR-SEC-1).
begin;
create extension if not exists pgtap with schema extensions;
select plan(6);

insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-00000000000a', 'a@example.test'),
  ('00000000-0000-4000-8000-00000000000b', 'b@example.test');

-- Each user has a ledger with October's rent as a fixed cost (set up as the
-- database owner).
insert into public.ledgers (id, name, base_currency, time_zone, created_by) values
  ('10000000-0000-4000-8000-00000000000a', 'A', 'LKR', 'Asia/Colombo', '00000000-0000-4000-8000-00000000000a'),
  ('10000000-0000-4000-8000-00000000000b', 'B', 'LKR', 'Asia/Colombo', '00000000-0000-4000-8000-00000000000b');
insert into public.cost_types (id, ledger_id, name, created_by) values
  ('60000000-0000-4000-8000-00000000000a', '10000000-0000-4000-8000-00000000000a', 'Rent', '00000000-0000-4000-8000-00000000000a'),
  ('60000000-0000-4000-8000-00000000000b', '10000000-0000-4000-8000-00000000000b', 'Rent', '00000000-0000-4000-8000-00000000000b');
insert into public.fixed_obligations (id, ledger_id, month, cost_type_id, amount_minor, currency, due_day, created_by) values
  ('90000000-0000-4000-8000-00000000000a', '10000000-0000-4000-8000-00000000000a', '2026-10', '60000000-0000-4000-8000-00000000000a', 90000, 'LKR', 20, '00000000-0000-4000-8000-00000000000a'),
  ('90000000-0000-4000-8000-00000000000b', '10000000-0000-4000-8000-00000000000b', '2026-10', '60000000-0000-4000-8000-00000000000b', 90000, 'LKR', 20, '00000000-0000-4000-8000-00000000000b');

select hasnt_column('public', 'fixed_obligations', 'paid',
  'a fixed cost has no paid flag: the payments recorded against it say what is paid');

-- User b pays their rent.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000000b","role":"authenticated"}', true);
set local role authenticated;
select lives_ok($$ insert into public.actual_costs (id, ledger_id, month, cost_type_id, amount_minor, currency, date, fixed_obligation_id, created_by)
  values ('80000000-0000-4000-8000-0000000000b1', '10000000-0000-4000-8000-00000000000b', '2026-10', '60000000-0000-4000-8000-00000000000b', 40000, 'LKR', '2026-10-18', '90000000-0000-4000-8000-00000000000b', '00000000-0000-4000-8000-00000000000b') $$,
  'an actual cost can pay part of a fixed cost in its own ledger');
select lives_ok($$ insert into public.actual_costs (id, ledger_id, month, cost_type_id, amount_minor, currency, date, fixed_obligation_id, created_by)
  values ('80000000-0000-4000-8000-0000000000b2', '10000000-0000-4000-8000-00000000000b', '2026-09', '60000000-0000-4000-8000-00000000000b', 50000, 'LKR', '2026-09-30', '90000000-0000-4000-8000-00000000000b', '00000000-0000-4000-8000-00000000000b') $$,
  'another payment can pay the rest, even one made early, in the month before');
select throws_ok($$ insert into public.actual_costs (id, ledger_id, month, cost_type_id, amount_minor, currency, date, fixed_obligation_id, created_by)
  values ('80000000-0000-4000-8000-0000000000b3', '10000000-0000-4000-8000-00000000000b', '2026-10', '60000000-0000-4000-8000-00000000000b', 90000, 'LKR', '2026-10-18', '90000000-0000-4000-8000-00000000000a', '00000000-0000-4000-8000-00000000000b') $$,
  '23503', null, 'an actual cost cannot pay another ledger''s fixed cost');
select throws_ok($$ update public.actual_costs set fixed_obligation_id = '90000000-0000-4000-8000-00000000000a'
  where id = '80000000-0000-4000-8000-0000000000b1' $$,
  '23503', null, 'a payment cannot be moved to another ledger''s fixed cost');

-- Another device deleted the fixed cost while this one was offline.
update public.fixed_obligations set deleted_at = now() where id = '90000000-0000-4000-8000-00000000000b';
select lives_ok($$ insert into public.actual_costs (id, ledger_id, month, cost_type_id, amount_minor, currency, date, fixed_obligation_id, created_by)
  values ('80000000-0000-4000-8000-0000000000b4', '10000000-0000-4000-8000-00000000000b', '2026-10', '60000000-0000-4000-8000-00000000000b', 1000, 'LKR', '2026-10-19', '90000000-0000-4000-8000-00000000000b', '00000000-0000-4000-8000-00000000000b') $$,
  'a payment recorded offline is kept when its fixed cost was deleted meanwhile');
reset role;

select * from finish();
rollback;
