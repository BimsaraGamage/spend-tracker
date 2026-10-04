import { describe, expect, it } from "vitest";
import type { Money } from "../money/money";
import type { Uuid } from "../ids/uuid";
import type { CostTypeId, FixedObligation, MonthKey } from "./types";
import {
  calculateForecast,
  forecastGraphPoints,
  type ForecastInput,
} from "./forecast";

// ── Test helpers ─────────────────────────────────────────────────────────

const month = "2026-10" as MonthKey;
const lkr = (amountMinor: number): Money => ({ amountMinor, currency: "LKR" });
const typeRent = "type-rent" as unknown as CostTypeId;

function uuid(label: string): Uuid {
  return label as unknown as Uuid;
}

function makeObligation(
  id: string,
  amount: number,
  dueDay: number,
  paid = false,
): FixedObligation {
  return {
    id: uuid(id),
    month,
    costTypeId: typeRent,
    amount: lkr(amount),
    dueDay,
    paid,
  };
}

function makeInput(overrides: Partial<ForecastInput> = {}): ForecastInput {
  return {
    allocation: lkr(100000),
    actualSpent: lkr(20000),
    unpaidObligations: [],
    currentDay: 10,
    totalDays: 31,
    observedVariableDays: 10,
    variableSpent: lkr(20000),
    ...overrides,
  };
}

// ── Basic forecast (FR-FORECAST-1) ───────────────────────────────────────

describe("calculateForecast", () => {
  it("projects exhaustion based on variable spending rate", () => {
    // Allocation: 100,000, spent: 20,000, remaining: 80,000.
    // Daily rate: 20,000 / 10 = 2,000/day.
    // Days of variable left: 80,000 / 2,000 = 40.
    // Projected exhaustion: day 10 + 40 = day 50 → beyond month (31 days).
    const result = calculateForecast(makeInput());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.status).toBe("within-budget");
    }
  });

  it("detects already-exhausted allocation", () => {
    const result = calculateForecast(makeInput({ actualSpent: lkr(100000) }));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.status).toBe("exhausted");
    }
  });

  it("detects already-exceeded allocation", () => {
    const result = calculateForecast(makeInput({ actualSpent: lkr(120000) }));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.status).toBe("exhausted");
    }
  });

  it("reports insufficient data with few observations (AC-07)", () => {
    const result = calculateForecast(makeInput({ observedVariableDays: 2 }));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.status).toBe("insufficient-data");
    }
  });

  it("projects exhaustion within the month", () => {
    // Allocation: 100,000, spent: 50,000, remaining: 50,000.
    // Daily rate: 50,000 / 10 = 5,000/day.
    // Days left: 50,000 / 5,000 = 10.
    // Projected exhaustion: day 10 + 10 = day 20.
    const result = calculateForecast(
      makeInput({
        actualSpent: lkr(50000),
        variableSpent: lkr(50000),
      }),
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.status).toBe("projected");
      if (result.value.status === "projected") {
        expect(result.value.exhaustionDay).toBe(20);
      }
    }
  });

  it("rejects mixed currencies", () => {
    const result = calculateForecast(
      makeInput({ actualSpent: { amountMinor: 20000, currency: "USD" } }),
    );
    expect(result).toEqual({ ok: false, error: "currency-mismatch" });
  });
});

// ── Fixed obligations (AC-06) ────────────────────────────────────────────

describe("fixed obligations (AC-06)", () => {
  it("projects exhaustion on fixed obligation due day", () => {
    // AC-06: Allocation 100,000, actual 20,000, remaining 80,000.
    // Unpaid obligation of 90,000 on day 20.
    // After obligation: 80,000 - 90,000 = -10,000 → exhaustion on day 20.
    const result = calculateForecast(
      makeInput({
        allocation: lkr(100000),
        actualSpent: lkr(20000),
        variableSpent: lkr(20000),
        unpaidObligations: [makeObligation("o1", 90000, 20)],
        currentDay: 10,
        observedVariableDays: 10,
      }),
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.status).toBe("projected");
      if (result.value.status === "projected") {
        expect(result.value.exhaustionDay).toBe(20);
      }
    }
  });

  it("does not double-count a paid obligation", () => {
    // A paid obligation should not be in the unpaid list at all.
    // The caller is responsible for filtering. This test confirms
    // that only unpaid obligations affect the forecast.
    const result = calculateForecast(
      makeInput({
        allocation: lkr(100000),
        actualSpent: lkr(20000),
        variableSpent: lkr(20000),
        unpaidObligations: [], // obligation already paid
      }),
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.status).toBe("within-budget");
    }
  });
});

// ── Forecast graph points ────────────────────────────────────────────────

describe("forecastGraphPoints", () => {
  it("generates points from day 0 through projected days", () => {
    const result = forecastGraphPoints(makeInput());
    expect(result.ok).toBe(true);
    if (result.ok) {
      const points = result.value;
      // Should start at day 0 with full allocation.
      expect(points[0]).toEqual({ day: 0, remaining: lkr(100000) });
      // Should include current day.
      const currentDayPoint = points.find((p) => p.day === 10);
      expect(currentDayPoint).toBeDefined();
      if (currentDayPoint) {
        // Remaining should be allocation - actualSpent = 80,000.
        expect(currentDayPoint.remaining).toEqual(lkr(80000));
      }
      // Should extend into future days.
      expect(points.length).toBeGreaterThan(11);
    }
  });

  it("shows step-down on fixed obligation due date", () => {
    const result = forecastGraphPoints(
      makeInput({
        unpaidObligations: [makeObligation("o1", 30000, 20)],
      }),
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      const points = result.value;
      const day19 = points.find((p) => p.day === 19);
      const day20 = points.find((p) => p.day === 20);
      expect(day19).toBeDefined();
      expect(day20).toBeDefined();
      if (day19 && day20) {
        // Day 20 should show a bigger drop than a normal day due to the obligation.
        const normalDailyDrop = 2000; // 20,000 / 10 days
        const day19to20Drop =
          day19.remaining.amountMinor - day20.remaining.amountMinor;
        // The drop should be approximately normalDailyDrop + 30,000.
        expect(day19to20Drop).toBeGreaterThan(normalDailyDrop);
      }
    }
  });

  it("stops at zero remaining", () => {
    const result = forecastGraphPoints(
      makeInput({
        allocation: lkr(25000),
        actualSpent: lkr(20000),
        variableSpent: lkr(20000),
        // Remaining: 5,000. Daily rate: 2,000. Should exhaust in ~2-3 days.
      }),
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      const points = result.value;
      const lastPoint = points[points.length - 1];
      expect(lastPoint).toBeDefined();
      if (!lastPoint) return;
      expect(lastPoint.remaining.amountMinor).toBe(0);
      // Should stop well before day 31.
      expect(lastPoint.day).toBeLessThan(20);
    }
  });

  it("rejects mixed currencies", () => {
    const result = forecastGraphPoints(
      makeInput({ actualSpent: { amountMinor: 20000, currency: "USD" } }),
    );
    expect(result).toEqual({ ok: false, error: "currency-mismatch" });
  });
});
