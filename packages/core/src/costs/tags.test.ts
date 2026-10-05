import { describe, expect, it } from "vitest";

import type { Money } from "../money/money";
import {
  matchesTags,
  sumMatchingTags,
  type TaggedCost,
  tagReport,
  tagsForNewCost,
} from "./tags";
import type { CostType, CostTypeId, TagId } from "./types";

const lkr = (amountMinor: number): Money => ({ amountMinor, currency: "LKR" });
const tag = (name: string) => name as TagId;
const home = tag("home");
const essential = tag("essential");
const fun = tag("fun");

const cost = (amount: number, tagIds: readonly TagId[] = []): TaggedCost => ({
  amount: lkr(amount),
  tagIds,
});

const groceries: CostType = {
  id: "groceries" as CostTypeId,
  name: "Groceries",
  tagIds: [home, essential],
};

describe("tagsForNewCost (FR-TAG-2)", () => {
  it("records the chosen tags, then the cost type's, each once", () => {
    expect(tagsForNewCost([essential, fun], groceries)).toEqual([
      essential,
      fun,
      home,
    ]);
  });

  it("records the cost type's tags when none are chosen", () => {
    expect(tagsForNewCost([], groceries)).toEqual([home, essential]);
  });

  it("records the chosen tags when the cost type has none", () => {
    expect(tagsForNewCost([fun], { ...groceries, tagIds: [] })).toEqual([fun]);
  });
});

// Costs of 100 tagged Home and Essential, 50 tagged Home, and 25 untagged.
const ac02 = [cost(100, [home, essential]), cost(50, [home]), cost(25)];

describe("AC-02: tags and untagged costs", () => {
  it("totals each tag and the untagged costs, and counts each cost once overall", () => {
    expect(tagReport(ac02, [home, essential], "LKR")).toEqual({
      ok: true,
      value: {
        byTag: new Map([
          [home, lkr(150)],
          [essential, lkr(100)],
        ]),
        untagged: lkr(25),
        total: lkr(175),
      },
    });
  });

  it("lists a tag without costs at zero", () => {
    const report = tagReport(ac02, [home, essential, fun], "LKR");
    expect(report.ok && report.value.byTag.get(fun)).toEqual(lkr(0));
  });

  it("counts a cost whose tags were all deleted as untagged, so it stays visible", () => {
    // Essential has been deleted, so only Home is reported.
    const report = tagReport(
      [cost(100, [essential]), cost(50, [home])],
      [home],
      "LKR",
    );
    expect(report).toEqual({
      ok: true,
      value: {
        byTag: new Map([[home, lkr(50)]]),
        untagged: lkr(100),
        total: lkr(150),
      },
    });
  });
});

describe("AC-03: cost-type tags and multiple selections", () => {
  it("keeps the tags a cost was recorded with when its type's tags change", () => {
    const first = cost(100, tagsForNewCost([essential], groceries));
    expect(first.tagIds).toEqual([essential, home]);

    const homeOnly = { ...groceries, tagIds: [home] };
    const later = cost(40, tagsForNewCost([], homeOnly));
    expect(later.tagIds).toEqual([home]);

    const report = tagReport([first, later], [home, essential], "LKR");
    expect(report.ok && report.value.byTag.get(essential)).toEqual(lkr(100));
    expect(report.ok && report.value.byTag.get(home)).toEqual(lkr(140));
  });

  it("totals costs with any of the selected tags, each once", () => {
    expect(sumMatchingTags(ac02, [home, essential], "any", "LKR")).toEqual({
      ok: true,
      value: lkr(150),
    });
  });

  it("totals costs with all of the selected tags", () => {
    expect(sumMatchingTags(ac02, [home, essential], "all", "LKR")).toEqual({
      ok: true,
      value: lkr(100),
    });
  });

  it("matches every cost when no tag is selected", () => {
    expect(sumMatchingTags(ac02, [], "any", "LKR")).toEqual({
      ok: true,
      value: lkr(175),
    });
    expect(sumMatchingTags(ac02, [], "all", "LKR")).toEqual({
      ok: true,
      value: lkr(175),
    });
  });
});

describe("matchesTags", () => {
  it.each([
    [[home, essential], [home], "any", true],
    [[home], [essential], "any", false],
    [[home], [home, essential], "any", true],
    [[home, essential], [home, essential], "all", true],
    [[home], [home, essential], "all", false],
    [[], [home], "any", false],
    [[], [], "all", true],
  ] as const)(
    "a cost tagged %j matches %j with %s: %s",
    (tagIds, selected, match, expected) => {
      expect(matchesTags(tagIds, selected, match)).toBe(expected);
    },
  );
});

describe("amounts the tag totals refuse", () => {
  const usdCost: TaggedCost = {
    amount: { amountMinor: 1, currency: "USD" },
    tagIds: [home],
  };
  const max = Number.MAX_SAFE_INTEGER;
  const outOfRange = { ok: false, error: "out-of-range" };

  it("never adds amounts in another currency (DATA2)", () => {
    const mismatch = { ok: false, error: "currency-mismatch" };
    expect(tagReport([usdCost], [home], "LKR")).toEqual(mismatch);
    expect(sumMatchingTags([usdCost], [home], "any", "LKR")).toEqual(mismatch);
  });

  it("reports a total too large to be exact (DATA1)", () => {
    expect(tagReport([cost(max), cost(1)], [home], "LKR")).toEqual(outOfRange);
  });

  // Costs are positive (FR-PLAN-4), but these functions don't assume it: a
  // group can overflow while the overall total doesn't.
  it("reports a tag's total too large to be exact", () => {
    const costs = [cost(max, [home]), cost(-max), cost(max, [home])];
    expect(tagReport(costs, [home], "LKR")).toEqual(outOfRange);
  });

  it("reports an untagged total too large to be exact", () => {
    const costs = [cost(max), cost(-max, [home]), cost(max)];
    expect(tagReport(costs, [home], "LKR")).toEqual(outOfRange);
  });
});
