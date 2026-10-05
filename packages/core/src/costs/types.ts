/**
 * Core types for monthly cost planning (FR-PLAN, FR-TAG, FR-ACT,
 * FR-FORECAST).
 *
 * Amounts use `Money` (DATA1). They are positive and in the ledger's base
 * currency (FR-PLAN-4); the database enforces both, and the calculations
 * check them again. IDs are branded strings, following the pattern of
 * `Uuid`.
 */

import type { LocalDate } from "../dates/local-date";
import type { Uuid } from "../ids/uuid";
import type { Money } from "../money/money";

// ── Identifiers ──────────────────────────────────────────────────────────

/** A cost type groups related costs, e.g. "Rent", "Groceries". */
export type CostTypeId = Uuid & { readonly __costType: true };

/** A user-defined label applied to costs and cost types. */
export type TagId = Uuid & { readonly __tag: true };

/** A fixed cost, such as rent, that actual costs can pay. */
export type FixedObligationId = Uuid & { readonly __fixedObligation: true };

// ── Month key ────────────────────────────────────────────────────────────

/**
 * A calendar month in "YYYY-MM" format, e.g. "2026-10".
 *
 * Months are identified by string so they sort chronologically and
 * are independent of time zone (the ledger's time zone decides which
 * month a date falls in; see DATA3).
 */
export type MonthKey = string & { readonly __brand: "MonthKey" };

// ── Cost type and tags ───────────────────────────────────────────────────

/**
 * A named category of spending. Its tags are copied onto each new cost of
 * the type when the cost is recorded (FR-TAG-2, D-168).
 */
export interface CostType {
  readonly id: CostTypeId;
  readonly name: string;
  readonly tagIds: readonly TagId[];
}

/** A user-defined label. */
export interface Tag {
  readonly id: TagId;
  readonly name: string;
}

// ── Estimated cost ───────────────────────────────────────────────────────

/**
 * A planned item within a month (FR-PLAN-1, D-170). A cost type's estimate
 * is the sum of its planned items.
 */
export interface EstimatedCost {
  readonly id: Uuid;
  readonly month: MonthKey;
  readonly costTypeId: CostTypeId;
  readonly amount: Money;
  /** The tags recorded with the item: its own and its type's at the time (D-168). */
  readonly tagIds: readonly TagId[];
  readonly note: string;
}

// ── Actual cost ──────────────────────────────────────────────────────────

/**
 * A recorded expense (FR-ACT-1). An actual cost without a planned item of
 * its type is unplanned (FR-ACT-3).
 */
export interface ActualCost {
  readonly id: Uuid;
  readonly month: MonthKey;
  readonly costTypeId: CostTypeId;
  readonly amount: Money;
  /** The tags recorded with the cost: its own and its type's at the time (D-168). */
  readonly tagIds: readonly TagId[];
  readonly note: string;
  /** The day it was spent, in the ledger's time zone (DATA3). */
  readonly date: LocalDate;
  /** The fixed cost this cost pays, if any (D-167). */
  readonly fixedObligationId: FixedObligationId | null;
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
