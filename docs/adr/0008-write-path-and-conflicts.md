# ADR-0008: Write path, upload errors and conflicts

- **Status:** Accepted
- **Date:** 2026-10-04
- **Decided by:** assistant during planning; confirmed by plan approval (journal D-29)

## Context

Writes made offline are uploaded later, possibly more than once and possibly in conflict with other devices. A single bad change must not block everything behind it.

## Decision

- **How uploads are applied:** through supabase-js, under RLS.
  - Inserts are plain inserts. A retried insert that already arrived fails on its primary key, which counts as applied, so retries are harmless.
  - Deletes become soft deletes.
- **Upload errors:**
  - Transient errors (network, timeouts, 5xx responses) retry with backoff.
  - Permanent errors (constraint or RLS violations, validation failures) leave the queue, are recorded on the device and are shown to the user.
- **Conflicts:** last write wins per row.
- **History:** audit triggers record every change, with before and after values. Clients can't write the audit log.
- **Multi-row operations** such as transfers run as SQL functions, so they apply atomically.

## Amendments

- **2026-10-04 (journal D-143):** inserts were planned as upserts. Postgres checks read policies on the new row of `INSERT ... ON CONFLICT`, and a new ledger isn't readable until its owner membership exists, so an upsert can't create a ledger. Inserts became plain inserts, with a primary-key conflict counting as applied.

## Consequences

- The queue never stalls, and no change is lost silently ([SYNC3](../engineering-standards.md#5-local-first-sync-sync)).
- Last write wins can overwrite a concurrent edit of the same row. The audit log keeps the overwritten value; field-level merging can come later if shared ledgers need it.
