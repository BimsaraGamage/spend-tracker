# ADR-0012: Telemetry and privacy

- **Status:** Accepted
- **Date:** 2026-10-04
- **Decided by:** maintainer (journal D-15)

## Context

Crash reports help fix bugs, but a finance app must never leak amounts, payees or notes.

## Decision

- **Crash reporting:** Sentry. Every event passes a scrubber that removes financial and personal data, and tests prove the scrubbing.
- **Opt-out:** users can switch telemetry off, and self-hosters disable it by leaving the DSN empty.
- **No product analytics, and no advertising SDKs.**
- **Developer tools** run with their telemetry disabled in CI (Turborepo, and others as they're added).

## Consequences

- Errors are visible without collecting personal data.
- Every new event field needs a privacy review ([SEC11](../engineering-standards.md#6-security-sec)).
