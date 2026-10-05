import { describe, expect, it } from "vitest";

import type { LocalDate } from "../dates/local-date";
import type { Uuid } from "../ids/uuid";
import type { Money } from "../money/money";
import { costTypeTotals, sumAllActual, sumAllEstimated } from "./totals";
import type { ActualCost, CostTypeId, EstimatedCost, MonthKey } from "./types";

const month = "2026-10" as MonthKey;
const lkr = (amountMinor: number): Money => ({ amountMinor, currency: "LKR" });
const usd = (amountMinor: number): Money => ({ amountMinor, currency: "USD" });
const costType = (name: string) => name as CostTypeId;
const rent = costType("rent");
const groceries = costType("groceries");
const transport = costType("transport");
const repairs = costType("repairs");

let nextId = 0;
const newId = () => `cost-${String(++nextId)}` as Uuid;

function planned(costTypeId: CostTypeId, amount: Money): EstimatedCost {
  return { id: newId(), month, costTypeId, amount, tagIds: [], note: "" };
}

function spent(costTypeId: CostTypeId, amount: Money): ActualCost {
  return {
    id: newId(),
    month,
    costTypeId,
    amount,
    tagIds: [],
    note: "",
    date: "2026-10-04" as LocalDate,
    fixedObligationId: null,
  };
}

describe("AC-01: monthly estimates and actual spending", () => {
  const plan = [
    planned(rent, lkr(100)),
    planned(groceries, lkr(30)),
    planned(groceries, lkr(20)),
    planned(transport, lkr(25)),
  ];
  const actuals = [spent(rent, lkr(90)), spent(groceries, lkr(40))];

  it("totals the plan, and each cost type's planned items", () => {
    expect(sumAllEstimated(plan, "LKR")).toEqual({ ok: true, value: lkr(175) });
    const totals = costTypeTotals(plan, [], "LKR");
    expect(totals.ok && totals.value.get(groceries)).toEqual({
      estimated: lkr(50),
      actual: lkr(0),
      unplanned: false,
    });
  });

  it("totals actual spending beside the unchanged estimates", () => {
    expect(sumAllActual(actuals, "LKR")).toEqual({ ok: true, value: lkr(130) });
    expect(sumAllEstimated(plan, "LKR")).toEqual({ ok: true, value: lkr(175) });
    expect(costTypeTotals(plan, actuals, "LKR")).toEqual({
      ok: true,
      value: new Map([
        [rent, { estimated: lkr(100), actual: lkr(90), unplanned: false }],
        [groceries, { estimated: lkr(50), actual: lkr(40), unplanned: false }],
        [transport, { estimated: lkr(25), actual: lkr(0), unplanned: false }],
      ]),
    });
  });

  it("shows spending under a cost type without planned items as unplanned", () => {
    const totals = costTypeTotals(
      plan,
      [...actuals, spent(repairs, lkr(15))],
      "LKR",
    );
    expect(totals.ok && totals.value.get(repairs)).toEqual({
      estimated: lkr(0),
      actual: lkr(15),
      unplanned: true,
    });
  });

  it("totals an empty month as zero", () => {
    expect(sumAllEstimated([], "LKR")).toEqual({ ok: true, value: lkr(0) });
    expect(costTypeTotals([], [], "LKR")).toEqual({
      ok: true,
      value: new Map(),
    });
  });
});

describe("amounts the totals refuse", () => {
  const mismatch = { ok: false, error: "currency-mismatch" };

  it("never adds amounts in another currency (DATA2)", () => {
    expect(sumAllEstimated([planned(rent, usd(1))], "LKR")).toEqual(mismatch);
    expect(sumAllActual([spent(rent, usd(1))], "LKR")).toEqual(mismatch);
    expect(costTypeTotals([planned(rent, usd(1))], [], "LKR")).toEqual(
      mismatch,
    );
    expect(costTypeTotals([], [spent(rent, usd(1))], "LKR")).toEqual(mismatch);
  });

  it("reports a total too large to be exact (DATA1)", () => {
    const max = lkr(Number.MAX_SAFE_INTEGER);
    const outOfRange = { ok: false, error: "out-of-range" };
    expect(
      costTypeTotals([planned(rent, max), planned(rent, lkr(1))], [], "LKR"),
    ).toEqual(outOfRange);
    expect(
      costTypeTotals([], [spent(rent, max), spent(rent, lkr(1))], "LKR"),
    ).toEqual(outOfRange);
  });
});
