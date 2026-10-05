-- The values cost planning rows may hold (FR-PLAN-4, DATA1–3, D-172, D-176).
--
-- - Amounts are positive. Refunds will be recorded against the expense they
--   refund, never as negative costs.
-- - Amounts are in the ledger's base currency, so totals never add up
--   different currencies. Composite foreign keys enforce it, as they do for a
--   transaction and its account's currency (DATA2, DATA5).
-- - The same keys lock a ledger's base currency once it has cost rows,
--   deleted ones included: they're still part of its history.
-- - Months are real months. An actual cost's month already follows its date
--   (20261005070100).
-- Violations raise class 23 errors, which devices treat as permanent
-- rejections (SYNC3).

-- The target for the base-currency foreign keys below.
alter table public.ledgers
  add constraint ledgers_id_base_currency_key unique (id, base_currency);

alter table public.estimated_costs
  drop constraint estimated_costs_amount_minor_check,
  add constraint estimated_costs_amount_minor_check
    check (amount_minor between 1 and 9007199254740991),
  drop constraint estimated_costs_month_check,
  add constraint estimated_costs_month_check
    check (month ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  add constraint estimated_costs_in_base_currency
    foreign key (ledger_id, currency) references public.ledgers (id, base_currency);

alter table public.actual_costs
  drop constraint actual_costs_amount_minor_check,
  add constraint actual_costs_amount_minor_check
    check (amount_minor between 1 and 9007199254740991),
  add constraint actual_costs_in_base_currency
    foreign key (ledger_id, currency) references public.ledgers (id, base_currency);

alter table public.fixed_obligations
  drop constraint fixed_obligations_amount_minor_check,
  add constraint fixed_obligations_amount_minor_check
    check (amount_minor between 1 and 9007199254740991),
  drop constraint fixed_obligations_month_check,
  add constraint fixed_obligations_month_check
    check (month ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  add constraint fixed_obligations_in_base_currency
    foreign key (ledger_id, currency) references public.ledgers (id, base_currency);

alter table public.monthly_budgets
  add constraint monthly_budgets_in_base_currency
    foreign key (ledger_id, currency) references public.ledgers (id, base_currency);
