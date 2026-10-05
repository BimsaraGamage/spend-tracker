-- Monthly budgets: what the user allows for a month's spending, which the
-- exhaustion forecast tracks (FR-PLAN-3, FR-FORECAST-1, D-166).
--
-- A ledger has at most one current budget per month. A deleted budget can be
-- replaced, and a budget stays in its month: planning another month means
-- adding another budget.

create table public.monthly_budgets (
  id uuid primary key,
  ledger_id uuid not null references public.ledgers (id),
  -- A month of the ledger's calendar, as YYYY-MM (DATA3).
  month text not null check (month ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  -- Positive minor units, within JavaScript's safe-integer range (DATA1).
  amount_minor bigint not null check (amount_minor between 1 and 9007199254740991),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index monthly_budgets_ledger_id_idx on public.monthly_budgets (ledger_id);
create unique index monthly_budgets_ledger_id_month_key
  on public.monthly_budgets (ledger_id, month)
  where deleted_at is null;

create trigger set_updated_at before update on public.monthly_budgets
  for each row execute function private.set_updated_at();
create trigger keep_columns_immutable before update on public.monthly_budgets
  for each row execute function private.keep_columns_immutable('id', 'ledger_id', 'month', 'created_by', 'created_at');
create trigger record_change after insert or update or delete on public.monthly_budgets
  for each row execute function audit.record_change();

-- Access: the same rules as the other cost planning tables.
alter table public.monthly_budgets enable row level security;
revoke all on public.monthly_budgets from anon;
revoke delete, truncate, references, trigger on public.monthly_budgets from authenticated;

create policy "members read monthly budgets" on public.monthly_budgets
  for select to authenticated
  using (private.has_ledger_role(ledger_id, array['owner', 'editor', 'viewer']));

create policy "editors add their own monthly budgets" on public.monthly_budgets
  for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and private.has_ledger_role(ledger_id, array['owner', 'editor'])
  );

create policy "editors change monthly budgets" on public.monthly_budgets
  for update to authenticated
  using (private.has_ledger_role(ledger_id, array['owner', 'editor']))
  with check (private.has_ledger_role(ledger_id, array['owner', 'editor']));

-- Replicated to the sync service like the other ledger tables (SYNC6).
alter publication powersync add table public.monthly_budgets;
grant select on public.monthly_budgets to powersync_role;
