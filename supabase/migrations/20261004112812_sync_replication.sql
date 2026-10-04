-- What the sync service may read (ADR-0004, SYNC6).
--
-- PowerSync copies ledger data to devices. It reads changes through Postgres
-- logical replication, from the publication named `powersync`, and connects
-- as `powersync_role`. Which user receives which rows is decided by the Sync
-- Streams in powersync/sync-config.yaml, which mirror the RLS policies.

-- The publication names each synced table instead of using FOR ALL TABLES, so
-- internal tables such as audit.events never leave the database, and the
-- service never processes changes it would throw away. Publish a table only
-- when devices need it (SYNC6), and grant powersync_role SELECT on it below.
-- supabase/tests/database/040_sync_replication.test.sql checks both.
create publication powersync for table
  public.ledgers,
  public.ledger_members,
  public.accounts,
  public.transactions;

-- The role the sync service connects as.
--
--   REPLICATION  Streams changes from the database. A replication role can
--                decode every change in the database, not only the published
--                tables, so its password is as sensitive as the service-role
--                key.
--   BYPASSRLS    The service copies every published row; it is a server, not
--                a user. The RLS policies apply to signed-in users only, so
--                without this attribute its first copy would be empty.
--   NOLOGIN      Nobody can connect as it until an operator sets a password
--                in that environment (docs/operations/sync-service.md), so no
--                password is ever stored in a migration or in the repository.
create role powersync_role with nologin replication bypassrls;

-- Read access to the published tables, and nothing else.
grant usage on schema public to powersync_role;
grant select on public.ledgers, public.ledger_members, public.accounts, public.transactions
  to powersync_role;
