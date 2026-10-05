# 2026-10-05 · Cost planning: database rework

How the database applies the maintainer's cost planning decisions (D-166–D-176). These are implementation choices inside those decisions, so the assistant made them without a separate question. ★ marks the option taken.

### D-177 · How a payment names its fixed cost

- **Context:** D-167 replaces the `paid` flag from #32 with payments recorded against the fixed cost, including partial payments.
- **Options:** ★ An optional link from an actual cost to the fixed cost it pays, in the same ledger · a separate payments table between them · keep the flag beside the link
- **Decision:** The link on the actual cost (assistant).
- **Why:** A payment is an actual cost, so it syncs and uploads as one row. A composite foreign key keeps it in its own ledger, as for cost types (D-165). A fixed cost's unpaid remainder is its amount minus its payments, so it can't count as both paid and upcoming.
- **Action / outcome:**
  - Migration `20261005102500_fixed_cost_payments.sql` adds `actual_costs.fixed_obligation_id` and drops `fixed_obligations.paid`. The sync streams, the device schema and the sync tests stop using the flag.
  - Dropping a synced column in one step breaks SYNC5's expand-and-contract rule, which protects devices running an older app. It's safe here only because nothing is deployed yet.
  - A payment may fall in another month than its fixed cost, for bills paid early or late. A payment recorded offline is kept even if another device deleted its fixed cost meanwhile.
  - `052_fixed_cost_payments.test.sql` (6 tests).

### D-178 · One budget per month

- **Context:** FR-PLAN-3 asks for a budget for each month, and the forecast needs a single amount. Two offline devices could both set October's budget.
- **Options:**
  - ★ At most one current budget per ledger and month, enforced by a unique index. The second device's upload is refused and shown to the user, and that device then receives the first budget.
  - An ID derived from the ledger and month. The second upload would count as already applied, silently losing its amount.
  - Allow several budgets and add them up.
- **Decision:** One current budget per month (assistant).
- **Why:** A refusal the user can see is better than losing an amount silently (SYNC3). Adding budgets up would make "the budget" ambiguous.
- **Action / outcome:** Migration `20261005102600_monthly_budgets.sql`. A deleted budget can be replaced, and a budget can't move to another month. `053_monthly_budgets.test.sql` (9 tests) and the access tests in `050`. The sync streams and the device schema add the table in the device PR.

### D-179 · Enforcing the base currency with foreign keys

- **Context:** D-172 and D-176: costs are in the ledger's base currency, and the base currency is locked once the ledger has costs.
- **Options:**
  - ★ Composite foreign keys from each cost table to `(ledgers.id, base_currency)`.
  - A security definer trigger that compares each row with its ledger, plus a second trigger for the lock.
- **Decision:** Foreign keys (assistant).
- **Why:**
  - Foreign keys follow the existing pattern for a transaction and its account's currency (DATA2, DATA5), and need no security definer code.
  - The same keys implement the lock: a ledger's base currency can't change while any cost row refers to it, deleted rows included.
  - Postgres checks foreign keys after RLS. A test showed that the trigger version runs before RLS, so a user without access could learn the ledger's base currency from its error.
- **Action / outcome:** Migration `20261005102700_cost_value_rules.sql`. A wrong currency or a locked change raises `23503`, which devices treat as a permanent rejection. `054_cost_value_rules.test.sql` (17 tests).

### D-180 · Checking tag lists

- **Context:** D-175 keeps tags as a list on each row, which the database must check. #32 accepted any JSON (D-169).
- **Options:**
  - ★ A trigger that runs as the user, plus a check that the list is an array.
  - A security definer trigger.
  - No check until the device connector is fixed.
- **Decision:** A trigger that runs as the user (assistant).
- **Why:**
  - The trigger runs as the user, so it finds only tags they may read: another ledger's tag looks the same as a missing one. A test showed that a security definer version tells a user without access which tags exist.
  - Deleted tags are still accepted, so a cost recorded offline isn't lost when another device deleted its tag.
  - Tag IDs must be lowercase, because devices compare them as text.
- **Action / outcome:**
  - Migration `20261005102800_cost_tag_lists.sql`: at most 50 distinct tags per list. Like the existing name and note lengths, the limit is provisional; it bounds the work each check does.
  - `055_cost_tag_lists.test.sql` (16 tests).
  - The sync tests now upload lists as JSON arrays. The device connector still sends the text the device stores, so the device PR must parse it before upload.

### D-181 · Smaller safeguards added on the way

- **Context:**
  - Estimated and fixed costs accepted months such as `2026-13`.
  - Nothing checked that a new synced table records the audit trail (DATA7).
- **Options:** ★ Add both checks now · leave them for later
- **Decision:** Add them now (assistant).
- **Why:** Both are small and cover the new tables of this rework.
- **Action / outcome:**
  - The value rules migration also requires real months.
  - `030_audit_trail.test.sql` checks that every synced table has the audit trigger. A probe table without it confirms the check can fail.
- **Lesson:** Test the order of the checks, not only the checks. The trigger designs in D-179 and D-180 passed every rule test. Only the tests of what another user sees caught their leaks, and only when run against those designs, as TEST6 asks.
