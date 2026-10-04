-- Internal schemas that the API never exposes (supabase/config.toml exposes
-- only `public`).
--
-- private  Helper functions used by RLS policies and triggers (SEC2).
-- audit    The audit log, written only by triggers (DATA7). Clients have
--          no access to it at all.

create schema private;
create schema audit;

revoke all on schema private from public, anon, authenticated;
revoke all on schema audit from public, anon, authenticated;

-- RLS policies run as the signed-in user and call helpers in `private`, so
-- signed-in users need USAGE on the schema. EXECUTE is granted per function.
grant usage on schema private to authenticated;

-- Postgres lets everyone (PUBLIC) execute new functions by default. Turn that
-- off for both schemas, so every grant is explicit.
alter default privileges in schema private revoke execute on functions from public;
alter default privileges in schema audit revoke execute on functions from public;

-- Keeps updated_at current on every update (SYNC1, ADR-0007).
create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
