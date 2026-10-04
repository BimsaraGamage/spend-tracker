/**
 * Arithmetic and grouping for cost estimates and actuals (FR-PLAN-2, FR-ACT-3, FR-TAG-3).
 *
 * This module contains pure functions that operate on arrays of costs
 * and produce subtotals. It uses the `Money` arithmetic from `../money/money`
 * and never mixes currencies (DATA2). All amounts must share the same
 * currency; a `currency-mismatch` error is returned otherwise.
 */

import type { CurrencyCode } from "../money/currency";
import type { Money } from "../money/money";
import { sumMoney } from "../money/money";
import type { Result } from "../result";
import type {
  ActualCost,
  CostType,
  CostTypeId,
  EstimatedCost,
  TagId,
} from "./types";

// ── Summing by cost type (FR-PLAN-2, FR-ACT-3) ──────────────────────────

/** Total of estimated costs for a single cost type in one month. */
export function sumEstimatedByType(
  estimates: readonly EstimatedCost[],
  costTypeId: CostTypeId,
  currency: CurrencyCode,
): Result<Money, "currency-mismatch" | "out-of-range"> {
  const matched = estimates.filter((e) => e.costTypeId === costTypeId);
  return sumMoney(
    matched.map((e) => e.amount),
    currency,
  );
}

/** Total of actual costs for a single cost type in one month. */
export function sumActualByType(
  actuals: readonly ActualCost[],
  costTypeId: CostTypeId,
  currency: CurrencyCode,
): Result<Money, "currency-mismatch" | "out-of-range"> {
  const matched = actuals.filter((a) => a.costTypeId === costTypeId);
  return sumMoney(
    matched.map((a) => a.amount),
    currency,
  );
}

// ── Grand totals (FR-PLAN-2, FR-ACT-3) ──────────────────────────────────

/** Sum all estimated costs for a month. */
export function sumAllEstimated(
  estimates: readonly EstimatedCost[],
  currency: CurrencyCode,
): Result<Money, "currency-mismatch" | "out-of-range"> {
  return sumMoney(
    estimates.map((e) => e.amount),
    currency,
  );
}

/** Sum all actual costs for a month. */
export function sumAllActual(
  actuals: readonly ActualCost[],
  currency: CurrencyCode,
): Result<Money, "currency-mismatch" | "out-of-range"> {
  return sumMoney(
    actuals.map((a) => a.amount),
    currency,
  );
}

// ── Tag-based totals (FR-TAG-3, FR-TAG-4) ────────────────────────────────

/**
 * The effective tags for a cost: its own tags combined with those
 * inherited from its cost type, without duplicates (P-02, recommended).
 */
export function effectiveTags(
  costTagIds: readonly TagId[],
  costType: CostType,
): readonly TagId[] {
  const seen = new Set<TagId>(costTagIds);
  for (const tagId of costType.tagIds) {
    seen.add(tagId);
  }
  return [...seen];
}

/**
 * Whether a cost matches a tag filter.
 *
 * - `"any"`: the cost matches if it has at least one of `filterTagIds`.
 * - `"all"`: the cost matches if it has every one of `filterTagIds`.
 *
 * Matching uses effective tags (own + inherited). (FR-TAG-5, P-03, recommended.)
 */
export function matchesTags(
  costEffectiveTags: readonly TagId[],
  filterTagIds: readonly TagId[],
  mode: "any" | "all",
): boolean {
  if (filterTagIds.length === 0) return true;
  const effective = new Set(costEffectiveTags);
  return mode === "any"
    ? filterTagIds.some((id) => effective.has(id))
    : filterTagIds.every((id) => effective.has(id));
}

/**
 * Whether a cost is "untagged": it has no effective tags at all (FR-TAG-4).
 */
export function isUntagged(
  costTagIds: readonly TagId[],
  costType: CostType,
): boolean {
  return effectiveTags(costTagIds, costType).length === 0;
}

/**
 * Sum costs matching a tag filter. Each matching cost contributes its full
 * amount once, regardless of how many tags match (P-03, recommended: no
 * allocation among tags; tag-group sums may overlap the grand total).
 */
export function sumByTags(
  costs: readonly (EstimatedCost | ActualCost)[],
  costTypes: ReadonlyMap<CostTypeId, CostType>,
  filterTagIds: readonly TagId[],
  mode: "any" | "all",
  currency: CurrencyCode,
): Result<Money, "currency-mismatch" | "out-of-range"> {
  const matched = costs.filter((cost) => {
    const costType = costTypes.get(cost.costTypeId);
    if (!costType) return false;
    const tags = effectiveTags(cost.tagIds, costType);
    return matchesTags(tags, filterTagIds, mode);
  });
  return sumMoney(
    matched.map((c) => c.amount),
    currency,
  );
}

/**
 * Sum costs that have no effective tags (FR-TAG-4).
 */
export function sumUntagged(
  costs: readonly (EstimatedCost | ActualCost)[],
  costTypes: ReadonlyMap<CostTypeId, CostType>,
  currency: CurrencyCode,
): Result<Money, "currency-mismatch" | "out-of-range"> {
  const matched = costs.filter((cost) => {
    const costType = costTypes.get(cost.costTypeId);
    if (!costType) return false;
    return isUntagged(cost.tagIds, costType);
  });
  return sumMoney(
    matched.map((c) => c.amount),
    currency,
  );
}
