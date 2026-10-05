/**
 * Tags on costs, and totals by tag (FR-TAG-1–5, D-168).
 *
 * A cost records its tags when it's recorded: the ones chosen for it, plus its
 * cost type's at that moment. Reports use those recorded tags only, so
 * editing a cost type's tags never changes past reports.
 *
 * Every amount must be in `currency`, the ledger's base currency (DATA2).
 */

import type { CurrencyCode } from "../money/currency";
import { addMoney, type Money, sumMoney, zeroMoney } from "../money/money";
import { ok, type Result } from "../result";
import type { CostType, EstimatedCost, TagId } from "./types";

/** A planned item or an actual cost: an amount and its recorded tags. */
export type TaggedCost = Pick<EstimatedCost, "amount" | "tagIds">;

/** Whether a selection of several tags needs any of them or all of them (P-03). */
export type TagMatch = "any" | "all";

/**
 * The tags to record on a new cost: the ones chosen for it, then its cost
 * type's current tags, each once (FR-TAG-2, AC-03).
 */
export function tagsForNewCost(
  chosen: readonly TagId[],
  costType: CostType,
): readonly TagId[] {
  return [...new Set([...chosen, ...costType.tagIds])];
}

/**
 * Whether a cost's recorded tags match a selection: any or all of the
 * selected tags (FR-TAG-5). An empty selection matches every cost.
 */
export function matchesTags(
  tagIds: readonly TagId[],
  selected: readonly TagId[],
  match: TagMatch,
): boolean {
  if (selected.length === 0) return true;
  const recorded = new Set(tagIds);
  return match === "any"
    ? selected.some((tagId) => recorded.has(tagId))
    : selected.every((tagId) => recorded.has(tagId));
}

/**
 * The total of the costs that match a selection. A cost counts once, however
 * many of the selected tags it has (FR-TAG-5, AC-03).
 */
export function sumMatchingTags(
  costs: readonly TaggedCost[],
  selected: readonly TagId[],
  match: TagMatch,
  currency: CurrencyCode,
): Result<Money, "currency-mismatch" | "out-of-range"> {
  return sumMoney(
    costs
      .filter((cost) => matchesTags(cost.tagIds, selected, match))
      .map((cost) => cost.amount),
    currency,
  );
}

/** Totals for a report by tag (FR-TAG-3–4). */
export interface TagReport {
  /** Each reported tag's total. A cost can have several tags, so these overlap and don't add up to `total`. */
  readonly byTag: ReadonlyMap<TagId, Money>;
  /** The costs with none of the reported tags (FR-TAG-4). */
  readonly untagged: Money;
  /** Every cost, once. */
  readonly total: Money;
}

/**
 * Totals by tag, with an untagged group (FR-TAG-3–4, AC-02).
 *
 * Pass the ledger's current tags as `tagIds`. A cost whose recorded tags have
 * all been deleted since counts as untagged, so every cost appears in at least
 * one group.
 */
export function tagReport(
  costs: readonly TaggedCost[],
  tagIds: readonly TagId[],
  currency: CurrencyCode,
): Result<TagReport, "currency-mismatch" | "out-of-range"> {
  const byTag = new Map<TagId, Money>(
    tagIds.map((tagId) => [tagId, zeroMoney(currency)]),
  );
  let untagged = zeroMoney(currency);
  let total = zeroMoney(currency);

  for (const cost of costs) {
    const sum = addMoney(total, cost.amount);
    if (!sum.ok) return sum;
    total = sum.value;

    const recorded = new Set(cost.tagIds);
    let tagged = false;
    for (const [tagId, tagTotal] of byTag) {
      if (!recorded.has(tagId)) continue;
      tagged = true;
      const next = addMoney(tagTotal, cost.amount);
      if (!next.ok) return next;
      byTag.set(tagId, next.value);
    }
    if (!tagged) {
      const next = addMoney(untagged, cost.amount);
      if (!next.ok) return next;
      untagged = next.value;
    }
  }
  return ok({ byTag, untagged, total });
}
