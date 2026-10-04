# Monthly cost planning and spending requirements

Status: **draft v0.1**, 2026-10-04. This lightweight software requirements specification (SRS) records the maintainer's initial product brief. It specifies capabilities, not an implementation or a claim that the features exist. See [D-162–D-163](../journal/2026-10-04-cost-planning-requirements.md) for the decisions behind this document.

## Scope and requirement status

The user plans costs for a month, records actual spending, compares both by cost type and tags, and sees an estimate of when the chosen spending resource will run out. Fixed costs must affect that projection.

**Shall** identifies a required capability. **Source: brief** means directly requested by the maintainer. **Proposed** means a suggested interpretation that needs confirmation under WF4 before it binds. Requirement IDs are stable and are cited by implementation PRs and tests.

This document extends the [initial requirements](initial-requirements.md). NFR-OFF-1 (offline operation), NFR-SEC-1 (ledger isolation) and NFR-MONEY-1 (exact money) apply throughout, along with DATA1–3 (arithmetic, currency conversion and ledger calendar dates). Do not add amounts in different currencies without an explicit conversion policy.

## Domain vocabulary

| Term                | Meaning in the brief                                                                                                                                                    |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cost type           | A reusable classification of spending, such as rent or groceries. Its relationship to the broader planned category model is unresolved.                                 |
| Estimated cost      | An amount expected to be spent in a selected month. It is separate from money actually spent.                                                                           |
| Actual cost         | A recorded expense associated with a cost type. It contributes to actual spending.                                                                                      |
| Tag                 | A label assigned to a cost or cost type. Several tags may apply to the same item.                                                                                       |
| Untagged            | The report group that keeps costs without applicable tags visible. The treatment of cost-type tags is an open decision.                                                 |
| Fixed cost          | A cost whose amount is treated as known for the projection, such as a bill. Fixed does not necessarily mean recurring; scheduling and payment matching need a decision. |
| Exhaustion forecast | An estimate of when a defined spending resource is depleted. Whether that resource is the monthly plan or available cash is unresolved.                                 |

## Functional requirements

| ID            | Requirement                                                                                                                                                                                 | Source |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| FR-PLAN-1     | The system shall let the user create cost types in advance and enter estimated costs for a selected month, associated with those types.                                                     | brief  |
| FR-PLAN-2     | The system shall show the month's total estimated cost and the estimated cost for each cost type.                                                                                           | brief  |
| FR-TAG-1      | The system shall let the user assign multiple tags to estimated costs and actual costs.                                                                                                     | brief  |
| FR-TAG-2      | The system shall let the user assign multiple tags to cost types.                                                                                                                           | brief  |
| FR-TAG-3      | The system shall show estimated and actual cost totals by tag, with cost-type tagging available to those reports. The relationship between cost tags and cost-type tags is subject to P-02. | brief  |
| FR-TAG-4      | Tag reports shall include an Untagged group so untagged estimated and actual costs remain visible.                                                                                          | brief  |
| FR-TAG-5      | The system shall let the user calculate estimated and actual totals using multiple selected tags. The matching rule is subject to P-03.                                                     | brief  |
| FR-ACT-1      | The system shall let the user record an actual cost against an existing cost type.                                                                                                          | brief  |
| FR-ACT-2      | The system shall let the user create a cost type while recording an actual cost and assign that cost to the new type.                                                                       | brief  |
| FR-ACT-3      | The system shall show monthly actual spending overall and by cost type, alongside the corresponding estimates; tag comparisons follow FR-TAG-3–5.                                           | brief  |
| FR-FORECAST-1 | The system shall show an estimated exhaustion time for the spending resource defined by P-04.                                                                                               | brief  |
| FR-FORECAST-2 | The system shall account for fixed costs in its exhaustion estimate and projection graph.                                                                                                   | brief  |

The comparison with usage dashboards describes the desired experience: seeing consumption and estimated remaining time. It does not specify an algorithm or require integration with an external dashboard.

## Traceability and acceptance scenarios

These are specifications for future tests, not tests already running. Scenarios marked **proposed** depend on the corresponding open decision. All example amounts are fictional and use one currency; implementation fixtures must use integer minor units.

