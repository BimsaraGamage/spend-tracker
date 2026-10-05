# Monthly cost planning and spending requirements

Status: **draft v0.2**, 2026-10-05. This lightweight software requirements specification (SRS) records the maintainer's initial product brief and the product decisions that settle how it behaves. It specifies capabilities, not an implementation or a claim that the features exist. See [D-162–D-163](../journal/2026-10-04-cost-planning-requirements.md) for how the specification was written, and [D-166–D-176](../journal/2026-10-05-cost-planning-decisions.md) for the decisions.

## Scope and requirement status

The user plans costs for a month, records actual spending, compares both by cost type and tags, and sees an estimate of when the month's budget will run out. Fixed costs affect that estimate.

**Shall** identifies a required capability. **Source: brief** means directly requested by the maintainer. **Source: decision** means settled by a maintainer decision in the journal. **Later** marks a requirement that is decided but scheduled after the first release. Requirement IDs are stable and are cited by implementation PRs and tests.

This document extends the [initial requirements](initial-requirements.md). NFR-OFF-1 (offline operation), NFR-SEC-1 (ledger isolation) and NFR-MONEY-1 (exact money) apply throughout, along with DATA1–3 (arithmetic, currency conversion and ledger calendar dates).

## Domain vocabulary

| Term                | Meaning                                                                                                                                          |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Cost type           | A reusable classification of spending, such as rent or groceries.                                                                                |
| Estimated cost      | A planned item: an amount expected to be spent in a month, under a cost type. A cost type's estimate is the sum of its planned items.            |
| Actual cost         | A recorded expense under a cost type, on a calendar date. It contributes to actual spending.                                                     |
| Tag                 | A label on a cost or a cost type. Several tags may apply to the same item.                                                                       |
| Recorded tags       | The tags a cost carries: those chosen for it, plus its cost type's tags at the time it was recorded. Later changes to the type don't alter them. |
| Untagged            | The report group for costs with no recorded tags.                                                                                                |
| Monthly budget      | The amount the user allows for a month's spending. It's the resource the exhaustion forecast tracks.                                             |
| Fixed cost          | A known obligation with a due day in a month, such as rent. It's paid when an actual cost is recorded against it.                                |
| Variable spending   | Actual costs that don't pay a fixed cost.                                                                                                        |
| Exhaustion forecast | An estimate of the day the month's budget runs out, from variable spending so far and unpaid fixed costs.                                        |

## Functional requirements

| ID            | Requirement                                                                                                                                                                        | Source                         |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| FR-PLAN-1     | The system shall let the user create cost types in advance and add planned items (estimated costs) for a selected month under those types.                                         | brief                          |
| FR-PLAN-2     | The system shall show the month's total estimated cost and the estimated cost for each cost type, as the sum of its planned items.                                                 | brief                          |
| FR-PLAN-3     | The system shall let the user set a budget for each month, suggesting the month's total estimated cost.                                                                            | decision (D-166)               |
| FR-PLAN-4     | Amounts shall be positive and in the ledger's base currency. The base currency shall not change once the ledger has costs.                                                         | decision (D-172, D-176)        |
| FR-TAG-1      | The system shall let the user assign multiple tags to estimated costs and actual costs.                                                                                            | brief                          |
| FR-TAG-2      | The system shall let the user assign multiple tags to cost types. A new cost receives its cost type's tags in addition to its own, and keeps them if the type's tags change later. | brief, decision (D-168)        |
| FR-TAG-3      | The system shall show estimated and actual cost totals by tag, using each cost's recorded tags.                                                                                    | brief                          |
| FR-TAG-4      | Tag reports shall include an Untagged group, so estimated and actual costs without tags remain visible.                                                                            | brief                          |
| FR-TAG-5      | The system shall calculate estimated and actual totals for several selected tags, matching costs with **any** or with **all** of them, and counting each matching cost once.       | brief, decision (D-168)        |
| FR-ACT-1      | The system shall let the user record an actual cost against an existing cost type.                                                                                                 | brief                          |
| FR-ACT-2      | The system shall let the user create a cost type while recording an actual cost, and assign that cost to the new type.                                                             | brief                          |
| FR-ACT-3      | The system shall show monthly actual spending overall and by cost type, alongside the corresponding estimates; actual costs without an estimate are shown as unplanned.            | brief, decision (D-170)        |
| FR-FORECAST-1 | The system shall show the estimated day the month's budget runs out, with the pace and assumptions it used.                                                                        | brief, decision (D-166, D-171) |
| FR-FORECAST-2 | The system shall account for fixed costs in the exhaustion estimate and the projection graph: each unpaid fixed cost lowers the projection on its due day.                         | brief, decision (D-167)        |
| FR-FORECAST-3 | **Later:** the system shall forecast when the money in accounts the user chooses runs out, including expected income.                                                              | decision (D-166)               |

