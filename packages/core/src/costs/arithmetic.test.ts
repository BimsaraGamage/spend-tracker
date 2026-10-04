import { describe, expect, it } from "vitest";
import type { Money } from "../money/money";
import type {
  CostType,
  CostTypeId,
  EstimatedCost,
  ActualCost,
  TagId,
  MonthKey,
} from "./types";
import type { Uuid } from "../ids/uuid";
import {
  effectiveTags,
  isUntagged,
  matchesTags,
  sumActualByType,
  sumAllActual,
  sumAllEstimated,
  sumByTags,
  sumEstimatedByType,
  sumUntagged,
} from "./arithmetic";

// ── Test helpers ─────────────────────────────────────────────────────────

const month = "2026-10" as MonthKey;
const lkr = (amountMinor: number): Money => ({ amountMinor, currency: "LKR" });

const typeRent = "type-rent" as unknown as CostTypeId;
const typeGroceries = "type-groceries" as unknown as CostTypeId;
const typeTransport = "type-transport" as unknown as CostTypeId;

const tagHome = "tag-home" as unknown as TagId;
const tagEssential = "tag-essential" as unknown as TagId;
const tagFun = "tag-fun" as unknown as TagId;

function uuid(label: string): Uuid {
  return label as unknown as Uuid;
}

function makeEstimate(
  id: string,
  costTypeId: CostTypeId,
  amount: number,
  tagIds: TagId[] = [],
): EstimatedCost {
  return {
    id: uuid(id),
    month,
    costTypeId,
    amount: lkr(amount),
    tagIds,
    note: "",
  };
}

function makeActual(
  id: string,
  costTypeId: CostTypeId,
  amount: number,
  tagIds: TagId[] = [],
): ActualCost {
  return {
    id: uuid(id),
    month,
    costTypeId,
    amount: lkr(amount),
    tagIds,
    note: "",
    date: "2026-10-04",
  };
}

function makeCostType(
  id: CostTypeId,
  name: string,
  tagIds: TagId[] = [],
): CostType {
  return { id, name, tagIds };
}

// ── Type-based summing (FR-PLAN-2, FR-ACT-3) ────────────────────────────

describe("sumEstimatedByType", () => {
  const estimates = [
    makeEstimate("e1", typeRent, 10000),
    makeEstimate("e2", typeRent, 5000),
    makeEstimate("e3", typeGroceries, 5000),
  ];

  it("sums estimates for a single type", () => {
    const result = sumEstimatedByType(estimates, typeRent, "LKR");
    expect(result).toEqual({ ok: true, value: lkr(15000) });
  });

  it("returns zero for a type with no estimates", () => {
    const result = sumEstimatedByType(estimates, typeTransport, "LKR");
    expect(result).toEqual({ ok: true, value: lkr(0) });
  });
});

describe("sumActualByType", () => {
  const actuals = [
    makeActual("a1", typeRent, 9000),
    makeActual("a2", typeGroceries, 4000),
  ];

  it("sums actuals for a single type", () => {
    const result = sumActualByType(actuals, typeRent, "LKR");
    expect(result).toEqual({ ok: true, value: lkr(9000) });
  });
});

// ── Grand totals (AC-01) ─────────────────────────────────────────────────

describe("grand totals", () => {
  const estimates = [
    makeEstimate("e1", typeRent, 10000),
    makeEstimate("e2", typeGroceries, 5000),
    makeEstimate("e3", typeTransport, 2500),
  ];

  const actuals = [
    makeActual("a1", typeRent, 9000),
    makeActual("a2", typeGroceries, 4000),
  ];

  it("estimated total is 17500 (AC-01)", () => {
    const result = sumAllEstimated(estimates, "LKR");
    expect(result).toEqual({ ok: true, value: lkr(17500) });
  });

  it("actual total is 13000 (AC-01)", () => {
    const result = sumAllActual(actuals, "LKR");
    expect(result).toEqual({ ok: true, value: lkr(13000) });
  });

  it("rejects mixed currencies", () => {
    const mixed = [
      ...estimates,
      {
        ...makeEstimate("e4", typeRent, 100),
        amount: { amountMinor: 100, currency: "USD" as const },
      },
    ];
    expect(sumAllEstimated(mixed, "LKR")).toEqual({
      ok: false,
      error: "currency-mismatch",
    });
  });
});

// ── Effective tags (P-02) ────────────────────────────────────────────────

describe("effectiveTags", () => {
  it("combines cost tags with cost-type tags without duplicates", () => {
    const costType = makeCostType(typeRent, "Rent", [tagHome, tagEssential]);
    const tags = effectiveTags([tagEssential], costType);
    // tagEssential appears on both, but should be deduplicated.
    expect(tags).toHaveLength(2);
    expect(new Set(tags)).toEqual(new Set([tagHome, tagEssential]));
  });

  it("returns only cost-type tags when cost has none", () => {
    const costType = makeCostType(typeRent, "Rent", [tagHome]);
    const tags = effectiveTags([], costType);
    expect(tags).toEqual([tagHome]);
  });

  it("returns only cost tags when cost type has none", () => {
    const costType = makeCostType(typeRent, "Rent", []);
    const tags = effectiveTags([tagFun], costType);
    expect(tags).toEqual([tagFun]);
  });

  it("returns empty when neither has tags", () => {
    const costType = makeCostType(typeRent, "Rent", []);
    const tags = effectiveTags([], costType);
    expect(tags).toEqual([]);
  });
});

