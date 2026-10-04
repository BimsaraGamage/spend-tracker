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

-- Postgres lets everyone (PUBLIC) execute new functions, and a per-schema
-- ALTER DEFAULT PRIVILEGES can't revoke that global default. So every function
-- in these schemas revokes PUBLIC's EXECUTE explicitly, and a pgTAP guard
-- (supabase/tests/database/000_schema_security.test.sql) fails the build if
-- one is forgotten.

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

revoke execute on function private.set_updated_at() from public;
