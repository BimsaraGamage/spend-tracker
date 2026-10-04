# 2026-10-04 · Phase 1: proving what each user's devices receive

### D-138 · Test sync isolation end to end, with real sessions (autopilot)

- **Options:**
  - ★ Integration tests that use the whole local stack the way the app will. Users get real sessions from Supabase Auth, write through the REST API as themselves, and read through PowerSync's sync endpoint as a new device would.
  - The same tests through PowerSync's Node.js SDK. That's closer to the app, but it needs a native SQLite build at install time, which the dependency rules (`strictDepBuilds`) would have to allow.
  - Tokens minted by the test itself, without Supabase Auth. Simpler, but it would skip checking that PowerSync accepts the tokens Auth really issues.
- **Decision:** The first option (autopilot). The tests read the sync protocol directly, in about 100 lines.
- **What they prove:**
  - a user receives exactly their ledger, membership, account and transaction;
  - nothing from another user's ledger arrives, checked only after both ledgers have replicated, so the check can't pass just because data hasn't arrived yet;
  - devices get exactly the listed columns, never `deleted_at`, with amounts as integers and dates as calendar dates;
  - soft-deleting a transaction, or a whole ledger, removes it from devices;
  - a garbage or forged session token is refused.
- **Why:** NFR-SEC-1 asks for ledger isolation to be proven by automated tests, through the API and through sync. The pgTAP suite covers the API side; these tests cover sync.
- **Tested before pushing:** The sync-protocol reader ran against a fake endpoint. It applied inserts, removals and a bucket reset, handled lines split across network chunks, and returned at the first complete checkpoint without waiting for the stream to close.

### D-139 · `powersync/` becomes a workspace package (autopilot)

- **Decision:** `@spend-tracker/sync` (autopilot):
  - its tests are linted and type-checked with the rest of the workspace;
  - they use the app's own ID generator from `@spend-tracker/core`;
  - they run with `pnpm --filter @spend-tracker/sync test:integration`, only in the `sync` CI job, which now also starts the API gateway and the REST API.
- **Why:** The script is deliberately not named `test`, so `pnpm test` stays fast and needs no Docker.

### D-140 · The owner soft-deletes the ledger in the access tests (autopilot)

- **Finding:** Writing the sync test showed a gap in `020_access_rules.test.sql`. Its last check soft-deleted a ledger as the database owner, so nothing proved that a ledger's owner may do it through RLS.
- **Decision:** That step now runs as the owner, as a test of its own (autopilot). The pair of checks also catches an update that RLS silently skips, because the next check expects the ledger's data to be hidden.
- **Lesson:** A setup step run as the database owner proves nothing about permissions. Act as the user for every step that should be true for users.
