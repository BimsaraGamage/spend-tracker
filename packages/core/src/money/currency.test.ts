import { describe, expect, it } from "vitest";
import {
  CURRENCY_CODES,
  isCurrencyCode,
  minorUnitDigits,
  parseCurrencyCode,
} from "./currency";

describe("minorUnitDigits", () => {
  it.each([
    ["LKR", 2],
    ["USD", 2],
    ["EUR", 2],
    ["JPY", 0],
    ["CLP", 0],
    ["ISK", 0],
    ["KWD", 3],
    ["BHD", 3],
  ] as const)("returns the ISO 4217 minor units for %s", (code, digits) => {
    expect(minorUnitDigits(code)).toBe(digits);
  });
});

describe("parseCurrencyCode", () => {
  it("accepts an active code", () => {
    expect(parseCurrencyCode("LKR")).toEqual({ ok: true, value: "LKR" });
  });

  it.each([
    ["lowercase", "usd"],
    ["unknown", "ABC"],
    ["precious metal without minor units", "XAU"],
    ["testing code", "XTS"],
    ["fund", "CLF"],
    ["empty", ""],
    ["prototype key", "toString"],
  ])("rejects a %s code", (_label, input) => {
    expect(parseCurrencyCode(input)).toEqual({
      ok: false,
      error: "unknown-currency",
    });
    expect(isCurrencyCode(input)).toBe(false);
  });
});

describe("CURRENCY_CODES", () => {
  it("lists only three-letter uppercase codes with 0 to 3 minor digits", () => {
    expect(CURRENCY_CODES.length).toBeGreaterThan(100);
    for (const code of CURRENCY_CODES) {
      expect(code).toMatch(/^[A-Z]{3}$/);
      expect([0, 2, 3]).toContain(minorUnitDigits(code));
    }
  });
});
