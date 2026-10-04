/**
 * Spending forecast and estimated exhaustion time (FR-FORECAST-1, FR-FORECAST-2).
 *
 * The forecast projects when a monthly spending allocation will run out,
 * accounting for both fixed obligations and variable spending.
 *
 * Key design decisions (from cost-planning spec):
 * - P-04: Forecast a user-confirmed monthly allocation.
 * - P-05: Fixed obligations have due dates; only unpaid remainder is projected.
 * - P-06: Variable spending uses an explainable daily rate, excluding fixed costs.
 *
 * All amounts are in minor units of the same currency. Currency mixing is
 * rejected by the Money module before reaching here.
 */

import type { Money } from "../money/money";
import { subtractMoney, zeroMoney, compareMoney } from "../money/money";
import { sumMoney } from "../money/money";
import type { Result } from "../result";
import { ok, err } from "../result";
import type { FixedObligation } from "./types";

// ── Types ────────────────────────────────────────────────────────────────

/** Input for the forecast calculation. */
export interface ForecastInput {
  /** The confirmed monthly spending allocation (P-04). */
  readonly allocation: Money;
  /** Total actual spending so far this month (variable + fixed already paid). */
  readonly actualSpent: Money;
  /** Unpaid fixed obligations remaining this month (P-05). */
  readonly unpaidObligations: readonly FixedObligation[];
  /** The current day of the month (1-based). */
  readonly currentDay: number;
  /** Total days in this month. */
  readonly totalDays: number;
  /** Days of actual variable spending observed (for daily rate, P-06). */
  readonly observedVariableDays: number;
  /** Total variable spending observed (actual minus fixed payments). */
  readonly variableSpent: Money;
}

/** The result of a forecast calculation. */
export type ForecastResult =
  | { readonly status: "exhausted"; readonly message: string }
  | { readonly status: "insufficient-data"; readonly message: string }
  | {
      readonly status: "projected";
      readonly exhaustionDay: number;
      readonly message: string;
      readonly dailyRate: Money;
    }
  | {
      readonly status: "within-budget";
      readonly message: string;
      readonly dailyRate: Money;
    };

/** A point on the forecast graph. */
export interface ForecastPoint {
  /** Day of the month (1-based). */
  readonly day: number;
  /** Remaining allocation at this point (in minor units). */
  readonly remaining: Money;
}

// ── Minimum observations for a meaningful rate (P-06) ────────────────────

const MIN_OBSERVATION_DAYS = 3;

// ── Forecast calculation ─────────────────────────────────────────────────

/**
 * Calculate the spending forecast for the current month.
 *
 * Returns the projected exhaustion day, or a status explaining why
 * no projection is possible (AC-07).
 */
export function calculateForecast(
  input: ForecastInput,
): Result<ForecastResult, "currency-mismatch"> {
  const { allocation, actualSpent, currentDay, totalDays } = input;
  const currency = allocation.currency;

  // Verify all amounts are in the same currency.
  if (actualSpent.currency !== currency) return err("currency-mismatch");
  if (input.variableSpent.currency !== currency)
    return err("currency-mismatch");
  for (const obligation of input.unpaidObligations) {
    if (obligation.amount.currency !== currency)
      return err("currency-mismatch");
  }

  // Check if already exhausted (AC-07).
  const remainingResult = subtractMoney(allocation, actualSpent);
  if (!remainingResult.ok) return err("currency-mismatch");
  const remaining = remainingResult.value;

  const cmp = compareMoney(remaining, zeroMoney(currency));
  if (!cmp.ok) return err("currency-mismatch");
  if (cmp.value <= 0) {
    return ok({
      status: "exhausted",
      message: "The monthly allocation is already exhausted.",
    });
  }

  // Sum unpaid fixed obligations.
  const unpaidAmounts = input.unpaidObligations.map((o) => o.amount);
  const unpaidTotalResult = sumMoney(unpaidAmounts, currency);
  if (!unpaidTotalResult.ok) return err("currency-mismatch");
  const unpaidTotal = unpaidTotalResult.value;

  // Remaining after unpaid obligations.
  const afterFixedResult = subtractMoney(remaining, unpaidTotal);
  if (!afterFixedResult.ok) return err("currency-mismatch");
  const afterFixed = afterFixedResult.value;

  // Check if fixed obligations alone exhaust the allocation (AC-06).
  const fixedCmp = compareMoney(afterFixed, zeroMoney(currency));
  if (!fixedCmp.ok) return err("currency-mismatch");
  if (fixedCmp.value <= 0) {
    // Find the earliest due day among unpaid obligations.
    const earliestDueDay = Math.min(
      ...input.unpaidObligations.map((o) => Math.min(o.dueDay, totalDays)),
    );
    return ok({
      status: "projected",
      exhaustionDay: earliestDueDay,
      message: `Unpaid fixed obligations will exhaust the allocation on day ${String(earliestDueDay)}.`,
      dailyRate: zeroMoney(currency),
    });
  }

  // Check for insufficient observations (AC-07).
  if (input.observedVariableDays < MIN_OBSERVATION_DAYS) {
    return ok({
      status: "insufficient-data",
      message: `Insufficient spending data (${String(input.observedVariableDays)} days observed, ${String(MIN_OBSERVATION_DAYS)} needed). Known fixed obligations are still tracked.`,
    });
  }

  // Calculate the daily variable spending rate (P-06).
  const dailyRateMinor = Math.round(
    input.variableSpent.amountMinor / input.observedVariableDays,
  );
  const dailyRate: Money = { amountMinor: dailyRateMinor, currency };

  // Project exhaustion day.
  if (dailyRateMinor <= 0) {
    return ok({
      status: "within-budget",
      message:
        "Variable spending rate is zero or negative; no exhaustion projected within this month.",
      dailyRate,
    });
  }

  const daysOfVariableLeft = Math.floor(
    afterFixed.amountMinor / dailyRateMinor,
  );
  const projectedExhaustionDay = currentDay + daysOfVariableLeft;

  // Check if fixed obligations hit first.
  const sortedObligations = [...input.unpaidObligations]
    .map((o) => ({ ...o, effectiveDueDay: Math.min(o.dueDay, totalDays) }))
    .sort((a, b) => a.effectiveDueDay - b.effectiveDueDay);

  let runningRemaining = remaining.amountMinor;
  for (const obligation of sortedObligations) {
    const daysUntilDue = obligation.effectiveDueDay - currentDay;
    if (daysUntilDue > 0) {
      const spentByDueDay = dailyRateMinor * daysUntilDue;
      if (spentByDueDay >= runningRemaining) {
        // Variable spending exhausts before this obligation.
        const exhaustDay =
          currentDay + Math.floor(runningRemaining / dailyRateMinor);
        return ok({
          status: "projected",
          exhaustionDay: Math.min(exhaustDay, totalDays),
          message: `Projected exhaustion on day ${String(Math.min(exhaustDay, totalDays))} based on variable spending rate.`,
          dailyRate,
        });
      }
      runningRemaining -= spentByDueDay;
    }
    // Deduct the obligation.
    runningRemaining -= obligation.amount.amountMinor;
    if (runningRemaining <= 0) {
      return ok({
        status: "projected",
        exhaustionDay: obligation.effectiveDueDay,
        message: `Projected exhaustion on day ${String(obligation.effectiveDueDay)} when a fixed obligation is due.`,
        dailyRate,
      });
    }
  }

  // No obligation-driven exhaustion; project from remaining variable budget.
  if (projectedExhaustionDay > totalDays) {
    return ok({
      status: "within-budget",
      message: "Spending is projected to stay within the monthly allocation.",
      dailyRate,
    });
  }

  return ok({
    status: "projected",
    exhaustionDay: projectedExhaustionDay,
    message: `Projected exhaustion on day ${String(projectedExhaustionDay)} based on current variable spending rate.`,
    dailyRate,
  });
}

