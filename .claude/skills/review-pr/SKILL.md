---
name: review-pr
description: Review a pull request or branch of this repository by following docs/pr-review.md (R1–R6) and citing rule IDs from docs/engineering-standards.md. Use when asked to review a PR or branch.
---

# Review a pull request

The target is the PR number or branch given with the command (`$ARGUMENTS`). If none was given, ask for one.

1. Read `AGENTS.md`, `docs/engineering-standards.md` and `docs/pr-review.md`.
2. Follow R1–R6 of `docs/pr-review.md` exactly:
   - get the full merge-base diff (`gh pr diff <n>`, or `git diff origin/<base>...<head>`);
   - state the intent and the actual behaviour;
   - read beyond the diff: unchanged callers, RLS policies, constraints, sync rules and tests;
   - run checks only when the PR head is the current checkout, and list anything not run, with the reason;
   - walk the R3 checklist in order;
   - verify every finding with a concrete trigger.
3. Answer in the R5 output format, citing rule IDs.
4. Stay read-only. Never edit files, push, comment on, approve or merge anything. The maintainer decides.
