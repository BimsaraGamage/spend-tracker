-- Add the audit trail to the cost planning tables.

create trigger record_change after insert or update or delete on public.tags
  for each row execute function audit.record_change();
create trigger record_change after insert or update or delete on public.cost_types
  for each row execute function audit.record_change();
create trigger record_change after insert or update or delete on public.estimated_costs
  for each row execute function audit.record_change();
create trigger record_change after insert or update or delete on public.actual_costs
  for each row execute function audit.record_change();
create trigger record_change after insert or update or delete on public.fixed_obligations
  for each row execute function audit.record_change();
