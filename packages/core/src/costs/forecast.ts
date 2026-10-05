/**
 * When the month's budget runs out (FR-FORECAST-1–2, AC-06, AC-07).
 *
 * The forecast follows the maintainer's decisions:
 * - It tracks the month's budget (D-166).
 * - A fixed cost drops on its due day, by what's still unpaid. An unpaid
 *   fixed cost past its due day is due today (D-167).
 * - An actual cost dated after today drops on its date: it's known, but not
 *   spent yet.
 * - Variable spending continues at this month's average daily pace: costs
 *   that don't pay a fixed cost, divided by the month's days so far,
 *   including today and days without spending. Below three days the pace
 *   is unknown, and only known costs are projected (D-171).
 * - The budget runs out on the first day projected spending reaches it.
 *
 * Amounts are exact: projected spending is rounded down to whole minor units
 * only at each point, so a day counts as running out exactly when the exact
 * average reaches the budget (DATA1). Results are codes and amounts, never
 * text: the app words them (CON7).
 */

import { type LocalDate, parseLocalDate } from "../dates/local-date";
import type { CurrencyCode } from "../money/currency";
import { type Money, subtractMoney, sumMoney, zeroMoney } from "../money/money";
import { err, ok, type Result } from "../result";
import { daysInMonth } from "./month-key";
import type { ActualCost, FixedObligation, MonthKey } from "./types";

/** The fewest days the pace is measured over (D-171). */
export const MIN_PACE_DAYS = 3;

/** What the forecast needs. Every amount is in the budget's currency. */
export interface ForecastInput {
  readonly month: MonthKey;
  /** Today in the ledger's time zone (DATA3). It must fall in `month`. */
  readonly today: LocalDate;
  /** The month's budget (D-166). */
  readonly budget: Money;
  /** The month's actual costs, including payments of fixed costs. */
  readonly actualCosts: readonly ActualCost[];
  /** The month's fixed costs. */
  readonly fixedCosts: readonly FixedObligation[];
  /**
   * The actual costs that pay any of `fixedCosts`, whichever month they're
   * dated in: a bill paid early still counts towards its fixed cost.
   */
  readonly payments: readonly ActualCost[];
}

/** Why a forecast couldn't be made. */
export type ForecastError =
  /** An amount isn't in the budget's currency (DATA2). */
  | "currency-mismatch"
  /** The budget or a cost isn't a positive amount (FR-PLAN-4). */
  | "not-positive"
  /** Today, an actual cost or a fixed cost isn't in the month. */
  | "outside-month"
  /** A fixed cost's due day isn't a whole number from 1 to 31. */
  | "invalid-due-day"
  /** A total is too large to be exact (DATA1). */
  | "out-of-range";

/** How fast variable spending goes (D-171). */
export type Pace =
  | {
      readonly kind: "measured";
      /** The month's days so far, including today. */
      readonly days: number;
      /** Variable spending over those days. */
      readonly spent: Money;
      /** The average per day, rounded to the nearest minor unit, halves up. Projections use the exact average. */
      readonly daily: Money;
    }
  | {
      readonly kind: "not-enough-data";
      readonly days: number;
      readonly daysNeeded: number;
    };

/** What happens to the budget by the month's end (AC-07). */
export type ForecastOutcome =
  /** Spending so far has reached the budget. */
  | { readonly kind: "used-up" }
  /** Projected spending reaches the budget on this day of the month, which may be today. */
  | { readonly kind: "runs-out"; readonly day: number }
  /** The budget lasts to the month's end, with `remaining` left. */
  | { readonly kind: "lasts"; readonly remaining: Money }
  /** Known costs don't use the budget up, and it's too early for a pace. */
  | { readonly kind: "not-enough-data" };

/** The budget left at the end of a day of the month. Day 0 is the month's start. */
export interface ForecastPoint {
  readonly day: number;
  readonly remaining: Money;
}

