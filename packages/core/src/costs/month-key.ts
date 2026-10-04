/**
 * Parsing and validation for month keys (FR-PLAN-1, DATA3).
 *
 * A `MonthKey` is a "YYYY-MM" string identifying a calendar month.
 * It is time-zone-independent: the ledger's time zone decides which
 * month a `LocalDate` falls in; this module only validates the format.
 */

import { type Result, err, ok } from "../result";
import type { MonthKey } from "./types";

const FORMAT = /^(?<year>\d{4})-(?<month>\d{2})$/;

/**
 * Parse and validate an untrusted string as a MonthKey.
 *
 * Rejects months outside 01–12 and years below 1.
 */
export function parseMonthKey(
  value: string,
): Result<MonthKey, "invalid-month"> {
  const groups = FORMAT.exec(value)?.groups;
  if (!groups) return err("invalid-month");

  const year = Number(groups["year"]);
  const month = Number(groups["month"]);

  if (year < 1 || month < 1 || month > 12) {
    return err("invalid-month");
  }

  return ok(value as MonthKey);
}

/** Build a MonthKey from a numeric year and month (1–12). */
export function monthKeyFrom(
  year: number,
  month: number,
): Result<MonthKey, "invalid-month"> {
  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    year < 1 ||
    month < 1 ||
    month > 12
  ) {
    return err("invalid-month");
  }
  const key = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}`;
  return ok(key as MonthKey);
}

/** The number of calendar days in the month. */
export function daysInMonth(monthKey: MonthKey): number {
  const year = Number(monthKey.slice(0, 4));
  const month = Number(monthKey.slice(5, 7));
  if (month === 2) return isLeapYear(year) ? 29 : 28;
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}
