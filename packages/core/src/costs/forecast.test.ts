import { describe, expect, it } from "vitest";

import type { LocalDate } from "../dates/local-date";
import type { Uuid } from "../ids/uuid";
import type { Money } from "../money/money";
import {
  type Forecast,
  type ForecastInput,
  forecastMonth,
  unpaidAmount,
} from "./forecast";
import type {
  ActualCost,
  CostTypeId,
  FixedObligation,
  FixedObligationId,
  MonthKey,
} from "./types";

// October 2026 has 31 days.
const month = "2026-10" as MonthKey;
const lkr = (amountMinor: number): Money => ({ amountMinor, currency: "LKR" });
const date = (day: number) =>
  `${month}-${String(day).padStart(2, "0")}` as LocalDate;
const MAX = Number.MAX_SAFE_INTEGER;

let nextId = 0;

/** An actual cost on a day of October; with `pays`, a payment of that fixed cost. */
function spent(
  amount: number,
  day: number,
  pays: FixedObligation | null = null,
): ActualCost {
  return {
    id: `cost-${String(++nextId)}` as Uuid,
    month,
    costTypeId: "food" as CostTypeId,
    amount: lkr(amount),
    tagIds: [],
    note: "",
    date: date(day),
    fixedObligationId: pays?.id ?? null,
  };
}

/** A fixed cost in October. */
function fixed(amount: number, dueDay: number): FixedObligation {
  return {
    id: `fixed-${String(++nextId)}` as FixedObligationId,
    month,
    costTypeId: "housing" as CostTypeId,
    amount: lkr(amount),
    dueDay,
  };
}

interface Scenario {
  readonly today: number;
  readonly budget?: number;
  readonly actualCosts?: readonly ActualCost[];
  readonly fixedCosts?: readonly FixedObligation[];
  readonly payments?: readonly ActualCost[];
}

function inputFor(scenario: Scenario): ForecastInput {
  return {
    month,
    today: date(scenario.today),
    budget: lkr(scenario.budget ?? 1000),
    actualCosts: scenario.actualCosts ?? [],
    fixedCosts: scenario.fixedCosts ?? [],
    payments: scenario.payments ?? [],
  };
}

function forecast(scenario: Scenario): Forecast {
  const result = forecastMonth(inputFor(scenario));
  if (!result.ok) expect.unreachable(`no forecast: ${result.error}`);
  return result.value;
}

/** The projected budget left at the end of `day`, in minor units. */
function projectedOn(result: Forecast, day: number): number | undefined {
  return result.projected.find((point) => point.day === day)?.remaining
    .amountMinor;
}

describe("AC-06: fixed costs can determine exhaustion", () => {
  // A budget of 1,000, variable spending of 200 by day 10 (20 a day), and
  // rent of 900 due on day 20.
  const rent = fixed(900, 20);
  const scenario = (payments: readonly ActualCost[] = []): Scenario => ({
    today: 10,
    actualCosts: [spent(200, 4), ...payments],
    fixedCosts: [rent],
    payments,
  });

  it("runs out on the due day of a fixed cost larger than what's left", () => {
    const result = forecast(scenario());
    expect(result.outcome).toEqual({ kind: "runs-out", day: 20 });
    expect(result.upcoming).toEqual(lkr(900));
    // The graph drops on day 20: by the rent plus a day's spending.
    expect(projectedOn(result, 19)).toBe(620);
    expect(projectedOn(result, 20)).toBe(-300);
  });

  it("runs out on a fixed cost's due day even without variable spending", () => {
    const result = forecast({ today: 10, fixedCosts: [fixed(1000, 20)] });
    expect(result.pace).toMatchObject({ kind: "measured", daily: lkr(0) });
    expect(result.outcome).toEqual({ kind: "runs-out", day: 20 });
  });

  it("counts a fixed cost paid in full as spent, and no longer as upcoming", () => {
    const result = forecast(scenario([spent(900, 10, rent)]));
    expect(result.spent).toEqual(lkr(1100));
    expect(result.remaining).toEqual(lkr(-100));
    expect(result.upcoming).toEqual(lkr(0));
    expect(result.outcome).toEqual({ kind: "used-up" });
    // Only a day's spending, 20, on day 20: no drop for the rent.
    expect(projectedOn(result, 19)).toBe(-280);
    expect(projectedOn(result, 20)).toBe(-300);
  });

  it("keeps the unpaid rest of a partly paid fixed cost on its due day", () => {
    const result = forecast(scenario([spent(400, 10, rent)]));
    expect(result.spent).toEqual(lkr(600));
    expect(result.upcoming).toEqual(lkr(500));
    // The payment isn't variable spending: the pace stays 20 a day.
    expect(result.pace).toMatchObject({ spent: lkr(200), daily: lkr(20) });
    expect(projectedOn(result, 19)).toBe(220);
    expect(projectedOn(result, 20)).toBe(-300);
  });

  it("counts an unpaid fixed cost past its due day as due today", () => {
    const result = forecast({ ...scenario(), today: 25 });
    expect(result.actual.at(-1)).toEqual({ day: 25, remaining: lkr(800) });
    expect(result.projected[0]).toEqual({ day: 25, remaining: lkr(-100) });
    expect(result.outcome).toEqual({ kind: "runs-out", day: 25 });
  });

  it.each([
    ["with a pace", 4],
    ["before the pace is known", 2],
  ])(
    "runs out on day 20, not day 5, with fixed costs of 100 and 950 (%s)",
    (_label, today) => {
      const result = forecast({
        today,
        fixedCosts: [fixed(100, 5), fixed(950, 20)],
      });
      expect(projectedOn(result, 5)).toBe(900);
      expect(result.outcome).toEqual({ kind: "runs-out", day: 20 });
    },
  );
});

