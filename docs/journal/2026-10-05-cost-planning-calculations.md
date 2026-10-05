# 2026-10-05 · Cost planning: calculations rework

How `packages/core` applies the maintainer's cost planning decisions (D-166–D-176). The assistant made these choices inside those decisions without a separate question. All of them can be changed later without migrating data. ★ marks the option taken.

### D-182 · Deleted tags in tag reports

- **Context:** A cost keeps the tags it was recorded with (D-168), so its list can name a tag that was deleted later. Deleted tags don't reach devices, so reports only list current tags.
- **Options:**
  - ★ A cost whose recorded tags were all deleted counts as Untagged.
  - Leave such a cost out of every tag group.
  - Keep deleted tags as report groups.
- **Decision:** Count it as Untagged (assistant).
- **Why:** Every cost then appears in at least one group, which is the purpose of FR-TAG-4. Showing deleted tags would bring back labels the user removed.
- **Action / outcome:** `tagReport` takes the ledger's current tags. Covered in `tags.test.ts`.

### D-183 · Costs dated after today

- **Context:** An actual cost can be dated later in the month, such as a bill entered before it's paid.
- **Options:** ★ Project it on its date, like a fixed cost, and don't count it as spent yet · count it as spent today
- **Decision:** Project it on its date (assistant).
- **Why:** The forecast's "spent so far" stays true, and the graph drops on the day the money leaves.
- **Action / outcome:** The forecast reports it in `upcoming`, beside unpaid fixed costs. Covered in `forecast.test.ts`.

### D-184 · How the projection is calculated and drawn

- **Context:**
  - The forecast in #31 rounded the daily pace before projecting, interpolated past days in a straight line, and stopped the graph at zero.
  - Its exhaustion day came a day early, and it could pick the wrong day when there were several fixed costs (D-169).
- **Options:**
  - ★ Use the exact average and round each point down to a whole minor unit. Draw past days from the actual spending dates, and continue the projection below zero to the month's end.
  - Keep a rounded daily pace, which is simpler, but can move the run-out day by a day.
- **Decision:** Exact arithmetic, drawn from the real dates (assistant).
- **Why:**
  - AC-07 defines the run-out day as the first day cumulative spending reaches the budget. Rounding the pace first breaks that: with 100 left at 33.33 a day, it gives day 7 instead of day 6.
  - Spending dates show when money really went.
  - Continuing below zero shows how far over the budget the month would go. The app can still stop the line at zero.
- **Action / outcome:**
  - `forecastMonth` returns the outcome as a code (`used-up`, `runs-out`, `lasts`, `not-enough-data`), plus the pace, the totals and both lines. It never returns English text (CON7).
  - The daily pace it reports is rounded to the nearest minor unit, halves up, for display only.
  - Every acceptance scenario in AC-06 and AC-07 is a test.

### D-185 · Refuse input instead of dropping it

- **Context:** #31 silently left out costs whose cost type wasn't loaded, and accepted amounts from any month or currency (D-169).
- **Options:** ★ Return an error code for input the calculation can't use honestly · filter it out
- **Decision:** Return errors (assistant).
- **Why:** A silently wrong total is worse than a visible error (CON5).
- **Action / outcome:**
  - Reports use each cost's recorded tags, so they no longer need cost types.
  - The forecast refuses:
    - dates and costs outside the month;
    - other currencies;
    - amounts that aren't positive whole minor units;
    - due days outside 1–31;
    - totals beyond the safe-integer range.
- **Lesson:** Eight deliberate mistakes were applied to a copy of the code, one at a time, and the tests caught the seven that change a result. The eighth removed the explicit "overdue means due today" step, and changed nothing: each projected point already includes every cost due before it. Seeing new tests fail is how they earn trust (TEST6).
