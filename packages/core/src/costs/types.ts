/**
 * Core types for the monthly cost-planning feature (FR-PLAN, FR-TAG, FR-ACT).
 *
 * All money amounts use the `Money` type from `../money/money` (DATA1).
 * IDs are branded strings, following the same pattern as `Uuid`.
 */

import type { Money } from "../money/money";
import type { Uuid } from "../ids/uuid";

// ── Identifiers ──────────────────────────────────────────────────────────

/** A cost type groups related costs, e.g. "Rent", "Groceries". */
export type CostTypeId = Uuid & { readonly __costType: true };

/** A user-defined label applied to costs and cost types. */
export type TagId = Uuid & { readonly __tag: true };

// ── Month key ────────────────────────────────────────────────────────────

/**
 * A calendar month in "YYYY-MM" format, e.g. "2026-10".
 *
 * Months are identified by string so they sort chronologically and
 * are independent of time zone (the ledger's time zone decides which
 * month a date falls in; see DATA3).
 */
export type MonthKey = string & { readonly __brand: "MonthKey" };

// ── Cost type ────────────────────────────────────────────────────────────

/** A named category of spending. Tags on the type are inherited by its costs (P-02). */
export interface CostType {
  readonly id: CostTypeId;
  readonly name: string;
  readonly tagIds: readonly TagId[];
}

// ── Tag ──────────────────────────────────────────────────────────────────

/** A user-defined label. */
export interface Tag {
  readonly id: TagId;
  readonly name: string;
}

// ── Estimated cost ───────────────────────────────────────────────────────

/**
 * A planned cost entry within a month (FR-PLAN-1).
 *
 * One or more estimated costs per type are summed into the type's
 * estimated subtotal (P-01, recommended). An estimated cost may
 * carry its own tags in addition to those inherited from its type.
 */
export interface EstimatedCost {
  readonly id: Uuid;
  readonly month: MonthKey;
  readonly costTypeId: CostTypeId;
  readonly amount: Money;
  readonly tagIds: readonly TagId[];
  readonly note: string;
}

// ── Actual cost ──────────────────────────────────────────────────────────

/**
 * A recorded real expense (FR-ACT-1).
 *
 * Actual costs reference a cost type, which may have been created on the
 * fly during entry (FR-ACT-2). They are separate from estimates; an
 * actual cost without a matching estimate is shown as unplanned (P-01).
 */
export interface ActualCost {
  readonly id: Uuid;
  readonly month: MonthKey;
  readonly costTypeId: CostTypeId;
  readonly amount: Money;
  readonly tagIds: readonly TagId[];
  readonly note: string;
  readonly date: string; // LocalDate in "YYYY-MM-DD" format (DATA3)
}

// ── Fixed obligation (FR-FORECAST-2) ─────────────────────────────────────

/**
 * A known upcoming fixed cost with a due date within the month (P-05).
 *
 * Fixed obligations are projected separately from variable spending.
 * When matched to an actual payment, the obligation's unpaid remainder
 * drops from the forecast (AC-06).
 */
export interface FixedObligation {
  readonly id: Uuid;
  readonly month: MonthKey;
  readonly costTypeId: CostTypeId;
  readonly amount: Money;
  readonly dueDay: number; // 1–31, clamped to the month's last day
  readonly paid: boolean;
}
