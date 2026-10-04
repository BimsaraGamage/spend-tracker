-- The walking-skeleton data model: ledgers, memberships, accounts and
-- transactions (ADR-0005, ADR-0006, ADR-0007).
--
-- Row level security is enabled with no policies yet: clients can read and
-- write nothing until the access rules arrive in the next migration.
-- Field length limits are provisional, pending the functional requirements.

------------------------------------------------------------------------------
-- Helper trigger functions (all in `private`, execute revoked from PUBLIC)
------------------------------------------------------------------------------

-- Rejects changes to the columns named as trigger arguments (DATA5).
-- Uses check_violation (23514), so the app's upload-error policy treats it
-- as a permanent rejection (SYNC3).
create function private.keep_columns_immutable()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  column_name text;
begin
  foreach column_name in array tg_argv loop
    if (to_jsonb(new) -> column_name) is distinct from (to_jsonb(old) -> column_name) then
      raise exception '%.% cannot be changed', tg_table_name, column_name
        using errcode = 'check_violation';
    end if;
  end loop;
  return new;
end;
$$;
revoke execute on function private.keep_columns_immutable() from public;

-- A ledger's time zone must be a real IANA zone, for example Asia/Colombo.
create function private.check_time_zone()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (select 1 from pg_catalog.pg_timezone_names where name = new.time_zone) then
    raise exception 'Unknown time zone: %', new.time_zone
      using errcode = 'invalid_parameter_value';
  end if;
  return new;
end;
$$;
revoke execute on function private.check_time_zone() from public;

------------------------------------------------------------------------------
-- Tables
------------------------------------------------------------------------------

-- The root of all financial data. Its own id is the ledger id that every
-- other synced table carries.
create table public.ledgers (
  id uuid primary key,
  name text not null check (char_length(name) between 1 and 80),
  base_currency text not null check (base_currency ~ '^[A-Z]{3}$'),
  time_zone text not null,
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- Who may use a ledger, and how. One row per ledger and user; removing a
-- member sets deleted_at, and re-adding them clears it.
create table public.ledger_members (
  id uuid primary key,
  ledger_id uuid not null references public.ledgers (id),
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('owner', 'editor', 'viewer')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (ledger_id, user_id)
);

-- Where money is held. An account has exactly one currency, forever (DATA2).
create table public.accounts (
  id uuid primary key,
  ledger_id uuid not null references public.ledgers (id),
  name text not null check (char_length(name) between 1 and 80),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  -- Targets for the composite foreign keys below.
  unique (id, ledger_id),
  unique (id, currency)
);

-- A dated money movement on an account (ADR-0006). The composite foreign keys
-- make it impossible to store a transaction against another ledger's account,
-- or in a currency other than its account's.
create table public.transactions (
  id uuid primary key,
  ledger_id uuid not null references public.ledgers (id),
  account_id uuid not null,
  -- Minor units, within JavaScript's safe-integer range (DATA1).
  amount_minor bigint not null
    check (amount_minor between -9007199254740991 and 9007199254740991),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  -- The calendar date in the ledger's time zone (DATA3).
  occurred_on date not null,
  description text not null default '' check (char_length(description) <= 200),
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  foreign key (account_id, ledger_id) references public.accounts (id, ledger_id),
  foreign key (account_id, currency) references public.accounts (id, currency)
);

-- Indexes for the membership checks and sync filters (SYNC1, PERF5).
create index ledger_members_user_id_idx on public.ledger_members (user_id);
create index accounts_ledger_id_idx on public.accounts (ledger_id);
create index transactions_ledger_id_occurred_on_idx
  on public.transactions (ledger_id, occurred_on desc);
create index transactions_account_id_idx on public.transactions (account_id);

------------------------------------------------------------------------------
-- Triggers
------------------------------------------------------------------------------

create trigger set_updated_at before update on public.ledgers
  for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.ledger_members
  for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.accounts
  for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.transactions
  for each row execute function private.set_updated_at();

create trigger keep_columns_immutable before update on public.ledgers
  for each row execute function private.keep_columns_immutable('id', 'created_by', 'created_at');
create trigger keep_columns_immutable before update on public.ledger_members
  for each row execute function private.keep_columns_immutable('id', 'ledger_id', 'user_id', 'created_at');
create trigger keep_columns_immutable before update on public.accounts
  for each row execute function private.keep_columns_immutable('id', 'ledger_id', 'currency', 'created_at');
create trigger keep_columns_immutable before update on public.transactions
  for each row execute function private.keep_columns_immutable('id', 'ledger_id', 'created_by', 'created_at');

create trigger check_time_zone before insert or update of time_zone on public.ledgers
  for each row execute function private.check_time_zone();

-- The creator of a ledger becomes its owner. Security definer, because
-- clients may not insert memberships themselves.
create function private.add_owner_membership()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.ledger_members (id, ledger_id, user_id, role)
  values (gen_random_uuid(), new.id, new.created_by, 'owner');
  return new;
end;
$$;
revoke execute on function private.add_owner_membership() from public;

create trigger add_owner_membership after insert on public.ledgers
  for each row execute function private.add_owner_membership();

------------------------------------------------------------------------------
-- Access: deny everything until the policies arrive (SEC1)
------------------------------------------------------------------------------

alter table public.ledgers enable row level security;
alter table public.ledger_members enable row level security;
alter table public.accounts enable row level security;
alter table public.transactions enable row level security;

-- Supabase grants every new table to the client roles. Take back what clients
-- must never have: anything for anonymous users, and DELETE, TRUNCATE,
-- REFERENCES and TRIGGER for signed-in users. Deletion is soft (DATA6), and
-- TRUNCATE isn't subject to RLS.
revoke all on public.ledgers, public.ledger_members, public.accounts, public.transactions
  from anon;
revoke delete, truncate, references, trigger
  on public.ledgers, public.ledger_members, public.accounts, public.transactions
  from authenticated;