The comparison with usage dashboards describes the desired experience: seeing consumption and estimated remaining time. It doesn't specify an algorithm or require integration with an external dashboard.

## Product decisions

The maintainer settled the open questions of draft v0.1 on 2026-10-05. Each is recorded, with the options considered, in the [decision journal](../journal/2026-10-05-cost-planning-decisions.md).

| ID   | Question                                                  | Decision                                                                                                                                                                                                          | Journal |
| ---- | --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| P-01 | How do estimates relate to cost types and actual entries? | Planned items per cost type, each with its own tags; a type's estimate is their sum. Actual costs stay separate, and spending without an estimate is unplanned.                                                   | D-170   |
| P-02 | How do cost-type tags affect costs and past reports?      | A cost records its own tags plus its type's tags when it's recorded, without duplicates. Later changes to the type's tags affect new costs only, so past reports don't change.                                    | D-168   |
| P-03 | What does selecting several tags mean?                    | **Any** (union) and **all** (intersection); each matching cost counts once. Untagged means no recorded tags. Tag groups overlap, so their sum isn't the overall total.                                            | D-168   |
| P-04 | What runs out?                                            | The month's budget, set by the user and suggested from the month's estimates. A forecast of money in accounts, with expected income, comes later (FR-FORECAST-3).                                                 | D-166   |
| P-05 | How are fixed costs scheduled and recognized as paid?     | Each fixed cost has a due day in its month. An actual cost recorded against it pays it, fully or partly; only the unpaid remainder is projected. An unpaid fixed cost past its due day is projected as due today. | D-167   |
| P-06 | How is variable spending projected?                       | This month's average daily variable spending, counting days without spending and excluding payments of fixed costs. Below three days of data, the forecast shows "not enough data" and projects fixed costs only. | D-171   |
| P-07 | Which money movements count as costs?                     | Costs are positive amounts in the ledger's base currency. Transfers and income never count. When refunds are added, a refund will reduce the expense it refunds.                                                  | D-172   |

## Traceability and acceptance scenarios

These are specifications for tests. All example amounts are fictional and use one currency; implementation fixtures must use integer minor units.

| Brief item                                                          | Requirement IDs      | Acceptance scenarios |
| ------------------------------------------------------------------- | -------------------- | -------------------- |
| Calculate monthly costs and cost-type estimates in advance          | FR-PLAN-1–3          | AC-01                |
| Multiple tags on costs and cost types, including untagged estimates | FR-TAG-1–4           | AC-02, AC-03         |
| Estimated and actual reports by cost type and multiple tags         | FR-ACT-3, FR-TAG-3–5 | AC-01, AC-02, AC-03  |
| Record real costs using existing or newly created cost types        | FR-ACT-1–2           | AC-04                |
| Estimate when spending capacity runs out                            | FR-FORECAST-1        | AC-06, AC-07         |
| Account for fixed costs in the graph                                | FR-FORECAST-2        | AC-06, AC-07         |

AC-05 verifies the cross-cutting rules NFR-OFF-1, NFR-SEC-1, DATA3, SYNC2 and FR-PLAN-4 across these capabilities.

### AC-01 · Monthly estimates and actual spending

