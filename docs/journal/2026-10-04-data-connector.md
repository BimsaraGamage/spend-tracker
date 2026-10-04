# 2026-10-04 · Phase 1: the device schema and the upload connector

### D-142 · A platform-neutral `packages/data` (autopilot)

- **Options:**
  - ★ A package built only on `@powersync/common` and supabase-js, with both as peer dependencies. The app supplies the platform's PowerSync database (React Native or web).
  - The schema and connector inside the app.
- **Decision:** The first option (autopilot). `@spend-tracker/data` holds the device schema (`AppSchema`) and the connector (`SupabaseConnector`).
- **Why:** ARC1 keeps logic out of the app, so a second client, such as the web fallback in ADR-0003, can reuse it. Peer dependencies mean the app and this package share one copy of each library, and the catalog pins both versions in one place.
- **Detail:** The package's TypeScript settings include the DOM library, for `fetch`, `Response` and `AbortController`. Every platform the app runs on provides these.

### D-143 · Plain inserts, not upserts (autopilot)

- **Finding:** Before writing the connector, I tried an upsert of a new ledger as its owner on a throwaway Postgres. Row level security refused it: Postgres checks read policies on the new row of `INSERT ... ON CONFLICT`, even with `DO NOTHING`. A new ledger isn't readable until the trigger has added its owner membership, which happens after the insert. A plain insert works.
- **Options:**
  - ★ Plain inserts. A retried insert that already arrived fails with a primary-key conflict (`23505` on `<table>_pkey`), which counts as applied.
  - Loosen the ledgers read policy, so creators can read a ledger that has no members yet.
  - Create ledgers through a SQL function.
- **Decision:** Plain inserts (autopilot). SYNC2 and ADR-0008 are amended.
- **Why:** Retries stay harmless, and the access rules stay as simple as they are.
- **Rule that follows:** Local writes insert new rows and update existing ones. An `INSERT OR REPLACE` of an existing row would upload as an insert, and its changes would be ignored as a duplicate.
- **Lesson:** "Upserts make retries idempotent" was true until it met row level security. Try the assumption against the real rules before building on it.

### D-144 · What the connector does with each kind of answer (autopilot)

- **Decision** (autopilot):

  | The server's answer                                                           | What happens                                      |
  | ----------------------------------------------------------------------------- | ------------------------------------------------- |
  | Success                                                                       | Applied                                           |
  | Primary-key conflict on an insert                                             | Applied: an earlier attempt already arrived       |
  | SQLSTATE class 22 or 23, or `42501`                                           | Refused: recorded on the device, upload moves on  |
  | An update that changed zero rows                                              | Refused as `not_applied`: RLS skipped it silently |
  | A soft delete that changed zero rows                                          | Applied: the row is already gone for this user    |
  | Anything else: network failure, server error, expired session, unknown column | Retried: the transaction stays queued             |

- **Detail:**
  - Refusals go to `upload_rejections`, a table that exists only on the device. Its row ID comes from the change's place in the queue, so a retry doesn't record the same refusal twice.
  - Uploads never send the columns the server maintains: `created_at`, `updated_at`, `deleted_at`.
- **Why:** SYNC3: one bad change never blocks the queue, and no change disappears without the user being told.
- **Lesson:** Row level security doesn't raise an error when an update targets a row the user can't change; it changes nothing. Count the rows an update changed, or the refusal is silent.

### D-145 · The connector depends on a narrow Supabase interface (autopilot)

- **Finding:** The repository has no generated database types yet, so `createClient` returns a client typed with `any`. The strict lint rules reject passing it where the default `SupabaseClient` type is expected.
- **Decision:** The connector accepts `SupabaseApi`: only `auth.getSession`, `insert`, and `update(...).eq("id", ...)` (autopilot). A real client fits it without casts.
- **Why:** It also documents exactly what the connector uses, and keeps the tests honest. They use the real supabase-js client, with only its network answered by a script.
- **Follow-up:** Generate the database types from the local stack in CI, for typed queries in the app.

### D-146 · The device schema is the contract, checked end to end (autopilot)

- **Decision:** The sync integration tests now compare every synced row with `AppSchema`: no column more, none less (autopilot). New integration tests send device changes through the real connector:
  - a new ledger reaches the server and syncs back, and uploading it twice is harmless;
  - a refused change is recorded, and the rest of the transaction still uploads;
  - another user's update changes nothing, and is recorded as not applied;
  - a delete becomes a soft delete, and the row leaves the user's devices.
- **Why:** The upsert finding (D-143) shows what can go wrong between a device and the database. These tests cover that path the way the app will use it.
