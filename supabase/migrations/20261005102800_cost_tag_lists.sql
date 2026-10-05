-- A tag list holds distinct tags of the row's own ledger (FR-TAG-1–2,
-- NFR-SEC-1, D-168, D-175).
--
-- Cost types and costs keep their tags as a JSON array of tag IDs, so a cost
-- and the tags it was recorded with sync and upload as one row. No foreign key
-- can check an array, so a trigger does:
-- - the list is an array of at most 50 distinct, lowercase tag IDs;
-- - each ID names a tag in the row's ledger. Deleted tags still count: a device
--   that was offline may record a cost with a tag another device deleted.
-- Malformed lists raise check_violation and other ledgers' or unknown tags
-- foreign_key_violation, which devices treat as permanent rejections (SYNC3).

alter table public.cost_types
  add constraint cost_types_tag_ids_check check (jsonb_typeof(tag_ids) = 'array');
alter table public.estimated_costs
  add constraint estimated_costs_tag_ids_check check (jsonb_typeof(tag_ids) = 'array');
alter table public.actual_costs
  add constraint actual_costs_tag_ids_check check (jsonb_typeof(tag_ids) = 'array');

-- Not security definer: the lookup runs as the user, so it finds only tags
-- they may read. Another ledger's tags look the same as tags that don't
-- exist, and the error reveals nothing about them.
create function private.check_tag_ids()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  element jsonb;
  tag_id uuid;
  seen uuid[] := '{}';
begin
  if jsonb_typeof(new.tag_ids) <> 'array' then
    raise exception '%.tag_ids must be a JSON array', tg_table_name
      using errcode = 'check_violation';
  end if;
  if jsonb_array_length(new.tag_ids) > 50 then
    raise exception '%.tag_ids can list at most 50 tags', tg_table_name
      using errcode = 'check_violation';
  end if;

  for element in select value from jsonb_array_elements(new.tag_ids) loop
    if jsonb_typeof(element) <> 'string'
      or (element #>> '{}') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
      raise exception '%.tag_ids must list lowercase tag IDs', tg_table_name
        using errcode = 'check_violation';
    end if;
    tag_id := element #>> '{}';
    if tag_id = any (seen) then
      raise exception '%.tag_ids lists tag % more than once', tg_table_name, tag_id
        using errcode = 'check_violation';
    end if;
    if not exists (
      select from public.tags as tag
      where tag.id = tag_id and tag.ledger_id = new.ledger_id
    ) then
      raise exception '%.tag_ids lists tag %, which isn''t in this ledger', tg_table_name, tag_id
        using errcode = 'foreign_key_violation';
    end if;
    seen := seen || tag_id;
  end loop;
  return new;
end;
$$;
revoke execute on function private.check_tag_ids() from public;

create trigger check_tag_ids before insert or update of tag_ids on public.cost_types
  for each row execute function private.check_tag_ids();
create trigger check_tag_ids before insert or update of tag_ids on public.estimated_costs
  for each row execute function private.check_tag_ids();
create trigger check_tag_ids before insert or update of tag_ids on public.actual_costs
  for each row execute function private.check_tag_ids();
