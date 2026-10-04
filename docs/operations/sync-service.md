# Sync service database access

PowerSync copies ledger data from Postgres to each device ([ADR-0004](../adr/0004-local-first-powersync-supabase.md)). This runbook covers what the database gives it, and how to connect an environment.

## What the migrations create

Migration `20261004112812_sync_replication.sql` creates:

- **The `powersync` publication.** It lists the synced tables one by one: `ledgers`, `ledger_members`, `accounts` and `transactions`. Internal tables such as `audit.events` are never published.
- **The `powersync_role` role**, which the service connects as. It has:
  - `REPLICATION`, to stream changes;
  - `BYPASSRLS`, because the service copies every published row and the Sync Streams decide who receives each one;
  - `SELECT` on the published tables, and no other privileges;
  - `NOLOGIN`. Nobody can connect as it until an operator sets a password in that environment, so no password is stored in the repository.

`supabase/tests/database/040_sync_replication.test.sql` checks all of this. It also checks that every published table has the synced-table columns ([SYNC1](../engineering-standards.md#5-local-first-sync-sync)).

To sync a new table:

1. In a migration, add it to the publication and grant `powersync_role` `SELECT` on it.
2. Add its Sync Stream in the same release.

## The password is a top-level secret

A replication role can decode every change in the database, not only the published tables. Treat its password like the service-role key:

- keep it only in the password manager and in the PowerSync instance's settings;
- never put it in the repository, in chat, or in CI logs.

## Connect an environment

Do this once per environment (staging, production). It needs the maintainer.

1. Generate a random password of at least 32 characters in the password manager. Name the entry "PowerSync replication (environment)".
2. Connect with `psql`, using the environment's direct connection details from the Supabase dashboard, and run:

   ```sql
   alter role powersync_role with login;
   \password powersync_role
   ```

   `\password` hashes the password on your machine, so the plain password never reaches the server's logs. Don't set it in the SQL editor with `alter role … password '…'`.

3. In the PowerSync dashboard, connect the instance to the database as `powersync_role`, with SSL mode `verify-full`. PowerSync already trusts Supabase's certificate authority.
   - Skip the dashboard's **Set Up with Supabase** button. The migrations already created the publication and the role, and the guided setup would try to create them again.

## Rotate the password

1. Run `\password powersync_role` again.
2. Update the PowerSync instance's connection, then the password manager entry.

The service's open connection keeps working after the change. Only its next reconnect needs the new password, so do step 2 promptly. Replication then resumes from where it stopped.

## Disconnect an environment

1. Run `alter role powersync_role with nologin;`.
2. Drop the replication slots the service leaves behind. An unused slot makes Postgres keep its write-ahead log forever, which eventually fills the disk. Supabase also allows only 4 slots per project.

   ```sql
   select slot_name, active from pg_replication_slots;
   select pg_drop_replication_slot('<inactive slot name>');
   ```
