# ADR-0004: Local-first with PowerSync and Supabase

- **Status:** Accepted
- **Date:** 2026-10-04
- **Decided by:** maintainer (journal D-02, D-06)

## Context

The app must work offline, feel instant, and keep data consistent across a user's devices. It must also be self-hostable and cost nothing to run for one person.

## Decision

- **Working copy:** each device keeps its own SQLite database, and the UI reads and writes it locally.
- **Download:** PowerSync replicates data from Supabase Postgres to each device. Its Sync Streams send each user only the ledgers they're a member of.
- **Upload:** local writes go into PowerSync's upload queue and are applied to Supabase, where RLS and constraints check them ([ADR-0008](0008-write-path-and-conflicts.md)).
- **Source of truth:** Postgres holds the master copy.

## Consequences

- Offline use and instant screens. Server load grows with active users rather than with total data.
- The hard work moves to sync edge cases: conflicts, rejected uploads, and schema changes reaching offline devices ([SYNC rules](../engineering-standards.md#5-local-first-sync-sync)).
- Free tiers of both services pause after about 7 idle days.
- Self-hosters run Supabase plus the PowerSync Open Edition. PowerSync's server is source-available under the FSL licence; its client SDKs are Apache-2.0 and MIT.

## Alternatives considered

- **Cloud database, online-first:** simpler, but offline use is limited.
- **Device-only:** no sync between phone and browser, and browser storage can be evicted.
- **End-to-end encrypted sync:** strongest privacy, but no server-side reports, and a lost password means lost data.
- **Other sync engines** (ElectricSQL, Zero, LiveStore): less mature on React Native at the time of the decision.