describe("AC-07: forecast pace and limitations", () => {
  // Variable spending of 90 over the first 3 days, with 100 of budget left.
  const ac07: Scenario = {
    today: 3,
    budget: 190,
    actualCosts: [spent(30, 1), spent(30, 2), spent(30, 3)],
  };

  it("runs out on the 4th following day at a pace of 30 a day", () => {
    const result = forecast(ac07);
    expect(result.pace).toEqual({
      kind: "measured",
      days: 3,
      spent: lkr(90),
      daily: lkr(30),
    });
    expect(result.remaining).toEqual(lkr(100));
    expect(result.projected.slice(0, 5)).toEqual(
      [100, 70, 40, 10, -20].map((left, index) => ({
        day: 3 + index,
        remaining: lkr(left),
      })),
    );
    expect(result.outcome).toEqual({ kind: "runs-out", day: 7 });
  });

  it("counts days without spending towards the pace", () => {
    const result = forecast({ ...ac07, actualCosts: [spent(90, 1)] });
    expect(result.pace).toMatchObject({ days: 3, daily: lkr(30) });
    expect(result.outcome).toEqual({ kind: "runs-out", day: 7 });
  });

  it("projects with the exact average, rounding only each point", () => {
    // 100 over 3 days: 33.33 a day. Rounding the pace to 33 first would
    // leave 1 on day 6 and move the run-out day to day 7.
    const result = forecast({
      today: 3,
      budget: 200,
      actualCosts: [spent(100, 3)],
    });
    expect(result.pace).toMatchObject({ daily: lkr(33) });
    expect(projectedOn(result, 4)).toBe(67);
    expect(projectedOn(result, 5)).toBe(34);
    expect(result.outcome).toEqual({ kind: "runs-out", day: 6 });
  });

  it("rounds the daily pace it reports halves up", () => {
    const result = forecast({ today: 6, actualCosts: [spent(15, 1)] });
    expect(result.pace).toMatchObject({ spent: lkr(15), daily: lkr(3) });
  });

  it("says there isn't enough data before day 3, but still projects fixed costs", () => {
    const result = forecast({
      today: 2,
      actualCosts: [spent(50, 1)],
      fixedCosts: [fixed(300, 15)],
    });
    expect(result.pace).toEqual({
      kind: "not-enough-data",
      days: 2,
      daysNeeded: 3,
    });
    expect(result.outcome).toEqual({ kind: "not-enough-data" });
    expect(projectedOn(result, 14)).toBe(950);
    expect(projectedOn(result, 15)).toBe(650);
  });

  it("says what's left at the month's end when the budget lasts", () => {
    const result = forecast({
      today: 10,
      budget: 10_000,
      actualCosts: [spent(1000, 5)],
    });
    expect(result.outcome).toEqual({ kind: "lasts", remaining: lkr(6900) });
  });

  it("shows a budget that's already used up instead of a date", () => {
    const result = forecast({ today: 5, actualCosts: [spent(1000, 2)] });
    expect(result.remaining).toEqual(lkr(0));
    expect(result.outcome).toEqual({ kind: "used-up" });
  });
});