| Brief item                                                          | Requirement IDs      | Acceptance scenarios |
| ------------------------------------------------------------------- | -------------------- | -------------------- |
| Calculate monthly costs and cost-type estimates in advance          | FR-PLAN-1–2          | AC-01                |
| Multiple tags on costs and cost types, including untagged estimates | FR-TAG-1–4           | AC-02, AC-03         |
| Estimated and actual reports by cost type and multiple tags         | FR-ACT-3, FR-TAG-3–5 | AC-01, AC-02, AC-03  |
| Record real costs using existing or newly created cost types        | FR-ACT-1–2           | AC-04                |
| Estimate when spending capacity runs out                            | FR-FORECAST-1        | AC-06, AC-07         |
| Account for fixed costs in the graph                                | FR-FORECAST-2        | AC-06, AC-07         |

AC-05 verifies the cross-cutting rules NFR-OFF-1, NFR-SEC-1, DATA3 and SYNC2 across these capabilities.

### AC-01 · Monthly estimates and actual spending

**Given** a month with estimated rent of 100, groceries of 50 and transport of 25, **when** the user views the plan, **then** the estimated total is 175 and each cost type shows its own subtotal. **When** actual expenses of 90 for rent and 40 for groceries are entered, **then** the actual total is 130 and the estimated total remains 175. Planning and recording spending are separate operations.

### AC-02 · Tags and untagged costs (proposed calculation: P-03)

**Given** costs of 100 tagged Home and Essential, 50 tagged Home, and 25 with no direct or cost-type tags, **when** each tag's report is viewed, **then** Home shows 150, Essential shows 100 and Untagged shows 25. The overall total remains 175. Apply this scenario separately to estimates and actuals (FR-TAG-1, FR-TAG-3–4).

Tagging and visible Untagged reports remain required by FR-TAG-1 and FR-TAG-3–4 regardless of the calculation policy. The numbers above depend on the whole-amount reporting proposal in P-03. **Proposed presentation rule:** label tag groups as overlapping; their sum is 275 here and is not the overall total. Splitting amounts among tags has not been requested.

### AC-03 · Cost-type tags and multiple selections (proposed: P-02, P-03)

**Given** a cost of 100 tagged Essential whose cost type is tagged Home and Essential, **when** effective tags are calculated, **then** it belongs to Home and Essential once each. **Given** the AC-02 amounts, **when** Home and Essential are selected with **ANY**, **then** the combined total is 150; with **ALL**, it is 100. Each matching cost contributes once to a combined total. Repeat for estimates and actuals.

### AC-04 · Record actual costs with a new type

**Given** an existing month, **when** the user creates the cost type Repairs while entering an actual expense of 30, **then** that expense appears in Repairs and the monthly actual total. **When** another expense uses Repairs, **then** it is grouped under the same type (FR-ACT-1–3).

**Proposed rule (P-01):** an actual expense does not automatically create an estimate. A missing estimate is displayed as unplanned, separately from an explicit zero estimate.

### AC-05 · Dates, offline operation and ledger isolation

**Given** a cost dated the last day of a month in the ledger's calendar, **when** the device changes time zone, **then** it remains in the same reporting month (DATA3). **Given** an actual expense entered offline, **when** it is retried during sync, **then** totals include it only once (NFR-OFF-1, SYNC2). **Given** a different ledger's member without access, **when** they try to read or change these records, **then** access is denied (NFR-SEC-1). These existing rules apply to every new feature.

### AC-06 · Fixed costs can determine exhaustion (proposed: P-04, P-05)

**Given** a monthly allocation of 1,000, actual spending of 200, no projected variable spending, and an unpaid fixed obligation of 900 due on day 20, **when** the forecast runs before day 20, **then** it projects exhaustion on day 20 and a drop in the graph on that due date. Zero variable spending does not imply unlimited remaining time.

**Given** that obligation is paid once and matched to an actual expense of 900, **when** the forecast is recalculated, **then** actual spending is 1,100 and the same 900 is no longer a future obligation. It must not be counted as both paid and still upcoming. Partial payments, overdue obligations and recurrence require the P-05 decision.

### AC-07 · Forecast limitations (proposed: P-06)

