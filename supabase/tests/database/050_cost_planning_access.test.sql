-- Cost planning data is visible and changeable only by its ledger's members,
-- according to their role (NFR-SEC-1, SEC1; FR-PLAN, FR-TAG, FR-ACT,
-- FR-FORECAST).
-- Users: a owns ledger a, b owns ledger b, and c is a viewer of ledger a.
begin;
create extension if not exists pgtap with schema extensions;
select plan(17);

insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-00000000000a', 'a@example.test'),
  ('00000000-0000-4000-8000-00000000000b', 'b@example.test'),
  ('00000000-0000-4000-8000-00000000000c', 'c@example.test');

-- Rows in ledger a, by table, as the current user sees them.
create function pg_temp.visible_plan_rows()
returns table (table_name text, row_count bigint)
language sql
as $$
  select 'tags', count(*) from public.tags where ledger_id = '10000000-0000-4000-8000-00000000000a'
  union all select 'cost_types', count(*) from public.cost_types where ledger_id = '10000000-0000-4000-8000-00000000000a'
  union all select 'estimated_costs', count(*) from public.estimated_costs where ledger_id = '10000000-0000-4000-8000-00000000000a'
  union all select 'actual_costs', count(*) from public.actual_costs where ledger_id = '10000000-0000-4000-8000-00000000000a'
  union all select 'fixed_obligations', count(*) from public.fixed_obligations where ledger_id = '10000000-0000-4000-8000-00000000000a'
$$;
grant execute on function pg_temp.visible_plan_rows() to authenticated;

-- The owner plans a month and records spending.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000000a","role":"authenticated"}', true);
set local role authenticated;
insert into public.ledgers (id, name, base_currency, time_zone, created_by)
values ('10000000-0000-4000-8000-00000000000a', 'Personal', 'LKR', 'Asia/Colombo', '00000000-0000-4000-8000-00000000000a');
select lives_ok($$ insert into public.tags (id, ledger_id, name, created_by)
  values ('50000000-0000-4000-8000-00000000000a', '10000000-0000-4000-8000-00000000000a', 'Home', '00000000-0000-4000-8000-00000000000a') $$,
  'the owner can add a tag');
select lives_ok($$ insert into public.cost_types (id, ledger_id, name, tag_ids, created_by)
  values ('60000000-0000-4000-8000-00000000000a', '10000000-0000-4000-8000-00000000000a', 'Rent', '["50000000-0000-4000-8000-00000000000a"]', '00000000-0000-4000-8000-00000000000a') $$,
  'the owner can add a tagged cost type');
select lives_ok($$ insert into public.estimated_costs (id, ledger_id, month, cost_type_id, amount_minor, currency, created_by)
  values ('70000000-0000-4000-8000-00000000000a', '10000000-0000-4000-8000-00000000000a', '2026-10', '60000000-0000-4000-8000-00000000000a', 100000, 'LKR', '00000000-0000-4000-8000-00000000000a') $$,
  'the owner can add an estimated cost');
select lives_ok($$ insert into public.actual_costs (id, ledger_id, month, cost_type_id, amount_minor, currency, date, created_by)
  values ('80000000-0000-4000-8000-00000000000a', '10000000-0000-4000-8000-00000000000a', '2026-10', '60000000-0000-4000-8000-00000000000a', 90000, 'LKR', '2026-10-31', '00000000-0000-4000-8000-00000000000a') $$,
  'the owner can record an actual cost');
select lives_ok($$ insert into public.fixed_obligations (id, ledger_id, month, cost_type_id, amount_minor, currency, due_day, created_by)
  values ('90000000-0000-4000-8000-00000000000a', '10000000-0000-4000-8000-00000000000a', '2026-10', '60000000-0000-4000-8000-00000000000a', 90000, 'LKR', 20, '00000000-0000-4000-8000-00000000000a') $$,
  'the owner can add a fixed obligation');
select results_eq($$ select row_count from pg_temp.visible_plan_rows() $$, $$ values (1::bigint), (1), (1), (1), (1) $$,
  'the owner sees the ledger''s plan, spending and obligations');