// ── Forecast graph points ────────────────────────────────────────────────

/**
 * Generate the data points for a spending forecast graph.
 *
 * Shows actual remaining for past days, then projected remaining
 * for future days, with step-downs on fixed obligation due dates (AC-06).
 */
export function forecastGraphPoints(
  input: ForecastInput,
): Result<readonly ForecastPoint[], "currency-mismatch"> {
  const { allocation, currentDay, totalDays } = input;
  const currency = allocation.currency;

  // Verify currencies.
  if (input.actualSpent.currency !== currency) return err("currency-mismatch");
  if (input.variableSpent.currency !== currency)
    return err("currency-mismatch");
  for (const obligation of input.unpaidObligations) {
    if (obligation.amount.currency !== currency)
      return err("currency-mismatch");
  }

  const points: ForecastPoint[] = [];

  // Day 0: full allocation.
  points.push({ day: 0, remaining: allocation });

  // Day 1 to currentDay: actual remaining.
  const remainingResult = subtractMoney(allocation, input.actualSpent);
  if (!remainingResult.ok) return err("currency-mismatch");
  const currentRemaining = remainingResult.value;

  // For simplicity, show a linear interpolation from allocation to current remaining
  // for past days (actual daily granularity would need per-day spending data).
  if (currentDay > 0) {
    const dailyDecrement = Math.round(
      input.actualSpent.amountMinor / currentDay,
    );
    for (let day = 1; day <= currentDay; day++) {
      const spent = dailyDecrement * day;
      const rem = allocation.amountMinor - spent;
      points.push({
        day,
        remaining: { amountMinor: Math.max(rem, 0), currency },
      });
    }
    // Correct the last actual day to the true remaining.
    points[points.length - 1] = {
      day: currentDay,
      remaining: currentRemaining,
    };
  }

  // Future projection.
  const hasEnoughData = input.observedVariableDays >= MIN_OBSERVATION_DAYS;
  const dailyVariableRate = hasEnoughData
    ? Math.round(input.variableSpent.amountMinor / input.observedVariableDays)
    : 0;

  // Sort unpaid obligations by effective due day.
  const obligations = [...input.unpaidObligations]
    .map((o) => ({ ...o, effectiveDueDay: Math.min(o.dueDay, totalDays) }))
    .sort((a, b) => a.effectiveDueDay - b.effectiveDueDay);

  let projectedRemaining = currentRemaining.amountMinor;
  let obligationIndex = 0;

  for (let day = currentDay + 1; day <= totalDays; day++) {
    // Deduct daily variable spending.
    projectedRemaining -= dailyVariableRate;

    // Deduct any fixed obligations due on this day.
    while (obligationIndex < obligations.length) {
      const obligation = obligations[obligationIndex];
      if (obligation?.effectiveDueDay !== day) break;
      projectedRemaining -= obligation.amount.amountMinor;
      obligationIndex++;
    }

    points.push({
      day,
      remaining: {
        amountMinor: Math.max(projectedRemaining, 0),
        currency,
      },
    });

    if (projectedRemaining <= 0) break;
  }

  return ok(points);
}
