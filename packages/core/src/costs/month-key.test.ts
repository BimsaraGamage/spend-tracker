import { describe, expect, it } from "vitest";
import { daysInMonth, monthKeyFrom, parseMonthKey } from "./month-key";

describe("parseMonthKey", () => {
  it.each([["2026-01"], ["2026-10"], ["2026-12"], ["0001-01"], ["9999-12"]])(
    "accepts valid month %s",
    (input) => {
      const result = parseMonthKey(input);
      expect(result).toEqual({ ok: true, value: input });
    },
  );

  it.each([
    ["2026-00", "month 0"],
    ["2026-13", "month 13"],
    ["2026-1", "single-digit month"],
    ["2026", "no month"],
    ["26-01", "two-digit year"],
    ["", "empty"],
    ["not-a-month", "words"],
    ["2026-01-01", "date instead of month"],
    ["0000-01", "year 0"],
  ])("rejects %s (%s)", (input) => {
    expect(parseMonthKey(input)).toEqual({ ok: false, error: "invalid-month" });
  });
});

describe("monthKeyFrom", () => {
  it("builds a MonthKey from numeric year and month", () => {
    expect(monthKeyFrom(2026, 10)).toEqual({ ok: true, value: "2026-10" });
    expect(monthKeyFrom(2026, 1)).toEqual({ ok: true, value: "2026-01" });
    expect(monthKeyFrom(1, 1)).toEqual({ ok: true, value: "0001-01" });
  });

  it.each([
    [2026, 0, "month 0"],
    [2026, 13, "month 13"],
    [0, 1, "year 0"],
    [2026, 1.5, "fractional month"],
    [2026.5, 1, "fractional year"],
  ])("rejects year=%s month=%s (%s)", (year, month) => {
    expect(monthKeyFrom(year, month)).toEqual({
      ok: false,
      error: "invalid-month",
    });
  });
});

describe("daysInMonth", () => {
  it.each([
    ["2026-01", 31],
    ["2026-02", 28],
    ["2024-02", 29, "leap year"],
    ["2000-02", 29, "century leap year"],
    ["1900-02", 28, "century non-leap"],
    ["2026-04", 30],
    ["2026-06", 30],
    ["2026-09", 30],
    ["2026-11", 30],
    ["2026-12", 31],
  ] as [string, number, string?][])("returns %i for %s", (month, expected) => {
    const parsed = parseMonthKey(month);
    if (!parsed.ok) throw new Error(`Bad test fixture: ${month}`);
    expect(daysInMonth(parsed.value)).toBe(expected);
  });
});
