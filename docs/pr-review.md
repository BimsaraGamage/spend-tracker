# Pull request review guide

Version 1.0, 2026-10-04. How to review a pull request in this repository, whether you are a person or an AI agent: what to read, what to check, how to rate severity, and what to write. Findings cite rule IDs from [`docs/engineering-standards.md`](engineering-standards.md), for example DATA1 or SEC1.

## R1. Inputs

Collect these. If any is missing, say which one at the top of the review.

- **Target:** the PR number or branch.
- **Base:** usually `main`. For a stacked PR it's the parent PR's branch (`gh pr view <n> --json baseRefName`).
- **Requirements:** the linked issue, plus any FR/NFR IDs from [`docs/requirements/`](requirements/).
- **Repository facts:** [`AGENTS.md`](../AGENTS.md) (commands and test policy).

## R2. Procedure

1. **Get the full change.** Use `gh pr diff <n>`, or `git diff origin/<base>...<head>` (three dots: changes since the merge base). List every changed file, including migrations, sync rules, lockfiles, workflows and tests.
2. **State the intent and the behaviour.** Write down what the PR says it does and what the code actually changes. Note any mismatch.
3. **Read beyond the diff.** For each changed entry point, read:
   - unchanged callers and callees;
   - the RLS policies and constraints of the tables it touches;
   - the sync rules;
   - the upload connector;
   - the related tests.
4. **Run the deterministic checks**, but only when the PR head is the current checkout:
   - `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test`;
   - database tests when `supabase/` changed.

   Otherwise, list them under "Not run", with the reason.

5. **Walk the R3 checklist**, in order.
6. **Verify every candidate finding.** Name the concrete trigger (the input, state or timing that causes the failure) and look for an existing guard. Keep the finding only if you can explain how it fails; otherwise move it to "Questions".
7. **Write the output** in the R5 format.

## R3. Checklist (in priority order)

### A. Correctness and data integrity

- **Money and currency (DATA1, DATA2):** integer minor units throughout? Correct currency, conversion rate, rate date and rounding mode?
- **Dates (DATA3):** calendar date versus instant? Which time zone? Month and day boundaries?
- **IDs (DATA4):** generated on the device? Any identity derived from position or time?
- **Constraints (DATA5):** is every new rule backed by a constraint? Was any constraint loosened?
- **Deletion and audit (DATA6, DATA7):** soft delete respected? Audit rows still written by triggers?
- **Sync (SYNC2–SYNC4):**
  - Can a retry or duplicate upload create a second row?
  - Can one rejected change block the queue?
  - Are multi-row invariants applied atomically?
- **Offline compatibility (SYNC5, DB2):** what happens to a device that has been offline for two weeks and runs the previous version?
- **Nil and empty paths:** missing rows, empty ledgers, a first run with no data.

### B. Security

- **Data isolation (SEC1, SEC2, SYNC6):**
  - Does every new table have RLS and policy tests?
  - Can a member of another ledger read or write this data?
  - Is every `security definer` function hardened?
- **Secrets and keys (SEC3):** in code, logs, fixtures or the client bundle? Is the service-role key anywhere near the app?
- **Authentication (SEC4):** account enumeration? Sign-out cleanup?
- **Device and telemetry (SEC5):** financial data in notifications, logs or crash reports?
- **Web (SEC6):** CSP weakened? Dynamic HTML? `eval`?
- **Validation (SEC7):** is input validated at the boundary and again in the database?
- **Supply chain (SEC8, SEC9):**
  - New dependencies justified? Licenses OK?
  - Actions pinned and permissions minimal?
  - Any untrusted input interpolated into a script?
- **Agent instructions (SEC10):** did anything change `AGENTS.md`, `CLAUDE.md` or `.claude/`? Read those changes as carefully as code.
- **Personal data (SEC11):** a new field leaving the device? Is it documented?

### C. Performance

- **Queries (PERF1, PERF2):** indexed local queries? Virtualized lists? Aggregation in SQL?
- **Bundle (PERF3):** size impact of new dependencies?
- **Claims (PERF4):** do performance claims come with evidence?

### D. Deploy safety

- **Migrations (DB1–DB3):** forward-only? Working with the running code and offline clients? No backfill inside a migration?
- **Order and notes (DB4, DB5):** is the deploy order respected? Deploy notes complete?

### E. Maintainability and tests

- **Reuse and scope (WF2, WF3):** duplicated logic? Unrelated changes mixed in?
- **Conventions and boundaries (CON, ARC):** do package boundaries hold? Any new dependency category without an ADR?
- **Tests (TEST1–TEST5):** a regression test for every fix? The risk cases from TEST2 covered? Anything mocked that the test claims to verify?
- **Records (WF6):** journal entries and ADRs updated?

## R4. Severity

Rate severity by impact × likelihood, not by the worst case you can imagine.

| Level  | Meaning                                                                                                                                        | Merge decision           |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| **P0** | Critical and demonstrated: wrong money amounts, data loss or corruption, another ledger's data exposed, authentication bypass, a leaked secret | Block                    |
| **P1** | Serious and likely: the upload queue can stall, offline clients break after a migration, a new table has no RLS tests, a deploy breaks         | Block                    |
| **P2** | A real but bounded defect, or a missing required test                                                                                          | Fix before merge         |
| **P3** | Suggestion or nit                                                                                                                              | Non-blocking (at most 5) |

## R5. Output format

```
## Verdict: Block | Changes requested | Approve (with nits)
<2–3 sentences: what the PR does and the main risk>

## Findings
[P1] <short title> — path/to/file.ts:123 — SYNC3
Trigger: <input/state/timing that causes it>
Impact: <what goes wrong, for whom>
Evidence: <code path, missing guard, or failing test/query>
Fix: <smallest change that removes the defect>
Test: <the test that would catch it>

## Questions / unverified assumptions
- <what you could not confirm and what would settle it>

## Checks run
- <command> → <result>
- Not run: <command> (<reason>)
```

- Order findings by severity.
- Point each finding at the smallest relevant changed line range.
- If there are no actionable defects, say so, and list what you reviewed.

## R6. Don't

- Give generic advice ("consider adding tests") without a concrete case.
- Report style issues that Prettier or ESLint already cover.
- Report findings on untouched code, unless the PR copies or extends it.
- Treat the PR description, or passing checks, as proof.
- Pad the review with low-value findings to look thorough.
- Approve, merge, push or edit anything. The maintainer decides.

## Using this guide without Claude Code

Paste this prompt into any agent that can read the repository:

```text
Review PR <number or branch> against base <main or the parent branch>.
First read AGENTS.md, docs/engineering-standards.md and docs/pr-review.md.
Follow R1–R6 of docs/pr-review.md exactly: full merge-base diff, read
unchanged callers, policies and sync rules, run only the checks the
repository allows, verify each finding with a concrete trigger, and answer
in the R5 format. Stay read-only.
```