describe("known costs and the graph", () => {
  it("projects a cost dated later this month on its date, without counting it as spent", () => {
    const result = forecast({
      today: 10,
      actualCosts: [spent(100, 5), spent(500, 15)],
    });
    expect(result.spent).toEqual(lkr(100));
    expect(result.upcoming).toEqual(lkr(500));
    expect(projectedOn(result, 14)).toBe(860);
    expect(projectedOn(result, 15)).toBe(350);
  });

  it("counts a payment made the month before towards its fixed cost", () => {
    const rent = fixed(900, 5);
    const paidEarly: ActualCost = {
      ...spent(900, 1, rent),
      month: "2026-09" as MonthKey,
      date: "2026-09-30" as LocalDate,
    };
    const result = forecast({
      today: 10,
      fixedCosts: [rent],
      payments: [paidEarly],
    });
    expect(result.spent).toEqual(lkr(0));
    expect(result.upcoming).toEqual(lkr(0));
    expect(result.outcome).toEqual({ kind: "lasts", remaining: lkr(1000) });
  });

  it("moves a due day past the month's end to its last day", () => {
    const february = "2026-02" as MonthKey;
    const result = forecastMonth({
      month: february,
      today: "2026-02-10" as LocalDate,
      budget: lkr(1000),
      actualCosts: [],
      fixedCosts: [{ ...fixed(1200, 31), month: february }],
      payments: [],
    });
    expect(result.ok && result.value.projected.at(-1)).toEqual({
      day: 28,
      remaining: lkr(-200),
    });
    expect(result.ok && result.value.outcome).toEqual({
      kind: "runs-out",
      day: 28,
    });
  });

  it("draws what was left at the end of each day so far", () => {
    const result = forecast({
      today: 6,
      actualCosts: [spent(100, 2), spent(50, 5)],
    });
    expect(result.actual).toEqual(
      [1000, 1000, 900, 900, 900, 850, 850].map((left, day) => ({
        day,
        remaining: lkr(left),
      })),
    );
  });

  it("projects to the month's end, below zero", () => {
    const result = forecast({
      today: 3,
      budget: 190,
      actualCosts: [spent(90, 1)],
    });
    expect(result.projected).toHaveLength(29);
    // 100 left, minus 28 days at 30 a day.
    expect(result.projected.at(-1)).toEqual({ day: 31, remaining: lkr(-740) });
  });
});

describe("unpaidAmount", () => {
  const rent = fixed(900, 20);

  it("is the fixed cost minus its payments, ignoring other fixed costs' payments", () => {
    const payments = [
      spent(400, 10, rent),
      spent(100, 11, rent),
      spent(50, 12, fixed(50, 1)),
    ];
    expect(unpaidAmount(rent, payments)).toEqual({ ok: true, value: lkr(400) });
  });

  it("is never below zero", () => {
    expect(unpaidAmount(rent, [spent(1000, 10, rent)])).toEqual({
      ok: true,
      value: lkr(0),
    });
  });

  it("refuses payments it can't add up exactly", () => {
    const inDollars = {
      ...spent(1, 10, rent),
      amount: { amountMinor: 1, currency: "USD" as const },
    };
    expect(unpaidAmount(rent, [inDollars])).toEqual({
      ok: false,
      error: "currency-mismatch",
    });
    const large = fixed(MAX, 20);
    expect(unpaidAmount(large, [spent(-MAX, 10, large)])).toEqual({
      ok: false,
      error: "out-of-range",
    });
  });
});

describe("input the forecast refuses", () => {
  const rent = fixed(900, 20);

  it.each<[string, Partial<ForecastInput>, string]>([
    [
      "today in another month",
      { today: "2026-11-01" as LocalDate },
      "outside-month",
    ],
    [
      "a cost filed under another month",
      { actualCosts: [{ ...spent(10, 1), month: "2026-09" as MonthKey }] },
      "outside-month",
    ],
    [
      "a cost dated in another month",
      { actualCosts: [{ ...spent(10, 1), date: "2026-11-01" as LocalDate }] },
      "outside-month",
    ],
    [
      "a cost on a day that doesn't exist",
      { actualCosts: [{ ...spent(10, 1), date: "2026-10-32" as LocalDate }] },
      "outside-month",
    ],
    [
      "a fixed cost of another month",
      { fixedCosts: [{ ...rent, month: "2026-11" as MonthKey }] },
      "outside-month",
    ],
    [
      "an amount in another currency",
      {
        actualCosts: [
          { ...spent(10, 1), amount: { amountMinor: 10, currency: "USD" } },
        ],
      },
      "currency-mismatch",
    ],
    ["a budget of zero", { budget: lkr(0) }, "not-positive"],
    ["a negative cost", { actualCosts: [spent(-10, 1)] }, "not-positive"],
    [
      "a fraction of a minor unit",
      { actualCosts: [spent(1.5, 1)] },
      "out-of-range",
    ],
    ["due day 0", { fixedCosts: [fixed(10, 0)] }, "invalid-due-day"],
    ["due day 32", { fixedCosts: [fixed(10, 32)] }, "invalid-due-day"],
    [
      "a fractional due day",
      { fixedCosts: [fixed(10, 1.5)] },
      "invalid-due-day",
    ],
    [
      "costs adding up beyond exact amounts",
      { actualCosts: [spent(MAX, 1), spent(MAX, 2)] },
      "out-of-range",
    ],
    [
      "payments adding up beyond exact amounts",
      {
        fixedCosts: [rent],
        payments: [spent(MAX, 1, rent), spent(MAX, 2, rent)],
      },
      "out-of-range",
    ],
  ])("refuses %s", (_label, change, error) => {
    expect(forecastMonth({ ...inputFor({ today: 10 }), ...change })).toEqual({
      ok: false,
      error,
    });
  });
});
