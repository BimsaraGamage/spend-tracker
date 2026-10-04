# Sync service (PowerSync)

PowerSync copies each user's ledgers from Postgres to their devices ([ADR-0004](../docs/adr/0004-local-first-powersync-supabase.md)).

| File                     | What it is                                                                                      |
| ------------------------ | ----------------------------------------------------------------------------------------------- |
| `sync-config.yaml`       | The Sync Streams: which rows reach which user. Used by PowerSync Cloud and by the local service |
| `service.yaml`           | Settings for the local service                                                                  |
| `compose.yaml`           | The local service and its storage, as containers                                                |
| `enable-replication.sql` | Lets the database role `powersync_role` sign in, locally                                        |
| `up.sh`, `check.sh`      | Start the local service; check that it's healthy                                                |
| `tests/`                 | Integration tests: what each user's devices receive and send                                    |

Staging and production run on PowerSync Cloud. Connecting them is a manual step for the maintainer: see the [runbook](../docs/operations/sync-service.md).

## Run it locally

You need Docker and the [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started).

```sh
supabase start
./powersync/up.sh     # starts the service at http://127.0.0.1:8080
./powersync/check.sh  # checks that it replicates without errors
pnpm --filter @spend-tracker/sync test:integration
```

The tests sign users in, write through the REST API as those users, and read through the sync endpoint, as a new device would. They check that each user receives exactly their own ledgers, with exactly the columns of the device schema in `packages/data`, and that soft-deleted rows leave their devices. They also send device changes through the app's upload connector, and check what happens to accepted, retried and refused changes.

Each start rebuilds the service's storage from the database, and writes fresh secrets to `powersync/.env`, which git ignores.

To stop it: `docker compose --file powersync/compose.yaml down`.

## Change what syncs

1. Edit `sync-config.yaml`. Keep it in step with the RLS read policies in `supabase/migrations`.
2. To sync a new table, add it to the `powersync` publication and grant `powersync_role` `SELECT` on it, in a migration.
3. Add or update a test in `tests/`.
4. Restart the service with `./powersync/up.sh`, then run the check and the tests. CI runs both on every pull request.
