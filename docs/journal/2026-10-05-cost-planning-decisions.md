# 2026-10-05 · Cost planning: product decisions

The maintainer settled the open questions of the [cost-planning specification](../requirements/cost-planning.md) (P-01–P-07) and the follow-up questions they raised. ★ marks the option the assistant recommended.

### D-166 · What the "running out" estimate measures (P-04)

- **Question:** Should the exhaustion forecast track a monthly spending budget, or the money in your accounts?
- **Options:** ★ A monthly budget you confirm, suggested from your estimates · money in chosen accounts, with expected income · both, budget first
- **Decision:** Both, budget first (maintainer).
- **Why:** The brief compares the forecast to usage dashboards: a quota that resets. A monthly budget gives that experience now; an account view needs balances and income recorded first.
- **Action / outcome:** FR-PLAN-3 (a monthly budget, suggested from the month's estimates), FR-FORECAST-1 (when the budget runs out), and FR-FORECAST-3, marked later (money in accounts).

### D-167 · How fixed costs enter the forecast (P-05)

- **Question:** How should fixed costs, such as rent, enter the forecast graph, and how do they count as paid?
- **Options:** ★ A due day, paid by recording an actual cost against it · reserve every fixed cost on day 1 · a manual "paid" tick box (what #31/#32 built)
- **Decision:** A due day, paid by a matched actual cost (maintainer).
- **Why:** A large bill should show as a drop on its due day. Linking the payment means a fixed cost can never count as both paid and upcoming, which a separate tick box allowed.
- **Action / outcome:** FR-FORECAST-2. Partial payments leave the unpaid remainder projected; an unpaid fixed cost past its due day is projected as due today. The `paid` flag from #32 is replaced by payments linked to the fixed cost.

### D-168 · Tag history and multiple tags (P-02, P-03)

- **Question:** When a cost type's tags change, should past costs follow? (One-way door: it decides how tags are stored.)
- **Options:** ★ Keep history: a cost keeps the tags it had when recorded · follow the cost type's current tags
- **Decision:** Keep history (maintainer). The stated defaults for multiple tags were kept: **any** and **all** matching, each cost counted once, and Untagged for costs with no tags.
- **Why:** Past months' reports must not change when a tag is edited.
- **Action / outcome:** A new cost records its own tags plus its type's tags at that moment (FR-TAG-2). #31 inherited the type's current tags dynamically; the rework replaces that.

### D-169 · Handling #31 and #32

- **Question:** How should the cost planning code merged in #31 and #32 be handled?
- **Context:** Another session merged them while the maintainer was away. They implemented the specification's recommended answers before the maintainer confirmed them (WF4). A review found defects: the forecast graph dropped every fixed cost once one was overdue; the exhaustion day came a day early; with several fixed costs it could pick the wrong day; tag lists could be corrupted on upload; and the access rules had no tests (fixed by #33).
- **Options:** ★ Merge #33, then rework #31/#32 to match the decisions · merge #33 and patch the bugs only · revert #31/#32
- **Decision:** Merge #33, then rework (maintainer).
- **Why:** The confirmed decisions change the forecast and tag model, so patching the old design would be wasted work.
- **Action / outcome:** #33 merged. The rework is planned as small PRs: database, calculations in `packages/core`, then the device schema and sync, with tests from the acceptance scenarios.

### D-170 · How estimates are entered (P-01)

- **Question:** Do you enter one estimate per cost type, or several planned items under each?
- **Options:** ★ Planned items per cost type, each with its own tags · one amount per cost type per month
- **Decision:** Planned items per cost type (maintainer).
- **Why:** The brief asks for tags on individual costs. A single item per type still works.
- **Action / outcome:** FR-PLAN-1–2: a cost type's estimate is the sum of its planned items. Actual costs without an estimate are shown as unplanned (FR-ACT-3).

### D-171 · How variable spending is projected (P-06)

- **Question:** How should the forecast estimate your future day-to-day spending?
- **Options:** ★ This month's average daily variable spending, with fixed costs excluded · the planned pace (remaining estimates spread evenly) · the last 28 days, across months
- **Decision:** This month's average (maintainer).
- **Why:** It's simple to explain and to check by hand.
- **Action / outcome:** Days without spending count; payments of fixed costs are excluded. Below three days of data the forecast says so, and projects fixed costs only (AC-07).

### D-172 · Currencies and refunds (P-07)

- **Question:** Which money movements count as costs, and in which currency?
- **Options:** ★ The ledger's base currency only for now; a refund reduces the original expense; transfers and income never count · base currency, with refunds shown separately · other currencies, converted with a recorded rate
- **Decision:** Base currency only, refunds reduce the original expense (maintainer).
- **Why:** Totals must never add amounts in different currencies (DATA2), and a refund isn't spending.
- **Action / outcome:** FR-PLAN-4: amounts are positive and in the ledger's base currency. Refunds will be added later, against the expense they refund.

### D-173 · What the journal records

- **Question:** Where do the decision questions and the maintainer's answers live?
- **Context:** #29 rewrote the journal to record project decisions only, without the questions or options.
- **Options:** ★ Each entry keeps the question, the options and who chose · decisions only · the full text of each question and answer
- **Decision:** Keep the question, the options and who chose (maintainer).
- **Why:** Contributors see why each decision was made, and the maintainer can review their choices later.
- **Action / outcome:** The journal guide lists **Question** and **Decided by**. Older entries keep their current text.

### D-174 · Merging the rework series

- **Question:** May the rework PRs be merged as soon as all their checks pass?
- **Options:** ★ Yes, for this series only · ask before each merge
- **Decision:** Merge each rework PR when its checks are green (maintainer). Anything outside the plan still needs approval.

### D-175 · How a cost's tags are stored

- **Question:** With tag history kept, are a cost's tags a list on the cost, or rows in link tables? (Changing storage later means migrating data.)
- **Options:** ★ A list on each cost, which the database checks · separate link tables, checked by foreign keys
- **Decision:** A list on each cost (maintainer).
- **Why:** Fewer tables to sync and simpler queries on the device. The database checks that the list is a list of tags from the cost's own ledger, which also prevents the corruption found in D-169.

### D-176 · Locking the base currency

- **Question:** Can a ledger's base currency change after costs are recorded?
- **Options:** ★ Lock it once costs exist · allow changes, reporting old costs separately
- **Decision:** Lock it once costs exist (maintainer).
- **Why:** Costs are recorded in the base currency only (D-172), so a later change would leave totals that can't be added.
- **Action / outcome:** FR-PLAN-4. Switching base currency later means a new ledger.
