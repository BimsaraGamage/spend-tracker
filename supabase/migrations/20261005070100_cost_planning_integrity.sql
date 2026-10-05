-- Same-ledger and calendar rules for the cost planning tables (DATA3, DATA5,
-- NFR-SEC-1).
--
-- The cost tables' foreign keys only checked that a cost type exists, so a
-- cost in one ledger could point at another ledger's cost type. Composite
-- keys now require the cost type to belong to the cost's own ledger, the way
-- transactions and accounts already work (ADR-0007).

alter table public.cost_types
  add constraint cost_types_id_ledger_id_key unique (id, ledger_id);

alter table public.estimated_costs
  add constraint estimated_costs_cost_type_in_ledger
  foreign key (cost_type_id, ledger_id) references public.cost_types (id, ledger_id);
alter table public.actual_costs
  add constraint actual_costs_cost_type_in_ledger
  foreign key (cost_type_id, ledger_id) references public.cost_types (id, ledger_id);
alter table public.fixed_obligations
  add constraint fixed_obligations_cost_type_in_ledger
  foreign key (cost_type_id, ledger_id) references public.cost_types (id, ledger_id);

-- An actual cost's reporting month is the month of its calendar date in the
-- ledger's time zone (DATA3), so the two must agree.
alter table public.actual_costs
  add constraint actual_costs_month_matches_date
  check (
    month = lpad(extract(year from date)::text, 4, '0') || '-'
      || lpad(extract(month from date)::text, 2, '0')
  );