/** The forecast, with the figures the app needs to explain it (AC-07). */
export interface Forecast {
  readonly budget: Money;
  /** Actual costs dated up to and including today. */
  readonly spent: Money;
  /** The budget minus `spent`; negative once overspent. */
  readonly remaining: Money;
  /** Known costs still to come this month: unpaid fixed costs, and actual costs dated after today. */
  readonly upcoming: Money;
  readonly pace: Pace;
  readonly outcome: ForecastOutcome;
  /** What was left at the end of each day, from day 0 to today. */
  readonly actual: readonly ForecastPoint[];
  /**
   * What's projected to be left at the end of each day, from today to the
   * month's end, continuing below zero. Today's point already takes off the
   * fixed costs due today or overdue.
   */
  readonly projected: readonly ForecastPoint[];
}

/**
 * What's left to pay of a fixed cost: its amount minus the payments recorded
 * against it, and never less than zero (D-167). Payments of other fixed costs
 * are ignored.
 */
export function unpaidAmount(
  fixedCost: FixedObligation,
  payments: readonly ActualCost[],
): Result<Money, "currency-mismatch" | "out-of-range"> {
  const currency = fixedCost.amount.currency;
  const paid = sumMoney(
    payments
      .filter((payment) => payment.fixedObligationId === fixedCost.id)
      .map((payment) => payment.amount),
    currency,
  );
  if (!paid.ok) return paid;
  const unpaid = subtractMoney(fixedCost.amount, paid.value);
  if (!unpaid.ok) return unpaid;
  return ok(unpaid.value.amountMinor > 0 ? unpaid.value : zeroMoney(currency));
}

/** Forecasts when the month's budget runs out (FR-FORECAST-1–2). */
export function forecastMonth(
  input: ForecastInput,
): Result<Forecast, ForecastError> {
  const valid = validate(input);
  if (!valid.ok) return valid;

  const { budget } = input;
  const currency = budget.currency;
  const lastDay = daysInMonth(input.month);
  const today = dayOf(input.today);

  // Known costs still to come, on the day they're projected.
  const known: { readonly day: number; readonly amount: bigint }[] = [];
  for (const fixedCost of input.fixedCosts) {
    const unpaid = unpaidAmount(fixedCost, input.payments);
    if (!unpaid.ok) return unpaid;
    const dueDay = Math.min(fixedCost.dueDay, lastDay);
    known.push({ day: Math.max(dueDay, today), amount: minor(unpaid.value) });
  }
  const pastCosts: ActualCost[] = [];
  for (const cost of input.actualCosts) {
    const day = dayOf(cost.date);
    if (day > today) known.push({ day, amount: minor(cost.amount) });
    else pastCosts.push(cost);
  }

  const spentBy = (day: number): bigint =>
    total(pastCosts.filter((cost) => dayOf(cost.date) <= day));
  const knownBy = (day: number): bigint =>
    known
      .filter((cost) => cost.day <= day)
      .reduce((sum, cost) => sum + cost.amount, 0n);

  const spent = spentBy(today);
  const remaining = minor(budget) - spent;
  const variable = total(
    pastCosts.filter((cost) => cost.fixedObligationId === null),
  );
  const paceKnown = today >= MIN_PACE_DAYS;
  // Variable spending projected after today, up to and including `day`: the
  // exact average times the days, rounded down to a whole minor unit.
  const paceBy = (day: number): bigint =>
    paceKnown ? (variable * BigInt(day - today)) / BigInt(today) : 0n;

  const actual = days(0, today).map((day) => ({
    day,
    remaining: minor(budget) - spentBy(day),
  }));
  const projected = days(today, lastDay).map((day) => ({
    day,
    remaining: remaining - knownBy(day) - paceBy(day),
  }));
  const upcoming = knownBy(lastDay);
  const end = remaining - upcoming - paceBy(lastDay);
  const runsOut = projected.find((point) => point.remaining <= 0n);

  const amounts = [
    spent,
    remaining,
    upcoming,
    variable,
    end,
    ...actual.map((point) => point.remaining),
    ...projected.map((point) => point.remaining),
  ];
  if (!amounts.every(isSafe)) return err("out-of-range");
  const money = (amount: bigint): Money => toMoney(amount, currency);

  let outcome: ForecastOutcome;
  if (remaining <= 0n) outcome = { kind: "used-up" };
  else if (runsOut) outcome = { kind: "runs-out", day: runsOut.day };
  else if (paceKnown) outcome = { kind: "lasts", remaining: money(end) };
  else outcome = { kind: "not-enough-data" };

  return ok({
    budget,
    spent: money(spent),
    remaining: money(remaining),
    upcoming: money(upcoming),
    pace: paceKnown
      ? {
          kind: "measured",
          days: today,
          spent: money(variable),
          daily: money(roundHalfUp(variable, BigInt(today))),
        }
      : { kind: "not-enough-data", days: today, daysNeeded: MIN_PACE_DAYS },
    outcome,
    actual: actual.map((point) => ({
      day: point.day,
      remaining: money(point.remaining),
    })),
    projected: projected.map((point) => ({
      day: point.day,
      remaining: money(point.remaining),
    })),
  });
}

