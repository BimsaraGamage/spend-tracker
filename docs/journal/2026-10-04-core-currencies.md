# 2026-10-04 · Phase 1: core package and currencies

### D-106 · Generate currency data from the official ISO 4217 list (autopilot)

- **Decision:** A committed script turns the official ISO 4217 "list one" XML into a typed table of minor-unit digits. The list is published by SIX on behalf of ISO; this run used the 2026-09-17 edition. No npm currency package (autopilot).
  - Funds (for example CLF) and entries without minor units (XAU, XTS, XDR) are excluded.
  - Result: 155 currencies, with 16 using 0 digits, 132 using 2 and 7 using 3.
- **Why:**
  - A wrong digit count silently corrupts every amount in that currency, so the data must come from the authoritative source, not from memory (WF4).
  - Generating it adds no runtime dependency (SEC8).
  - Its origin is recorded in the file, and refreshing it is one command.
- **Verified:** Spot checks against well-known values (JPY 0, CLP 0, ISK 0, LKR, USD and EUR 2, KWD and BHD 3) and table-wide invariants in the tests.

### D-107 · Unit tests with a 90% coverage gate (autopilot)

- **Decision:** `packages/core` uses Vitest 5 with V8 coverage, and the build fails below 90% lines, branches, functions or statements. The generated table is excluded from coverage (autopilot).
- **Why:** This package does money arithmetic and validation. Untested branches there become wrong balances.

### D-108 · `console` allowed in tooling scripts only (autopilot)

- **Decision:** The shared ESLint config turns `no-console` off for `scripts/` folders only (autopilot).
- **Why:** CON6 keeps app logs going through the scrubbing logger. Command-line scripts legitimately print to the terminal. A negative test confirmed the rule still fails `console.log` in app code.

### D-121 · The generator doesn't touch the network (CodeQL finding) (autopilot)

- **Found by:** CodeQL review comment on the PR: _"Network data written to file"_. The generator downloaded the ISO list and wrote a source file. The unresolved comment blocked the merge, because the ruleset requires every conversation to be resolved.
- **Decision:** The script reads only a local file passed as an argument, downloaded explicitly with the documented `curl` command. It has no fetch code (autopilot). Regenerating from the same official file gave a byte-identical table.
- **Why not dismiss the alert:** the output was already safe, since only values matching `[A-Z]{3}` and a single digit are written into a fixed template. Separating "download" from "generate" is still a better design: the input can be reviewed, and generation is a pure transformation.
- **Lesson:** Code-scanning comments count as review conversations. With "require conversation resolution" on, a security finding blocks the merge until it's addressed, which is the point.
