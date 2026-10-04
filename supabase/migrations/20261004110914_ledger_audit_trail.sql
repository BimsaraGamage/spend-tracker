-- The audit trail (NFR-SEC-5, DATA7, ADR-0008): every change to ledger data is
-- recorded with who made it and the row before and after. Only the trigger
-- below writes here. Clients can't reach the audit schema at all.

create table audit.events (
  id bigint generated always as identity primary key,
  occurred_at timestamptz not null default now(),
  -- The signed-in user who made the change; null for changes made by the
  -- database owner or a service.
  actor uuid,
  table_name text not null,
  row_id uuid not null,
  ledger_id uuid not null,
  action text not null check (action in ('insert', 'update', 'delete')),
  old_row jsonb,
  new_row jsonb
);

create index events_ledger_id_occurred_at_idx on audit.events (ledger_id, occurred_at desc);
create index events_row_idx on audit.events (table_name, row_id);

-- Defense in depth: the schema is already closed to clients.
alter table audit.events enable row level security;
revoke all on audit.events from public, anon, authenticated;

-- Records one change. Security definer, so changes made by clients can be
-- recorded although clients have no access to the audit schema.
create function audit.record_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  changed_row jsonb;
begin
  if tg_op = 'DELETE' then
    changed_row := to_jsonb(old);
  else
    changed_row := to_jsonb(new);
  end if;

  insert into audit.events (actor, table_name, row_id, ledger_id, action, old_row, new_row)
  values (
    auth.uid(),
    tg_table_name,
    (changed_row ->> 'id')::uuid,
    -- Ledgers are the root: their own id is the ledger id.
    coalesce((changed_row ->> 'ledger_id')::uuid, (changed_row ->> 'id')::uuid),
    lower(tg_op),
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end
  );
  return null;
end;
$$;
revoke execute on function audit.record_change() from public;

create trigger record_change after insert or update or delete on public.ledgers
  for each row execute function audit.record_change();
create trigger record_change after insert or update or delete on public.ledger_members
  for each row execute function audit.record_change();
create trigger record_change after insert or update or delete on public.accounts
  for each row execute function audit.record_change();
create trigger record_change after insert or update or delete on public.transactions
  for each row execute function audit.record_change();
