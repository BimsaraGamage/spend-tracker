-- Who may read and change ledger data (ADR-0005, SEC1).
--
--   viewers         read the ledger's data
--   editors, owners also add and change accounts and transactions
--   owners          also rename or soft-delete the ledger
--
-- Anyone signed in may create a ledger, as themselves; they become its owner
-- (trigger in the data-model migration). Memberships are read-only for
-- clients until sharing exists. A soft-deleted ledger hides all its data.
-- Hard deletes aren't possible for clients: DELETE isn't granted (DATA6).

-- Whether the signed-in user has one of `allowed_roles` in an active ledger.
-- Security definer, so policies don't recurse into ledger_members' own RLS.
-- This is the one internal function signed-in users may execute (see the
-- allowlist in supabase/tests/database/000_schema_security.test.sql).
create function private.has_ledger_role(target_ledger_id uuid, allowed_roles text[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.ledger_members as member
    join public.ledgers as ledger on ledger.id = member.ledger_id
    where member.ledger_id = target_ledger_id
      and member.user_id = (select auth.uid())
      and member.deleted_at is null
      and ledger.deleted_at is null
      and member.role = any (allowed_roles)
  )
$$;
revoke execute on function private.has_ledger_role(uuid, text[]) from public;
grant execute on function private.has_ledger_role(uuid, text[]) to authenticated;

-- ledgers
create policy "members read their ledgers" on public.ledgers
  for select to authenticated
  using (private.has_ledger_role(id, array['owner', 'editor', 'viewer']));

create policy "users create ledgers as themselves" on public.ledgers
  for insert to authenticated
  with check (created_by = (select auth.uid()));

create policy "owners change their ledgers" on public.ledgers
  for update to authenticated
  using (private.has_ledger_role(id, array['owner']))
  with check (private.has_ledger_role(id, array['owner']));

-- ledger_members (read-only for clients)
create policy "members see who shares the ledger" on public.ledger_members
  for select to authenticated
  using (private.has_ledger_role(ledger_id, array['owner', 'editor', 'viewer']));

-- accounts
create policy "members read accounts" on public.accounts
  for select to authenticated
  using (private.has_ledger_role(ledger_id, array['owner', 'editor', 'viewer']));

create policy "editors add accounts" on public.accounts
  for insert to authenticated
  with check (private.has_ledger_role(ledger_id, array['owner', 'editor']));

create policy "editors change accounts" on public.accounts
  for update to authenticated
  using (private.has_ledger_role(ledger_id, array['owner', 'editor']))
  with check (private.has_ledger_role(ledger_id, array['owner', 'editor']));

-- transactions
create policy "members read transactions" on public.transactions
  for select to authenticated
  using (private.has_ledger_role(ledger_id, array['owner', 'editor', 'viewer']));

create policy "editors add their own transactions" on public.transactions
  for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and private.has_ledger_role(ledger_id, array['owner', 'editor'])
  );

create policy "editors change transactions" on public.transactions
  for update to authenticated
  using (private.has_ledger_role(ledger_id, array['owner', 'editor']))
  with check (private.has_ledger_role(ledger_id, array['owner', 'editor']));
