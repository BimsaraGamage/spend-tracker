# 2026-10-04 · Phase 1: audit trail

### D-129 · Audit trail written only by a trigger (autopilot)

- **Decision:** `audit.events` lives in the `audit` schema, which clients can't access (autopilot).
  - A security-definer trigger on all four ledger tables records every change, with who made it (`auth.uid()`, or null without a signed-in user), what (table, row, ledger, action), and the row before and after as JSON.
  - The table also has RLS with no policies and no client privileges, as defense in depth.
- **Why:** NFR-SEC-5 and DATA7. Because only the trigger writes, the trail can't be forged or skipped by application code, and clients can't read or erase it.
- **Tested:**
  - Clients can't read, insert, update or delete audit rows.
  - Every change is recorded, including the owner membership created automatically by a trigger.
  - Before and after values are captured.
  - Changes made without a signed-in user have no actor.
- **Detail:** The owner-membership trigger writes its own audit row _inside_ the ledger-insert trigger, so event order is an implementation detail. The test compares events as a multiset (`bag_eq`), not an ordered list.
- **Follow-up:** Retention and an owner-facing activity view come with the requirements. Audit rows are personal data, so they count toward the export and deletion requirements (SEC11).