**Given** a month with planned items of 100 for rent, 30 and 20 for groceries, and 25 for transport, **when** the user views the plan, **then** the estimated total is 175, groceries shows 50, and each cost type shows its own subtotal. **When** actual expenses of 90 for rent and 40 for groceries are recorded, **then** the actual total is 130 and the estimated total remains 175. **When** an actual expense of 15 is recorded under a cost type with no planned items, **then** it appears as unplanned.

### AC-02 · Tags and untagged costs

**Given** costs of 100 tagged Home and Essential, 50 tagged Home, and 25 with no tags, **when** each tag's report is viewed, **then** Home shows 150, Essential shows 100 and Untagged shows 25. The overall total remains 175, and the tag groups are labelled as overlapping: their sum, 275, isn't the overall total. Apply this scenario separately to estimates and actuals (FR-TAG-1, FR-TAG-3–4).

### AC-03 · Cost-type tags and multiple selections

**Given** a cost type tagged Home and Essential, **when** a cost of 100 is recorded under it with its own tag Essential, **then** its recorded tags are Home and Essential, once each. **When** the type's tags later change to Home only, **then** that cost still counts under Essential, and only new costs record Home alone. **Given** the AC-02 amounts, **when** Home and Essential are selected with **any**, **then** the combined total is 150; with **all**, it is 100. Repeat for estimates and actuals.

### AC-04 · Record actual costs with a new type

**Given** an existing month, **when** the user creates the cost type Repairs while recording an actual expense of 30, **then** that expense appears in Repairs and the monthly actual total. **When** another expense uses Repairs, **then** it is grouped under the same type (FR-ACT-1–3). Recording an actual cost never creates an estimate.

### AC-05 · Dates, currency, offline operation and ledger isolation

**Given** a cost dated the last day of a month in the ledger's calendar, **when** the device changes time zone, **then** it remains in the same reporting month (DATA3). **Given** a cost in a currency other than the ledger's base currency, or a zero or negative amount, **then** it is refused (FR-PLAN-4). **Given** an actual expense entered offline, **when** it is retried during sync, **then** totals include it only once (NFR-OFF-1, SYNC2). **Given** a different ledger's member without access, **when** they try to read or change these records, or to reference another ledger's cost types or tags, **then** it is refused (NFR-SEC-1).

### AC-06 · Fixed costs can determine exhaustion

**Given** a monthly budget of 1,000, variable spending of 200 so far, and an unpaid fixed cost of 900 due on day 20, **when** the forecast runs before day 20, **then** it projects exhaustion on day 20 and the graph drops on that day. Zero variable spending doesn't imply unlimited remaining time.

**Given** an actual cost of 900 is then recorded against that fixed cost, **when** the forecast is recalculated, **then** spending is 1,100 and the fixed cost is no longer upcoming: it is never counted as both paid and upcoming. **Given** a payment of 400 instead, **then** the projection keeps the unpaid 500 on day 20. **Given** the due day has passed and the fixed cost is unpaid, **then** the projection counts it as due today.

**Given** fixed costs of 100 due on day 5 and 950 due on day 20, a budget of 1,000 and no variable spending, **then** the projection runs out on day 20, not day 5.

### AC-07 · Forecast pace and limitations

**Given** variable spending of 90 over the first 3 days of the month and 100 of budget remaining, **then** the pace is 30 a day and the budget runs out on the 4th following day, when cumulative spending first reaches 100. **Given** fewer than 3 days of the month have passed, **when** the forecast is viewed, **then** it shows not enough data instead of inventing a date; known fixed costs are still projected. **Given** no exhaustion is projected before the month ends, **then** it says so without implying the budget lasts forever. **Given** the budget is already used up, **then** it shows that state instead of a future date. The view explains the budget, the pace and the observation period.

## Implementation and verification handoff

Trace the UI → local database → upload connector → server constraints/RLS → sync flow before implementation (WF1).

Implement in small PRs: persistence and access rules, exact calculation behaviour in `packages/core`, the device schema and sync, then reports and entry screens. Use unit tests for arithmetic, tag matching and the forecast, pgTAP for constraints and RLS, sync integration tests for device isolation and retries, component tests for entry and report states, and journey tests for planning → recording → comparing → forecasting (TEST1). Cite requirement and acceptance IDs in each PR.
