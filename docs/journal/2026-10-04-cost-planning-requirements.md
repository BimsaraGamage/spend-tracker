# 2026-10-04 · Initial cost-planning requirements

### D-162 · Formalize the product brief as a requirements specification

- **Context:** Contributors need an initial cost-planning specification with verifiable acceptance criteria.
- **Options:** **(Recommended)** Extend the existing requirement IDs with a linked specification and acceptance scenarios; alternative: keep the brief only in chat or start implementing it immediately.
- **Decision:** Use the existing requirement system, following the maintainer's request for a formal, contributor-visible record.
- **Why:** Stable, testable requirements connect the user's intent to future code, tests and reviews. They also distinguish a requested capability from an implemented feature.
- **Confidence / uncertainty:** High confidence in the documentation structure. The requested capabilities are clear; several calculation semantics are not. No external dashboard algorithm was supplied.
- **Action:** Added [the cost-planning specification](../requirements/cost-planning.md), linked it from the initial requirements and project README, and preserved the walking-skeleton IDs. No application or schema behavior changed.
- **Lesson:** Define what success means before choosing how to store or implement it.

### D-163 · Keep unsettled calculation semantics visibly proposed

- **Context:** Tag and forecast semantics remain unresolved in the initial product brief.
- **Options:** **(Recommended)** Record recommended interpretations as proposals with examples and confirmation points; alternative: silently treat those interpretations as accepted business rules.
- **Decision:** Preserve the requested capabilities as source `brief`, and keep P-01–P-07 proposed under WF4.
- **Why:** Multiple tags can overlap, a monthly allocation differs from available cash, and a fixed obligation can be counted twice if its actual payment is also treated as future spending. The brief does not choose these semantics.
- **Confidence / uncertainty:** High confidence that these distinctions matter; medium or low confidence in the proposed product defaults, as recorded per proposal. The missing evidence is the intended reporting and forecasting behavior, not a tooling limitation.
- **Action:** Added acceptance examples for totals, tags, inline cost-type creation, ledger dates, sync retries and isolation; marked inheritance, combined-tag matching and forecast scenarios as proposed. Listed the decisions needed before dependent implementation.
- **Lesson:** A specification must distinguish assumptions from requirements. A transparent projection is more useful than an unexplained precise date.
