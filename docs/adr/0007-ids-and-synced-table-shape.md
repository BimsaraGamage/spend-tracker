# ADR-0007: Device-generated IDs and a fixed synced-table shape

- **Status:** Accepted
- **Date:** 2026-10-04
- **Decided by:** assistant during planning; confirmed by plan approval (journal D-29)

## Context

Rows are created offline on several devices, so the server can't hand out IDs. Deletions must sync, and stay recoverable.

## Decision

- **IDs:** every synced row gets a UUIDv7 generated on the device. UUIDv7 is time-ordered, which keeps indexes efficient.
- **Columns:** every synced table has `id`, `ledger_id`, `created_at`, `updated_at` and `deleted_at`.
- **Deletes are soft.** Sync Streams exclude deleted rows, so they disappear from devices but stay recoverable on the server.
- **Indexes:** every column used in a sync filter is indexed.

## Consequences

- Inserts work offline, and retries can't create duplicates ([ADR-0008](0008-write-path-and-conflicts.md)).
- Hard deletion happens only through documented retention or erasure jobs ([DATA6](../engineering-standards.md#4-domain-correctness-data)).
