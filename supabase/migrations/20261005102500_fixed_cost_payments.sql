-- Fixed costs are paid by the actual costs recorded against them, not by a
-- flag (FR-FORECAST-2, D-167).
--
-- An actual cost may name the fixed cost it pays, in its own ledger. What a
-- fixed cost still needs is its amount minus the payments recorded against
-- it, so it never counts as both paid and upcoming, and a partial payment
-- leaves the rest upcoming. A payment may fall in another month than its
-- fixed cost, when a bill is paid early or late.

-- The target for the composite foreign key below.
alter table public.fixed_obligations
  add constraint fixed_obligations_id_ledger_id_key unique (id, ledger_id);

alter table public.actual_costs
  add column fixed_obligation_id uuid,
  add constraint actual_costs_fixed_obligation_in_ledger
    foreign key (fixed_obligation_id, ledger_id)
    references public.fixed_obligations (id, ledger_id);

-- Finds a fixed cost's payments.
create index actual_costs_fixed_obligation_id_idx
  on public.actual_costs (fixed_obligation_id)
  where fixed_obligation_id is not null;

-- The flag let a fixed cost count as both paid and upcoming. Dropping a synced
-- column in one step is safe only because nothing is deployed yet: no app or
-- device has synced it (SYNC5).
alter table public.fixed_obligations drop column paid;
