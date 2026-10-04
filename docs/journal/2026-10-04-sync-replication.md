# 2026-10-04 · Phase 1: database access for the sync service

### D-130 · A dedicated sync role, created by a migration without a password (autopilot)

- **Options:**
  - ★ A migration creates `powersync_role` with `NOLOGIN`, and an operator sets its password once per environment.
  - A setup script outside the migrations creates the role and its password.
  - The sync service connects as the `postgres` superuser, as PowerSync's local demo does.
- **Decision:** The first option (autopilot). The migration also creates the `powersync` publication, listing the four synced tables by name, and grants the role `SELECT` on those tables only.
- **Why:**
  - The role's privileges are versioned and tested together with the schema.
  - No password is ever stored in the repository.
  - The service gets the least access it needs.
  - Naming the tables, instead of `FOR ALL TABLES`, keeps internal tables such as `audit.events` inside the database. PowerSync also recommends it for production.
- **Action:** Migration `20261004112812_sync_replication.sql`, and the runbook [`docs/operations/sync-service.md`](../operations/sync-service.md). The threat model lists the replication password as an asset.
- **Lesson:** A replication role can decode every change in the database, so table grants limit what it reads directly, not what it can see. Treat its password as a top-level secret.

### D-131 · Guards that keep the publication and the role in step (autopilot)

- **Decision:** pgTAP checks, in `040_sync_replication.test.sql` (autopilot):
  - exactly the four ledger tables are published, with inserts, updates and deletes;
  - the role can read every published table, and holds no other privilege in the `public`, `private`, `audit` or `auth` schemas;
  - every published table has the synced-table columns (SYNC1);
  - the role has no administrative powers and inherits no other role.

  Probes show that each guard fails when it should.

- **Why:** Syncing a new table takes two coordinated changes: adding it to the publication and granting the role `SELECT`. Forgetting either one breaks replication or over-shares, so CI checks both.
- **Tested:** Before pushing, the suite ran against a throwaway local Postgres 17 with stand-ins for Supabase's roles and `auth` schema. That gave quick feedback without Docker; CI with the real Supabase stack remains the authority.

### D-132 · Set the replication password with `\password` (autopilot)

- **Decision:** The runbook sets the password with psql's `\password`, never with `alter role … password '…'` in the SQL editor (autopilot).
- **Why:** `\password` hashes the password on the operator's machine, so the plain text never reaches the server, its logs or the editor's history.
- **Lesson:** Where a secret is typed matters as much as where it's stored.
