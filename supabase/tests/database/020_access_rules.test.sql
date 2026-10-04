-- Row level security: a ledger's data is visible and changeable only by its
-- members, according to their role (NFR-SEC-1, ADR-0005). The tests act as
-- users the way Supabase does for API requests: a JWT claim plus the
-- `authenticated` role. Users: a owns ledger a, b owns ledger b, and c is a
-- viewer of ledger a.
begin;
create extension if not exists pgtap with schema extensions;
select plan(21);

insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-00000000000a', 'a@example.test'), ('00000000-0000-4000-8000-00000000000b', 'b@example.test'), ('00000000-0000-4000-8000-00000000000c', 'c@example.test');

-- The owner: the walking-skeleton flow, plus the limits on what they can do.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000000a","role":"authenticated"}', true);
set local role authenticated;
select lives_ok($$ insert into public.ledgers (id, name, base_currency, time_zone, created_by)
  values ('10000000-0000-4000-8000-00000000000a', 'Personal', 'LKR', 'Asia/Colombo', '00000000-0000-4000-8000-00000000000a') $$,
  'a signed-in user can create a ledger as themselves');
select lives_ok($$ insert into public.accounts (id, ledger_id, name, currency)
  values ('20000000-0000-4000-8000-00000000000a', '10000000-0000-4000-8000-00000000000a', 'Cash', 'LKR') $$,
  'the owner can add an account');
select lives_ok($$ insert into public.transactions (id, ledger_id, account_id, amount_minor, currency, occurred_on, created_by)
  values ('30000000-0000-4000-8000-00000000000a', '10000000-0000-4000-8000-00000000000a', '20000000-0000-4000-8000-00000000000a', -1250, 'LKR', '2026-10-04', '00000000-0000-4000-8000-00000000000a') $$,
  'the owner can add a transaction');
select results_eq($$ select count(*) from public.transactions $$, $$ values (1::bigint) $$,
  'the owner sees their transaction');
select throws_ok($$ insert into public.transactions (id, ledger_id, account_id, amount_minor, currency, occurred_on, created_by)
  values ('30000000-0000-4000-8000-0000000000a2', '10000000-0000-4000-8000-00000000000a', '20000000-0000-4000-8000-00000000000a', -1, 'LKR', '2026-10-04', '00000000-0000-4000-8000-00000000000b') $$,
  '42501', null, 'a transaction cannot be recorded in someone else''s name');
select throws_ok($$ delete from public.transactions where id = '30000000-0000-4000-8000-00000000000a' $$,
  '42501', null, 'hard deletes are impossible: DELETE is not granted');
select lives_ok($$ update public.transactions set deleted_at = now() where id = '30000000-0000-4000-8000-00000000000a' $$,
  'the owner can soft-delete a transaction');
reset role;
update public.transactions set deleted_at = null where id = '30000000-0000-4000-8000-00000000000a';

-- Another user: can't see or touch ledger a.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000000b","role":"authenticated"}', true);
set local role authenticated;
select lives_ok($$ insert into public.ledgers (id, name, base_currency, time_zone, created_by)
  values ('10000000-0000-4000-8000-00000000000b', 'Mine', 'USD', 'UTC', '00000000-0000-4000-8000-00000000000b') $$,
  'another user can create their own ledger');
select results_eq($$ select count(*) from public.ledgers $$, $$ values (1::bigint) $$,
  'a user sees only the ledgers they belong to');
select results_eq($$ select count(*) from public.transactions $$, $$ values (0::bigint) $$,
  'another user cannot read the ledger''s transactions');
select results_eq($$ select count(*) from public.ledger_members where ledger_id = '10000000-0000-4000-8000-00000000000a' $$, $$ values (0::bigint) $$,
  'another user cannot see who belongs to the ledger');
select throws_ok($$ insert into public.transactions (id, ledger_id, account_id, amount_minor, currency, occurred_on, created_by)
  values ('30000000-0000-4000-8000-0000000000b1', '10000000-0000-4000-8000-00000000000a', '20000000-0000-4000-8000-00000000000a', -1, 'LKR', '2026-10-04', '00000000-0000-4000-8000-00000000000b') $$,
  '42501', null, 'another user cannot add transactions to the ledger');
select throws_ok($$ insert into public.ledger_members (id, ledger_id, user_id, role)
  values ('40000000-0000-4000-8000-0000000000b1', '10000000-0000-4000-8000-00000000000a', '00000000-0000-4000-8000-00000000000b', 'owner') $$,
  '42501', null, 'users cannot make themselves members of a ledger');
select throws_ok($$ insert into public.ledgers (id, name, base_currency, time_zone, created_by)
  values ('10000000-0000-4000-8000-0000000000b2', 'Spoof', 'LKR', 'UTC', '00000000-0000-4000-8000-00000000000a') $$,
  '42501', null, 'users cannot create a ledger in someone else''s name');
update public.accounts set name = 'Hijacked' where id = '20000000-0000-4000-8000-00000000000a';
reset role;
select results_eq($$ select name from public.accounts where id = '20000000-0000-4000-8000-00000000000a' $$, $$ values ('Cash'::text) $$,
  'another user''s update changes nothing');

-- A viewer (added by the database owner: sharing has no client flow yet).
insert into public.ledger_members (id, ledger_id, user_id, role)
values ('40000000-0000-4000-8000-0000000000c1', '10000000-0000-4000-8000-00000000000a', '00000000-0000-4000-8000-00000000000c', 'viewer');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000000c","role":"authenticated"}', true);
set local role authenticated;
select results_eq($$ select count(*) from public.transactions $$, $$ values (1::bigint) $$,
  'a viewer can read the ledger''s transactions');
select throws_ok($$ insert into public.transactions (id, ledger_id, account_id, amount_minor, currency, occurred_on, created_by)
  values ('30000000-0000-4000-8000-0000000000c1', '10000000-0000-4000-8000-00000000000a', '20000000-0000-4000-8000-00000000000a', -1, 'LKR', '2026-10-04', '00000000-0000-4000-8000-00000000000c') $$,
  '42501', null, 'a viewer cannot add transactions');
update public.transactions set amount_minor = 1 where id = '30000000-0000-4000-8000-00000000000a';
reset role;
select results_eq($$ select amount_minor from public.transactions where id = '30000000-0000-4000-8000-00000000000a' $$, $$ values (-1250::bigint) $$,
  'a viewer''s update changes nothing');

-- Anonymous users get nothing at all.
set local role anon;
select throws_ok($$ select count(*) from public.ledgers $$,
  '42501', null, 'anonymous users cannot read ledgers');
reset role;

-- The owner soft-deletes the ledger, which hides its data, even from them.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000000a","role":"authenticated"}', true);
set local role authenticated;
select lives_ok($$ update public.ledgers set deleted_at = now() where id = '10000000-0000-4000-8000-00000000000a' $$,
  'the owner can soft-delete their ledger');
select results_eq($$ select count(*) from public.transactions $$, $$ values (0::bigint) $$,
  'a soft-deleted ledger hides its data from its members');
reset role;

select * from finish();
rollback;