select throws_ok($$ insert into public.actual_costs (id, ledger_id, month, cost_type_id, amount_minor, currency, date, created_by)
  values ('80000000-0000-4000-8000-0000000000a2', '10000000-0000-4000-8000-00000000000a', '2026-10', '60000000-0000-4000-8000-00000000000a', 1, 'LKR', '2026-10-04', '00000000-0000-4000-8000-00000000000b') $$,
  '42501', null, 'a cost cannot be recorded in someone else''s name');
select throws_ok($$ delete from public.estimated_costs where id = '70000000-0000-4000-8000-00000000000a' $$,
  '42501', null, 'hard deletes are impossible: DELETE is not granted');
reset role;

-- Another user: can't see or touch ledger a's plan.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000000b","role":"authenticated"}', true);
set local role authenticated;
insert into public.ledgers (id, name, base_currency, time_zone, created_by)
values ('10000000-0000-4000-8000-00000000000b', 'Mine', 'LKR', 'Asia/Colombo', '00000000-0000-4000-8000-00000000000b');
select results_eq($$ select row_count from pg_temp.visible_plan_rows() $$, $$ values (0::bigint), (0), (0), (0), (0) $$,
  'another user sees nothing of the ledger''s plan');
select throws_ok($$ insert into public.estimated_costs (id, ledger_id, month, cost_type_id, amount_minor, currency, created_by)
  values ('70000000-0000-4000-8000-0000000000b1', '10000000-0000-4000-8000-00000000000a', '2026-10', '60000000-0000-4000-8000-00000000000a', 1, 'LKR', '00000000-0000-4000-8000-00000000000b') $$,
  '42501', null, 'another user cannot add estimates to the ledger');
update public.cost_types set name = 'Hijacked' where id = '60000000-0000-4000-8000-00000000000a';
update public.actual_costs set amount_minor = 1 where id = '80000000-0000-4000-8000-00000000000a';
reset role;
select results_eq(
  $$ select (select name from public.cost_types where id = '60000000-0000-4000-8000-00000000000a'),
            (select amount_minor from public.actual_costs where id = '80000000-0000-4000-8000-00000000000a') $$,
  $$ values ('Rent'::text, 90000::bigint) $$,
  'another user''s updates change nothing');

-- A viewer (added by the database owner: sharing has no client flow yet).
insert into public.ledger_members (id, ledger_id, user_id, role)
values ('40000000-0000-4000-8000-0000000000c1', '10000000-0000-4000-8000-00000000000a', '00000000-0000-4000-8000-00000000000c', 'viewer');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000000c","role":"authenticated"}', true);
set local role authenticated;
select results_eq($$ select row_count from pg_temp.visible_plan_rows() $$, $$ values (1::bigint), (1), (1), (1), (1) $$,
  'a viewer can read the ledger''s plan, spending and obligations');
select throws_ok($$ insert into public.tags (id, ledger_id, name, created_by)
  values ('50000000-0000-4000-8000-0000000000c1', '10000000-0000-4000-8000-00000000000a', 'Mine', '00000000-0000-4000-8000-00000000000c') $$,
  '42501', null, 'a viewer cannot add tags');
select throws_ok($$ insert into public.actual_costs (id, ledger_id, month, cost_type_id, amount_minor, currency, date, created_by)
  values ('80000000-0000-4000-8000-0000000000c1', '10000000-0000-4000-8000-00000000000a', '2026-10', '60000000-0000-4000-8000-00000000000a', 1, 'LKR', '2026-10-04', '00000000-0000-4000-8000-00000000000c') $$,
  '42501', null, 'a viewer cannot record costs');
update public.estimated_costs set amount_minor = 1 where id = '70000000-0000-4000-8000-00000000000a';
update public.fixed_obligations set due_day = 1 where id = '90000000-0000-4000-8000-00000000000a';
reset role;
select results_eq(
  $$ select (select amount_minor from public.estimated_costs where id = '70000000-0000-4000-8000-00000000000a'),
            (select due_day from public.fixed_obligations where id = '90000000-0000-4000-8000-00000000000a') $$,
  $$ values (100000::bigint, 20) $$,
  'a viewer''s updates change nothing');

-- Anonymous users get nothing at all.
set local role anon;
select throws_ok($$ select count(*) from public.cost_types $$,
  '42501', null, 'anonymous users cannot read cost types');
select throws_ok($$ select count(*) from public.actual_costs $$,
  '42501', null, 'anonymous users cannot read actual costs');
reset role;

select * from finish();
rollback;
