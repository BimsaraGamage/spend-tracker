# ADR-0001: Record architecture decisions

- **Status:** Accepted
- **Date:** 2026-10-04
- **Decided by:** maintainer (journal D-25, D-43)

## Context

The project is public and largely built with AI assistance. Contributors, and future maintainers, need to know _why_ the system is the way it is, not just what it does. Decisions made in chat are lost unless they're written down.

## Decision

- Architecture-significant decisions are recorded as short ADRs in `docs/adr/`, numbered `NNNN-<slug>.md`. "Significant" means hard to reverse, or shaping the structure.
- Accepted ADRs are immutable. A change of mind is a new ADR that supersedes the old one.
- The [decision journal](../journal/) records every decision, small ones included. ADRs link to the journal entries behind them.
- A new dependency category, or a reversal of an ADR, needs an ADR first ([ARC4](../engineering-standards.md#3-architecture-arc)).

## Consequences

- Reviews can point to the reasoning behind a design instead of re-debating it.
- Writing a short ADR becomes part of every significant change.

## Alternatives considered

- **Journal only:** too fine-grained to find the big decisions.
- **A wiki:** sits outside code review and version control, and the wiki is disabled.
