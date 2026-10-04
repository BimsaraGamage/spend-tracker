# ADR-0005: Ledgers with members, isolated by RLS

- **Status:** Accepted
- **Date:** 2026-10-04
- **Decided by:** maintainer (journal D-03)

## Context

Each user starts alone, but shared budgets (a household, a partner) are likely later. Changing who owns rows after launch would mean re-keying all existing data.

## Decision

- Financial data belongs to a **ledger**. Users take part as **members**, with the role owner, editor or viewer. Every user gets a personal ledger.
- Every ledger table carries `ledger_id`.
- Postgres Row Level Security allows access only to members of that ledger, through a hardened membership helper ([SEC2](../engineering-standards.md#6-security-sec)).
- Sync Streams use the same membership filter ([SYNC6](../engineering-standards.md#5-local-first-sync-sync)).

## Consequences

- Shared ledgers become a feature, not a data migration.
- Every table, policy and query must carry `ledger_id`.
- Isolation must be proven by tests: other ledgers, each role, allowed and denied paths ([SEC1](../engineering-standards.md#6-security-sec)).

## Alternatives considered

- **Strictly per-user rows (`user_id`):** simpler policies, but sharing would need a migration.