// ── Tag matching (FR-TAG-5, P-03) ────────────────────────────────────────

describe("matchesTags", () => {
  it("ANY: matches if at least one tag is present", () => {
    expect(matchesTags([tagHome, tagEssential], [tagHome], "any")).toBe(true);
    expect(matchesTags([tagHome], [tagEssential], "any")).toBe(false);
    expect(matchesTags([tagHome], [tagHome, tagEssential], "any")).toBe(true);
  });

  it("ALL: matches only if every filter tag is present", () => {
    expect(
      matchesTags([tagHome, tagEssential], [tagHome, tagEssential], "all"),
    ).toBe(true);
    expect(matchesTags([tagHome], [tagHome, tagEssential], "all")).toBe(false);
  });

  it("empty filter matches everything", () => {
    expect(matchesTags([tagHome], [], "any")).toBe(true);
    expect(matchesTags([], [], "all")).toBe(true);
  });
});

// ── Untagged (FR-TAG-4) ─────────────────────────────────────────────────

describe("isUntagged", () => {
  it("returns true when cost and its type have no tags", () => {
    const costType = makeCostType(typeRent, "Rent", []);
    expect(isUntagged([], costType)).toBe(true);
  });

  it("returns false when cost type has tags", () => {
    const costType = makeCostType(typeRent, "Rent", [tagHome]);
    expect(isUntagged([], costType)).toBe(false);
  });

  it("returns false when cost has tags", () => {
    const costType = makeCostType(typeRent, "Rent", []);
    expect(isUntagged([tagHome], costType)).toBe(false);
  });
});

// ── Tag-based totals (AC-02) ─────────────────────────────────────────────

describe("sumByTags (AC-02 scenario)", () => {
  // AC-02: costs of 100 tagged Home+Essential, 50 tagged Home, 25 untagged.
  const costTypes = new Map<CostTypeId, CostType>([
    [typeRent, makeCostType(typeRent, "Rent", [])],
    [typeGroceries, makeCostType(typeGroceries, "Groceries", [])],
    [typeTransport, makeCostType(typeTransport, "Transport", [])],
  ]);

  const estimates = [
    makeEstimate("e1", typeRent, 10000, [tagHome, tagEssential]),
    makeEstimate("e2", typeGroceries, 5000, [tagHome]),
    makeEstimate("e3", typeTransport, 2500),
  ];

  it("Home tag shows 15000", () => {
    const result = sumByTags(estimates, costTypes, [tagHome], "any", "LKR");
    expect(result).toEqual({ ok: true, value: lkr(15000) });
  });

  it("Essential tag shows 10000", () => {
    const result = sumByTags(
      estimates,
      costTypes,
      [tagEssential],
      "any",
      "LKR",
    );
    expect(result).toEqual({ ok: true, value: lkr(10000) });
  });

  it("Untagged shows 2500", () => {
    const result = sumUntagged(estimates, costTypes, "LKR");
    expect(result).toEqual({ ok: true, value: lkr(2500) });
  });

  it("overall total remains 17500 regardless of tags", () => {
    const result = sumAllEstimated(estimates, "LKR");
    expect(result).toEqual({ ok: true, value: lkr(17500) });
  });
});

// ── Combined tag filters (AC-03) ─────────────────────────────────────────

describe("sumByTags with ANY/ALL (AC-03 scenario)", () => {
  // AC-03: cost-type Rent tagged Home+Essential, cost of 100 tagged Essential.
  const costTypes = new Map<CostTypeId, CostType>([
    [typeRent, makeCostType(typeRent, "Rent", [tagHome, tagEssential])],
    [typeGroceries, makeCostType(typeGroceries, "Groceries", [])],
    [typeTransport, makeCostType(typeTransport, "Transport", [])],
  ]);

  const estimates = [
    // Cost tagged Essential, type tagged Home+Essential → effective: Home, Essential
    makeEstimate("e1", typeRent, 10000, [tagEssential]),
    // Cost tagged Home only, type has no tags → effective: Home
    makeEstimate("e2", typeGroceries, 5000, [tagHome]),
    // No tags anywhere → untagged
    makeEstimate("e3", typeTransport, 2500),
  ];

  it("Home ANY Essential → 15000 (union)", () => {
    const result = sumByTags(
      estimates,
      costTypes,
      [tagHome, tagEssential],
      "any",
      "LKR",
    );
    expect(result).toEqual({ ok: true, value: lkr(15000) });
  });

  it("Home ALL Essential → 10000 (intersection)", () => {
    const result = sumByTags(
      estimates,
      costTypes,
      [tagHome, tagEssential],
      "all",
      "LKR",
    );
    expect(result).toEqual({ ok: true, value: lkr(10000) });
  });
});
