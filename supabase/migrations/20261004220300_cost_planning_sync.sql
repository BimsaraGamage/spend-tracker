-- Add the cost planning tables to the PowerSync publication.

alter publication powersync add table
  public.tags,
  public.cost_types,
  public.estimated_costs,
  public.actual_costs,
  public.fixed_obligations;

grant select on
  public.tags,
  public.cost_types,
  public.estimated_costs,
  public.actual_costs,
  public.fixed_obligations
to powersync_role;
