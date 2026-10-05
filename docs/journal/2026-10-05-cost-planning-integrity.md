# 2026-10-05 · Cost planning: access tests and same-ledger integrity

### D-165 · Test the cost planning access rules, and keep costs inside their ledger

- **Context:** #32 added RLS policies for tags, cost types, estimated and actual costs, and fixed obligations, but no tests for them, although SEC1 requires tests for every policy. Its foreign keys only checked that a cost type exists. A throwaway database confirmed that a cost in one ledger could reference another ledger's cost type, and that an actual cost dated 25 December could be filed under October.
- **Options:**
  - ★ Add the missing access tests, plus composite foreign keys and a month check, following the existing pattern for transactions and accounts (DATA5, ADR-0007).
  - Wait for the open product decisions (P-01–P-07) first.
- **Decision:** The first option. Neither change depends on an open decision: both apply rules that already bind (SEC1, DATA3, DATA5, NFR-SEC-1).
- **Why:** Ledger isolation is the core security promise. A reference into another ledger, or a cost reported in the wrong month, would corrupt totals and exhaustion forecasts silently.
- **Action / outcome:**
  - `050_cost_planning_access.test.sql` (17 tests): owners can plan and record; viewers can read but not change; other users and anonymous users get nothing; costs can't be recorded in someone else's name or hard-deleted.
  - Migration `20261005070100_cost_planning_integrity.sql`: each cost table's `(cost_type_id, ledger_id)` must match a cost type in the same ledger, and an actual cost's `month` must be its date's month.
  - `051_cost_planning_integrity.test.sql` (5 tests) failed without the migration and passes with it.
  - Not changed, because they depend on open decisions: how tags are stored (P-02), whether amounts may be negative (P-07), and currency rules.
- **Lesson:** RLS decides who may write a row; constraints decide whether the row makes sense. Tests need to cover both, because each passes without the other.
