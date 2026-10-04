-- Monthly cost planning feature (FR-PLAN, FR-TAG, FR-ACT, FR-FORECAST).
-- Requires the ledger data model to be present.

------------------------------------------------------------------------------
-- Tables
------------------------------------------------------------------------------

-- User-defined tags (FR-TAG-1).
create table public.tags (
  id uuid primary key,
  ledger_id uuid not null references public.ledgers (id),
  name text not null check (char_length(name) between 1 and 80),
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- Categories of spending (FR-PLAN-1, FR-TAG-2).
create table public.cost_types (
  id uuid primary key,
  ledger_id uuid not null references public.ledgers (id),
  name text not null check (char_length(name) between 1 and 80),
  tag_ids jsonb not null default '[]'::jsonb,
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- Planned spending (FR-PLAN-1, FR-TAG-1).
create table public.estimated_costs (
  id uuid primary key,
  ledger_id uuid not null references public.ledgers (id),
  month text not null check (month ~ '^\d{4}-\d{2}$'),
  cost_type_id uuid not null references public.cost_types (id),
  amount_minor bigint not null check (amount_minor between -9007199254740991 and 9007199254740991),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  tag_ids jsonb not null default '[]'::jsonb,
  note text not null default '' check (char_length(note) <= 200),
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- Recorded expenses (FR-ACT-1, FR-TAG-1).
create table public.actual_costs (
  id uuid primary key,
  ledger_id uuid not null references public.ledgers (id),
  month text not null check (month ~ '^\d{4}-\d{2}$'),
  cost_type_id uuid not null references public.cost_types (id),
  amount_minor bigint not null check (amount_minor between -9007199254740991 and 9007199254740991),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  tag_ids jsonb not null default '[]'::jsonb,
  note text not null default '' check (char_length(note) <= 200),
  date date not null,
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- Fixed expenses for forecast graph step-downs (FR-FORECAST-2).
create table public.fixed_obligations (
  id uuid primary key,
  ledger_id uuid not null references public.ledgers (id),
  month text not null check (month ~ '^\d{4}-\d{2}$'),
  cost_type_id uuid not null references public.cost_types (id),
  amount_minor bigint not null check (amount_minor between -9007199254740991 and 9007199254740991),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  due_day integer not null check (due_day between 1 and 31),
  paid boolean not null default false,
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

------------------------------------------------------------------------------
-- Indexes
------------------------------------------------------------------------------

create index tags_ledger_id_idx on public.tags (ledger_id);
create index cost_types_ledger_id_idx on public.cost_types (ledger_id);
create index estimated_costs_ledger_id_month_idx on public.estimated_costs (ledger_id, month);
create index actual_costs_ledger_id_month_idx on public.actual_costs (ledger_id, month);
create index fixed_obligations_ledger_id_month_idx on public.fixed_obligations (ledger_id, month);

------------------------------------------------------------------------------
-- Triggers
------------------------------------------------------------------------------

create trigger set_updated_at before update on public.tags
  for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.cost_types
  for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.estimated_costs
  for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.actual_costs
  for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.fixed_obligations
  for each row execute function private.set_updated_at();

create trigger keep_columns_immutable before update on public.tags
  for each row execute function private.keep_columns_immutable('id', 'ledger_id', 'created_by', 'created_at');
create trigger keep_columns_immutable before update on public.cost_types
  for each row execute function private.keep_columns_immutable('id', 'ledger_id', 'created_by', 'created_at');
create trigger keep_columns_immutable before update on public.estimated_costs
  for each row execute function private.keep_columns_immutable('id', 'ledger_id', 'created_by', 'created_at');
create trigger keep_columns_immutable before update on public.actual_costs
  for each row execute function private.keep_columns_immutable('id', 'ledger_id', 'created_by', 'created_at');
create trigger keep_columns_immutable before update on public.fixed_obligations
  for each row execute function private.keep_columns_immutable('id', 'ledger_id', 'created_by', 'created_at');

------------------------------------------------------------------------------
-- Access
------------------------------------------------------------------------------

alter table public.tags enable row level security;
alter table public.cost_types enable row level security;
alter table public.estimated_costs enable row level security;
alter table public.actual_costs enable row level security;
alter table public.fixed_obligations enable row level security;

revoke all on public.tags, public.cost_types, public.estimated_costs, public.actual_costs, public.fixed_obligations
  from anon;
revoke delete, truncate, references, trigger
  on public.tags, public.cost_types, public.estimated_costs, public.actual_costs, public.fixed_obligations
  from authenticated;
