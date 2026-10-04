# 2026-10-04 · Engineering standards and the review guide

### D-87 · What to build while merges are blocked (autopilot)

- **Decision:** Build the engineering standards and the PR review guide next, stacked on the requirements PR (autopilot).
- **Why:** AGENTS.md, CLAUDE.md, the `/review-pr` skill and the CodeRabbit configuration all point at these two documents, so they have to exist first.

### D-88 · Adapt the maintainer's existing standards format (autopilot)

- **Decision:** Reuse the structure of the maintainer's established standards document: precedence, MUST/SHOULD, stable rule IDs per family, a maintenance section, and a review guide with R1–R6 and P0–P3. Re-write the content for this stack (autopilot). Three changes:
  - **SYNC family added**, for local-first sync: idempotent uploads, the error policy, conflicts, and schema changes that tolerate offline devices.
  - **SEC10 added:** files that instruct AI agents are reviewed like code (D-58).
  - **GIT4 made precise:** never rewrite history others may have pulled; update stacked branches by merging their base (D-80).
- **Why:** The maintainer already reads and reviews in this format. Every reviewer, human or AI, can then cite the same rule IDs.
- **Lesson:** Reusing a format people already know lowers the cost of adopting standards. Copying content blindly doesn't work: the rules have to fit the stack.
