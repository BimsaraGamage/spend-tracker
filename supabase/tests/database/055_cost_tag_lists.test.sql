-- A tag list holds distinct tags of the row's own ledger (FR-TAG-1–2, AC-05,
-- D-168, D-175, NFR-SEC-1).
begin;
create extension if not exists pgtap with schema extensions;
select plan(16);

insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-00000000000a', 'a@example.test'),
  ('00000000-0000-4000-8000-00000000000b', 'b@example.test');

-- Each user has a ledger with a cost type and tags. Ledger a's tag Old was
-- deleted (set up as the database owner).
insert into public.ledgers (id, name, base_currency, time_zone, created_by) values
  ('10000000-0000-4000-8000-00000000000a', 'A', 'LKR', 'Asia/Colombo', '00000000-0000-4000-8000-00000000000a'),
  ('10000000-0000-4000-8000-00000000000b', 'B', 'LKR', 'Asia/Colombo', '00000000-0000-4000-8000-00000000000b');
insert into public.tags (id, ledger_id, name, created_by, deleted_at) values
  ('50000000-0000-4000-8000-0000000000a1', '10000000-0000-4000-8000-00000000000a', 'Home', '00000000-0000-4000-8000-00000000000a', null),
  ('50000000-0000-4000-8000-0000000000a2', '10000000-0000-4000-8000-00000000000a', 'Essential', '00000000-0000-4000-8000-00000000000a', null),
  ('50000000-0000-4000-8000-0000000000a3', '10000000-0000-4000-8000-00000000000a', 'Old', '00000000-0000-4000-8000-00000000000a', now()),
  ('50000000-0000-4000-8000-0000000000b1', '10000000-0000-4000-8000-00000000000b', 'Mine', '00000000-0000-4000-8000-00000000000b', null);
insert into public.cost_types (id, ledger_id, name, created_by) values
  ('60000000-0000-4000-8000-00000000000a', '10000000-0000-4000-8000-00000000000a', 'Rent', '00000000-0000-4000-8000-00000000000a'),
  ('60000000-0000-4000-8000-00000000000b', '10000000-0000-4000-8000-00000000000b', 'Rent', '00000000-0000-4000-8000-00000000000b');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000000a","role":"authenticated"}', true);
set local role authenticated;

-- Lists of the ledger's own tags
select lives_ok($$ insert into public.cost_types (id, ledger_id, name, tag_ids, created_by)
  values ('60000000-0000-4000-8000-0000000000a2', '10000000-0000-4000-8000-00000000000a', 'Groceries', '["50000000-0000-4000-8000-0000000000a1", "50000000-0000-4000-8000-0000000000a2"]', '00000000-0000-4000-8000-00000000000a') $$,
  'a cost type can have several tags of its ledger');
select lives_ok($$ insert into public.estimated_costs (id, ledger_id, month, cost_type_id, amount_minor, currency, tag_ids, created_by)
  values ('70000000-0000-4000-8000-0000000000a1', '10000000-0000-4000-8000-00000000000a', '2026-10', '60000000-0000-4000-8000-00000000000a', 100, 'LKR', '["50000000-0000-4000-8000-0000000000a1"]', '00000000-0000-4000-8000-00000000000a') $$,
  'an estimated cost can have tags of its ledger');
select lives_ok($$ insert into public.actual_costs (id, ledger_id, month, cost_type_id, amount_minor, currency, date, tag_ids, created_by)
  values ('80000000-0000-4000-8000-0000000000a1', '10000000-0000-4000-8000-00000000000a', '2026-10', '60000000-0000-4000-8000-00000000000a', 100, 'LKR', '2026-10-04', '["50000000-0000-4000-8000-0000000000a1", "50000000-0000-4000-8000-0000000000a2"]', '00000000-0000-4000-8000-00000000000a') $$,
  'an actual cost can have tags of its ledger');
select lives_ok($$ insert into public.actual_costs (id, ledger_id, month, cost_type_id, amount_minor, currency, date, tag_ids, created_by)
  values ('80000000-0000-4000-8000-0000000000a2', '10000000-0000-4000-8000-00000000000a', '2026-10', '60000000-0000-4000-8000-00000000000a', 100, 'LKR', '2026-10-04', '["50000000-0000-4000-8000-0000000000a3"]', '00000000-0000-4000-8000-00000000000a') $$,
  'a cost recorded offline keeps a tag that was deleted meanwhile');

-- Malformed lists
select throws_ok($$ insert into public.estimated_costs (id, ledger_id, month, cost_type_id, amount_minor, currency, tag_ids, created_by)
  values ('70000000-0000-4000-8000-0000000000a2', '10000000-0000-4000-8000-00000000000a', '2026-10', '60000000-0000-4000-8000-00000000000a', 100, 'LKR', to_jsonb('["50000000-0000-4000-8000-0000000000a1"]'::text), '00000000-0000-4000-8000-00000000000a') $$,
  '23514', null, 'a list uploaded as a JSON string is refused');
select throws_ok($$ insert into public.estimated_costs (id, ledger_id, month, cost_type_id, amount_minor, currency, tag_ids, created_by)
  values ('70000000-0000-4000-8000-0000000000a3', '10000000-0000-4000-8000-00000000000a', '2026-10', '60000000-0000-4000-8000-00000000000a', 100, 'LKR', '["Home"]', '00000000-0000-4000-8000-00000000000a') $$,
  '23514', null, 'a list holds tag IDs, not names');
