/**
 * A month's planned and actual totals, overall and by cost type (FR-PLAN-2,
 * FR-ACT-3, AC-01).
 *
 * The functions add up every cost they're given, so pass one month's costs.
 * Every amount must be in `currency`, the ledger's base currency (DATA2).
 */

import type { CurrencyCode } from "../money/currency";
import { addMoney, type Money, sumMoney, zeroMoney } from "../money/money";
import { ok, type Result } from "../result";
import type { ActualCost, CostTypeId, EstimatedCost } from "./types";

/**
 * The month's estimated total: the sum of its planned items (FR-PLAN-2). It's
 * also the budget to suggest for the month (FR-PLAN-3).
 */
export function sumAllEstimated(
  estimates: readonly EstimatedCost[],
  currency: CurrencyCode,
): Result<Money, "currency-mismatch" | "out-of-range"> {
  return sumMoney(
    estimates.map((estimate) => estimate.amount),
    currency,
  );
}

/** The month's actual spending (FR-ACT-3). */
export function sumAllActual(
  actuals: readonly ActualCost[],
  currency: CurrencyCode,
): Result<Money, "currency-mismatch" | "out-of-range"> {
  return sumMoney(
    actuals.map((actual) => actual.amount),
    currency,
  );
}

/** A cost type's estimate and actual spending in a month. */
export interface CostTypeTotals {
  /** The sum of the type's planned items (FR-PLAN-2). */
  readonly estimated: Money;
  readonly actual: Money;
  /** The type has actual costs but no planned items (FR-ACT-3). */
  readonly unplanned: boolean;
}

/**
 * Each cost type's estimate and actual spending (FR-PLAN-2, FR-ACT-3). A type
 * appears once it has a planned item or an actual cost.
 */
export function costTypeTotals(
  estimates: readonly EstimatedCost[],
  actuals: readonly ActualCost[],
  currency: CurrencyCode,
): Result<
  ReadonlyMap<CostTypeId, CostTypeTotals>,
  "currency-mismatch" | "out-of-range"
> {
  const totals = new Map<CostTypeId, CostTypeTotals>();
  const totalsOf = (costTypeId: CostTypeId): CostTypeTotals =>
    totals.get(costTypeId) ?? {
      estimated: zeroMoney(currency),
      actual: zeroMoney(currency),
      unplanned: true,
    };

  for (const estimate of estimates) {
    const current = totalsOf(estimate.costTypeId);
    const estimated = addMoney(current.estimated, estimate.amount);
    if (!estimated.ok) return estimated;
    totals.set(estimate.costTypeId, {
      ...current,
      estimated: estimated.value,
      unplanned: false,
    });
  }
  for (const actualCost of actuals) {
    const current = totalsOf(actualCost.costTypeId);
    const actual = addMoney(current.actual, actualCost.amount);
    if (!actual.ok) return actual;
    totals.set(actualCost.costTypeId, { ...current, actual: actual.value });
  }
  return ok(totals);
}
