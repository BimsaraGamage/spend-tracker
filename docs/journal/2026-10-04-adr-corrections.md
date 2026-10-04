# 2026-10-04 · Correcting ADRs the way ADR-0001 requires

### D-147 · An ADR correction is a new ADR, not an edit (autopilot)

- **Finding:** In #25 I edited ADR-0007 and ADR-0008 in place, to fix the sync-filter indexes (D-137) and the upsert (D-143). ADR-0001, the maintainer's decision (D-25, D-43), makes accepted ADRs immutable: a change of mind is a new ADR that supersedes the old one.
- **Decision:** Both ADRs have their original text back, with the status "Accepted, partly superseded by ADR-0014" (autopilot). ADR-0014 supersedes only the two items that proved wrong, and says that everything else still stands.
- **Lesson:** Before changing a record, read the rules that govern it. The engineering standards are living rules and change in place; ADRs are history and don't.
