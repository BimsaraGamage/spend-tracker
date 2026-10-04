# ADR-0014: Plain inserts for uploads, and no Postgres indexes for sync filters

- **Status:** Accepted
- **Date:** 2026-10-04
- **Decided by:** autopilot (journal D-137, D-143, D-147)
- **Supersedes:** the "Indexes" item of [ADR-0007](0007-ids-and-synced-table-shape.md), and the "Inserts are upserts" item of [ADR-0008](0008-write-path-and-conflicts.md). Everything else in both still stands.

## Context

Building the sync service and the upload connector proved two details of the earlier decisions wrong:

- **Upserts.** ADR-0008 made inserts upserts by primary key, so that retries are harmless. But Postgres checks read policies on the new row of `INSERT ... ON CONFLICT`, even with `DO NOTHING`. A new ledger isn't readable until a trigger adds its owner membership, which happens after the insert, so an upsert can't create a ledger.
- **Indexes.** ADR-0007 required an index on every column used in a sync filter. PowerSync evaluates sync filters on its own copy of the data, with its own lookup indexes, and doesn't query Postgres while it streams. Postgres indexes don't help those filters.

## Decision

- **Uploads insert new rows with plain inserts.** A retried insert that already arrived fails on its primary key (SQLSTATE `23505` on `<table>_pkey`), and that counts as applied. Retries stay harmless ([SYNC2](../engineering-standards.md#5-local-first-sync-sync)).
- **Local writes insert new rows and update existing ones.** They never `INSERT OR REPLACE` an existing row, which would upload as an insert and be ignored as a duplicate.
- **Indexes serve RLS policies and app queries,** in Postgres and in the device schema. Sync filters need none.

## Consequences

- The upload connector in `packages/data` treats a primary-key conflict on an insert as applied, and the sync integration tests upload the same new ledger twice to prove it.
- RLS stays as simple as before: no read rule for half-created ledgers.

## Alternatives considered

- **Let creators read a ledger that has no members yet,** so upserts work. It makes the most important access rule harder to reason about, to support a retry case that plain inserts already handle.
- **Create ledgers through a SQL function.** It works, but it gives one table a different upload path from all the others.
