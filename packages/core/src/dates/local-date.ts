import { type Result, err, ok } from "../result";

/**
 * A calendar date with no time and no time zone, "YYYY-MM-DD" (DATA3).
 *
 * A transaction happens on a date in the ledger's time zone. Storing that
 * date, not an instant, means it never shifts when someone views it from
 * another time zone. Strings in this format sort chronologically.
 */
export type LocalDate = string & { readonly __brand: "LocalDate" };

const FORMAT = /^(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})$/;

/** Parse untrusted input into a real calendar date, so "2026-02-30" is rejected. */
export function parseLocalDate(
  value: string,
): Result<LocalDate, "invalid-date"> {
  const groups = FORMAT.exec(value)?.groups;
  if (!groups) return err("invalid-date");
  const year = Number(groups["year"]);
  const month = Number(groups["month"]);
  const day = Number(groups["day"]);
  if (
    year < 1 ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > daysInMonth(year, month)
  ) {
    return err("invalid-date");
  }
  return ok(value as LocalDate);
}

/**
 * The calendar date in `timeZone` at instant `now` (Unix milliseconds).
 *
 * For example, 2026-10-04T18:30:00Z is already 2026-10-05 in Asia/Colombo
 * (UTC+05:30). Throws a `RangeError` for an unknown time zone (CON5).
 */
export function localDateIn(
  timeZone: string,
  now: number = Date.now(),
): LocalDate {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year").padStart(4, "0")}-${value("month")}-${value("day")}` as LocalDate;
}

/** Whether `timeZone` is an IANA zone name this platform recognizes, such as "Asia/Colombo". */
export function isValidTimeZone(timeZone: string): boolean {
  if (timeZone === "") return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
}

function daysInMonth(year: number, month: number): number {
  if (month === 2) return isLeapYear(year) ? 29 : 28;
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}