/** Checks the input against the forecast's assumptions, so nothing is silently left out. */
function validate(input: ForecastInput): Result<true, ForecastError> {
  const { month, budget } = input;
  const inMonth = (date: LocalDate) =>
    parseLocalDate(date).ok && date.startsWith(`${month}-`);
  const amounts = [
    budget,
    ...input.actualCosts.map((cost) => cost.amount),
    ...input.payments.map((cost) => cost.amount),
    ...input.fixedCosts.map((cost) => cost.amount),
  ];

  if (!inMonth(input.today)) return err("outside-month");
  if (amounts.some((amount) => amount.currency !== budget.currency)) {
    return err("currency-mismatch");
  }
  if (amounts.some((amount) => !Number.isSafeInteger(amount.amountMinor))) {
    return err("out-of-range");
  }
  if (amounts.some((amount) => amount.amountMinor <= 0)) {
    return err("not-positive");
  }
  if (
    input.actualCosts.some(
      (cost) => cost.month !== month || !inMonth(cost.date),
    )
  ) {
    return err("outside-month");
  }
  if (input.fixedCosts.some((cost) => cost.month !== month)) {
    return err("outside-month");
  }
  if (
    input.fixedCosts.some(
      (cost) =>
        !Number.isInteger(cost.dueDay) || cost.dueDay < 1 || cost.dueDay > 31,
    )
  ) {
    return err("invalid-due-day");
  }
  return ok(true);
}

const MAX_SAFE = BigInt(Number.MAX_SAFE_INTEGER);

function isSafe(amount: bigint): boolean {
  return amount <= MAX_SAFE && amount >= -MAX_SAFE;
}

/** Money from an exact total that `isSafe` has checked (DATA1). */
function toMoney(amount: bigint, currency: CurrencyCode): Money {
  return { amountMinor: Number(amount), currency };
}

function minor(money: Money): bigint {
  return BigInt(money.amountMinor);
}

function total(costs: readonly ActualCost[]): bigint {
  return costs.reduce((sum, cost) => sum + minor(cost.amount), 0n);
}

/** `numerator / denominator` to the nearest whole number, halves up; both are positive or zero. */
function roundHalfUp(numerator: bigint, denominator: bigint): bigint {
  return (2n * numerator + denominator) / (2n * denominator);
}

/** The day of the month of a "YYYY-MM-DD" date. */
function dayOf(date: LocalDate): number {
  return Number(date.slice(8, 10));
}

/** The whole numbers from `first` to `last`, inclusive. */
function days(first: number, last: number): number[] {
  return Array.from({ length: last - first + 1 }, (_, index) => first + index);
}
