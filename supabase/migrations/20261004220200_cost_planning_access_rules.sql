-- RLS policies for the cost planning tables.
-- Uses the same access rules as accounts and transactions:
-- - viewers can read
-- - editors and owners can insert (as themselves) and update

------------------------------------------------------------------------------
-- tags
------------------------------------------------------------------------------

create policy "members read tags" on public.tags
  for select to authenticated
  using (private.has_ledger_role(ledger_id, array['owner', 'editor', 'viewer']));

create policy "editors add their own tags" on public.tags
  for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and private.has_ledger_role(ledger_id, array['owner', 'editor'])
  );

create policy "editors change tags" on public.tags
  for update to authenticated
  using (private.has_ledger_role(ledger_id, array['owner', 'editor']))
  with check (private.has_ledger_role(ledger_id, array['owner', 'editor']));

------------------------------------------------------------------------------
-- cost_types
------------------------------------------------------------------------------

create policy "members read cost types" on public.cost_types
  for select to authenticated
  using (private.has_ledger_role(ledger_id, array['owner', 'editor', 'viewer']));

create policy "editors add their own cost types" on public.cost_types
  for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and private.has_ledger_role(ledger_id, array['owner', 'editor'])
  );

create policy "editors change cost types" on public.cost_types
  for update to authenticated
  using (private.has_ledger_role(ledger_id, array['owner', 'editor']))
  with check (private.has_ledger_role(ledger_id, array['owner', 'editor']));

------------------------------------------------------------------------------
-- estimated_costs
------------------------------------------------------------------------------

create policy "members read estimated costs" on public.estimated_costs
  for select to authenticated
  using (private.has_ledger_role(ledger_id, array['owner', 'editor', 'viewer']));

create policy "editors add their own estimated costs" on public.estimated_costs
  for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and private.has_ledger_role(ledger_id, array['owner', 'editor'])
  );

create policy "editors change estimated costs" on public.estimated_costs
  for update to authenticated
  using (private.has_ledger_role(ledger_id, array['owner', 'editor']))
  with check (private.has_ledger_role(ledger_id, array['owner', 'editor']));

------------------------------------------------------------------------------
-- actual_costs
------------------------------------------------------------------------------

create policy "members read actual costs" on public.actual_costs
  for select to authenticated
  using (private.has_ledger_role(ledger_id, array['owner', 'editor', 'viewer']));

create policy "editors add their own actual costs" on public.actual_costs
  for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and private.has_ledger_role(ledger_id, array['owner', 'editor'])
  );

create policy "editors change actual costs" on public.actual_costs
  for update to authenticated
  using (private.has_ledger_role(ledger_id, array['owner', 'editor']))
  with check (private.has_ledger_role(ledger_id, array['owner', 'editor']));

------------------------------------------------------------------------------
-- fixed_obligations
------------------------------------------------------------------------------

create policy "members read fixed obligations" on public.fixed_obligations
  for select to authenticated
  using (private.has_ledger_role(ledger_id, array['owner', 'editor', 'viewer']));

create policy "editors add their own fixed obligations" on public.fixed_obligations
  for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and private.has_ledger_role(ledger_id, array['owner', 'editor'])
  );

create policy "editors change fixed obligations" on public.fixed_obligations
  for update to authenticated
  using (private.has_ledger_role(ledger_id, array['owner', 'editor']))
  with check (private.has_ledger_role(ledger_id, array['owner', 'editor']));