select throws_ok($$ insert into public.estimated_costs (id, ledger_id, month, cost_type_id, amount_minor, currency, tag_ids, created_by)
  values ('70000000-0000-4000-8000-0000000000a4', '10000000-0000-4000-8000-00000000000a', '2026-10', '60000000-0000-4000-8000-00000000000a', 100, 'LKR', '["50000000-0000-4000-8000-0000000000A1"]', '00000000-0000-4000-8000-00000000000a') $$,
  '23514', null, 'tag IDs are lowercase, as devices compare them as text');
select throws_ok($$ insert into public.estimated_costs (id, ledger_id, month, cost_type_id, amount_minor, currency, tag_ids, created_by)
  values ('70000000-0000-4000-8000-0000000000a5', '10000000-0000-4000-8000-00000000000a', '2026-10', '60000000-0000-4000-8000-00000000000a', 100, 'LKR', '["50000000-0000-4000-8000-0000000000a1", "50000000-0000-4000-8000-0000000000a1"]', '00000000-0000-4000-8000-00000000000a') $$,
  '23514', null, 'a list names each tag once');
select throws_ok($$ insert into public.estimated_costs (id, ledger_id, month, cost_type_id, amount_minor, currency, tag_ids, created_by)
  values ('70000000-0000-4000-8000-0000000000a6', '10000000-0000-4000-8000-00000000000a', '2026-10', '60000000-0000-4000-8000-00000000000a', 100, 'LKR',
    (select jsonb_agg(gen_random_uuid()) from generate_series(1, 51)), '00000000-0000-4000-8000-00000000000a') $$,
  '23514', null, 'a list holds at most 50 tags');

-- Tags from elsewhere
select throws_ok($$ insert into public.cost_types (id, ledger_id, name, tag_ids, created_by)
  values ('60000000-0000-4000-8000-0000000000a3', '10000000-0000-4000-8000-00000000000a', 'Fuel', '["50000000-0000-4000-8000-0000000000b1"]', '00000000-0000-4000-8000-00000000000a') $$,
  '23503', null, 'a cost type cannot have another ledger''s tag');
select throws_ok($$ insert into public.estimated_costs (id, ledger_id, month, cost_type_id, amount_minor, currency, tag_ids, created_by)
  values ('70000000-0000-4000-8000-0000000000a7', '10000000-0000-4000-8000-00000000000a', '2026-10', '60000000-0000-4000-8000-00000000000a', 100, 'LKR', '["50000000-0000-4000-8000-0000000000b1"]', '00000000-0000-4000-8000-00000000000a') $$,
  '23503', null, 'an estimated cost cannot have another ledger''s tag');
select throws_ok($$ insert into public.actual_costs (id, ledger_id, month, cost_type_id, amount_minor, currency, date, tag_ids, created_by)
  values ('80000000-0000-4000-8000-0000000000a3', '10000000-0000-4000-8000-00000000000a', '2026-10', '60000000-0000-4000-8000-00000000000a', 100, 'LKR', '2026-10-04', '["50000000-0000-4000-8000-0000000000b1"]', '00000000-0000-4000-8000-00000000000a') $$,
  '23503', null, 'an actual cost cannot have another ledger''s tag');
select throws_ok($$ insert into public.actual_costs (id, ledger_id, month, cost_type_id, amount_minor, currency, date, tag_ids, created_by)
  values ('80000000-0000-4000-8000-0000000000a4', '10000000-0000-4000-8000-00000000000a', '2026-10', '60000000-0000-4000-8000-00000000000a', 100, 'LKR', '2026-10-04', '["50000000-0000-4000-8000-0000000000ff"]', '00000000-0000-4000-8000-00000000000a') $$,
  '23503', null, 'a cost cannot have a tag that doesn''t exist');
select throws_ok($$ update public.actual_costs set tag_ids = '["50000000-0000-4000-8000-0000000000a1", "50000000-0000-4000-8000-0000000000b1"]'
  where id = '80000000-0000-4000-8000-0000000000a1' $$,
  '23503', null, 'changing a cost''s tags is checked too');
reset role;

-- Another user gets the same error for a ledger's real tag as for a tag that
-- doesn't exist, so the check reveals nothing about the ledger.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000000b","role":"authenticated"}', true);
set local role authenticated;
select throws_ok($$ insert into public.cost_types (id, ledger_id, name, tag_ids, created_by)
  values ('60000000-0000-4000-8000-0000000000b2', '10000000-0000-4000-8000-00000000000a', 'Probe', '["50000000-0000-4000-8000-0000000000a1"]', '00000000-0000-4000-8000-00000000000b') $$,
  '23503', null, 'another user''s change naming a ledger''s real tag is refused ...');
select throws_ok($$ insert into public.cost_types (id, ledger_id, name, tag_ids, created_by)
  values ('60000000-0000-4000-8000-0000000000b3', '10000000-0000-4000-8000-00000000000a', 'Probe', '["50000000-0000-4000-8000-0000000000ff"]', '00000000-0000-4000-8000-00000000000b') $$,
  '23503', null, '... exactly as one naming a tag that doesn''t exist');
reset role;

select * from finish();
rollback;
