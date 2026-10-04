# 2026-10-04 · Phase 1: Sync Streams and the local sync service

### D-133 · One stream for everything in the user's ledgers (autopilot)

- **Options:**
  - ★ One auto-subscribed stream, `ledger_data`: a shared filter (`my_ledgers`) and one query per table. Each ledger becomes one bucket, and a device holds one subscription.
  - One stream per table: four buckets per ledger, and four subscriptions.
  - On-demand streams, subscribed per ledger, that sync only the ledger on screen.
- **Decision:** The first option (autopilot).
- **Why:**
  - A finance app needs all of the user's ledgers offline.
  - One bucket per ledger keeps each user far below PowerSync's limit of 1,000 buckets.
- **Rule:** The filter mirrors the RLS helper `private.has_ledger_role`. A user receives a ledger's data only while both their membership and the ledger are active, using the same join.
- **Lesson:** Sync streams are a second authorization layer, next to RLS. Write them from the same rule, so a review can compare the two line by line.

### D-134 · Streams list their columns, and never send `deleted_at` (autopilot)

- **Options:** ★ Explicit column lists, or `SELECT *`.
- **Decision:** Explicit lists (autopilot). SYNC6 now requires them.
- **Why:**
  - A column added later reaches devices only when someone adds it to a stream on purpose.
  - Devices never need `deleted_at`: soft-deleted rows don't sync, and a local delete becomes a soft delete when it's uploaded (ADR-0008).
- **Lesson:** Default-deny applies to columns, not only to rows.

### D-135 · A local PowerSync service, checked in CI (autopilot)

- **Options:**
  - ★ PowerSync's self-hosted service in Docker Compose. It joins the Supabase CLI's network, and keeps its bucket storage in a separate Postgres that's rebuilt on every start.
  - A PowerSync Cloud development instance. It needs an account, and free instances pause when idle.
  - Validating the YAML with PowerSync's compiler only. That proves the syntax, but not that replication works.
- **Decision:** The first option (autopilot).
  - The service connects as `powersync_role`, not as the superuser, so CI proves the least-privilege role is enough.
  - The image is pinned by version and digest (1.26.1, released 2026-09-14).
  - Telemetry sharing is off.
  - The passwords and the admin token are random for each run, stored in a git-ignored `powersync/.env`.
  - The service listens on loopback only.
- **Action:** A new CI job, `sync`, starts the database, Auth and the service. Through the diagnostics API, it checks that the first copy finished with no errors or warnings. `required` now waits for it.
- **Tested:** Docker isn't installed on this laptop, so the end-to-end run happens in CI. Before pushing:
  - the sync config compiled without problems in PowerSync's own compiler (`@powersync/service-sync-rules` 0.42.0, the version inside service 1.26.1), against the tables' columns;
  - `service.yaml` validated against the service's JSON schema;
  - `enable-replication.sql` ran against a throwaway Postgres 17.
  - `compose.yaml` validated against the Compose specification's schema.
  - ShellCheck found nothing in the scripts.
- **Caught before CI:** Parsing `compose.yaml` showed that the unquoted health-check command was being read as a key-value pair instead of a string. In YAML, a colon followed by a space inside an unquoted value starts a mapping (here, the `0 : 1` of a JavaScript ternary). The command is now quoted.
- **Lesson:** Quote any YAML value that contains code.

### D-136 · Local sessions use the development secret, not signing keys (autopilot)

- **Options:**
  - ★ The local Supabase stack's HS256 development secret, read from `supabase status`.
  - Asymmetric ES256 signing keys locally, like hosted projects. Every contributor and every CI run would have to generate a key file before `supabase start`, which fails without it.
- **Decision:** The development secret (autopilot). PowerSync Cloud verifies hosted projects' asymmetric keys by itself.
- **Why:** No setup step for contributors. The difference from production is tested where it matters: on staging.
- **Lesson:** Parity with production is valuable, but not when it adds a way for every contributor's first run to fail. Test the difference in one place instead.

### D-137 · Correct SYNC1: Postgres indexes don't serve sync filters (autopilot)

- **Before:** SYNC1 said every column used in a sync-stream filter must be indexed.
- **Finding:** PowerSync evaluates stream filters on its own copy of the data, with its own lookup indexes. It doesn't query the source database while streaming.
- **Decision:** SYNC1 now says to index the columns that RLS policies and app queries filter on, in Postgres and on the device (autopilot).
- **Lesson:** Write rules from how a tool actually works. I had assumed sync filters ran as database queries.