**Given** insufficient observations for a variable-spending rate, **when** the forecast is viewed, **then** it identifies insufficient data instead of inventing an exhaustion date; known fixed obligations are still shown. **Given** enough data but no projected exhaustion within the chosen horizon, **then** it says so without implying funds last forever. **Given** the resource is already exhausted, **then** it shows that state instead of a future date. The view explains the resource, observation period and assumptions.

## Open product decisions

The recommended options below are recorded for later review; they have **not** been approved as business rules. Confirm and journal each decision before implementing its dependent behavior. Independent work can continue meanwhile. Confidence describes the recommendation, not a measured forecast probability.

| ID   | Open question and why it matters                                                                                                                   | Options                                                                                                                                                                                                          | Confidence / uncertainty                                                                                                                                                                |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P-01 | How do estimates relate to cost types and actual entries? Two independent totals for type estimates and planned items could double-count the plan. | **(Recommended)** One or more planned cost entries per type, summed into its estimate; actual entries stay separate and may be unplanned. Alternative: one aggregate estimate per type.                          | Medium: the brief permits cost tags but does not settle plan granularity, edits to past months or rollover.                                                                             |
| P-02 | How do cost-type tags affect individual costs and past reports? A later tag edit could reclassify history.                                         | **(Recommended)** Combine direct and inherited tags without duplicates, snapshotting inherited tags when a cost is created. Alternatives: dynamically inherit current type tags, or report type tags separately. | Low: history semantics and tag overrides are not stated. Resolve update behavior before choosing storage.                                                                               |
| P-03 | What does selecting several tags mean? Whole-amount groups overlap.                                                                                | **(Recommended)** Offer explicit ANY (union) and ALL (intersection), count each matched cost once, and treat Untagged as no effective tags. Alternatives: ANY only, or allocation of cost shares among tags.     | Medium: multiple-tag calculation is requested, but matching and allocation are unspecified.                                                                                             |
| P-04 | What runs out, and where does its opening amount come from? A plan is not a bank balance.                                                          | **(Recommended)** Forecast a user-confirmed monthly spending allocation, initially suggested from the month's plan. Alternative: forecast available cash from selected accounts and expected income.             | Low: the brief names neither resource nor funding inputs. Decide month reset, carryover and forecast horizon with it.                                                                   |
| P-05 | How are fixed costs scheduled and recognized as paid? A monthly average hides a large bill's due date.                                             | **(Recommended)** Model dated obligations and match actual payments; project only their unpaid remainder, separately from variable spending. Alternative: reserve the fixed amount at the start of the month.    | Medium: due dates, recurrence, partial payments and overdue treatment are not specified. Fixed spending must not also inflate the variable rate.                                        |
| P-06 | How should variable spending be projected? Too little history creates misleading precision.                                                        | **(Recommended)** Start with an explainable daily rate excluding fixed costs and display its assumptions. Alternatives: planned spending pace or a rolling historical rate.                                      | Low: choose the observation window, treatment of days without spending, minimum evidence, rounding and no-exhaustion states before implementation. No guarantee of predictive accuracy. |
| P-07 | Which money movements count as costs? Signed transactions alone cannot distinguish expenses, refunds and transfers.                                | **(Recommended)** Exclude transfers and income from expense totals; link refunds to the original expense with explicit reporting dates. Alternative: report gross expenses and refunds separately.               | Medium: refund timing and categorization are unsettled. FX rate date/source and rounding must follow DATA1–2 and ADR-0006; never sum raw mixed-currency amounts.                        |

## Implementation and verification handoff

Cost types, tags, estimates and fixed obligations are not in the current schema. This specification does not choose tables, add migrations or replace the existing architecture. Once dependent product decisions are confirmed, trace the UI → local database → upload connector → server constraints/RLS → sync flow before implementation (WF1).

Implement in small PRs: exact calculation behavior in `packages/core`, persistence and access rules, then reports and entry screens. Use unit tests for arithmetic and set matching, pgTAP for constraints/RLS, sync integration tests for device isolation and retries, component tests for entry/report states, and journey tests for planning → recording → comparing → forecasting (TEST1). Cite requirement and acceptance IDs in each PR.
