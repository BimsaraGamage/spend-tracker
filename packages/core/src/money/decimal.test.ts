import { describe, expect, it } from "vitest";
import { parseMoney, splitMinor, toDecimalString } from "./decimal";

const MAX = Number.MAX_SAFE_INTEGER;

describe("splitMinor", () => {
  it("splits exactly with zero-padded fractions", () => {
    expect(splitMinor(-5, 2)).toEqual({
      negative: true,
      major: 0n,
      fraction: "05",
    });
    expect(splitMinor(1234, 0)).toEqual({
      negative: false,
      major: 1234n,
      fraction: "",
    });
    expect(splitMinor(MAX, 2)).toEqual({
      negative: false,
      major: 90071992547409n,
      fraction: "91",
    });
  });
});

describe("toDecimalString", () => {
  it.each([
    [1234, "LKR", "12.34"],
    [-5, "LKR", "-0.05"],
    [0, "LKR", "0.00"],
    [1234, "JPY", "1234"],
    [1, "KWD", "0.001"],
    [MAX, "USD", "90071992547409.91"],
  ] as const)("prints %s %s as %s", (amountMinor, currency, expected) => {
    expect(toDecimalString({ amountMinor, currency })).toBe(expected);
  });
});

describe("parseMoney", () => {
  it.each([
    ["12.34", "LKR", 1234],
    ["12.3", "LKR", 1230],
    ["12", "LKR", 1200],
    ["-0.05", "LKR", -5],
    ["0012.00", "LKR", 1200],
    ["12", "JPY", 12],
    ["1.234", "KWD", 1234],
    ["90071992547409.91", "USD", MAX],
  ] as const)(
    "parses %s %s as %s minor units",
    (input, currency, amountMinor) => {
      expect(parseMoney(input, currency)).toEqual({
        ok: true,
        value: { amountMinor, currency },
      });
    },
  );

  it("never returns negative zero", () => {
    const result = parseMoney("-0.00", "LKR");
    expect(result.ok && Object.is(result.value.amountMinor, 0)).toBe(true);
  });

  it.each([
    "",
    "abc",
    "1,234.00",
    "+1",
    "1e3",
    " 1",
    "1 ",
    ".5",
    "1.",
    "--1",
    "1.2.3",
  ])("rejects the malformed input %j", (input) => {
    expect(parseMoney(input, "LKR")).toEqual({
      ok: false,
      error: "invalid-format",
    });
  });

  it("rejects more decimals than the currency has, without rounding", () => {
    expect(parseMoney("12.345", "LKR")).toEqual({
      ok: false,
      error: "too-many-decimals",
    });
    expect(parseMoney("12.0", "JPY")).toEqual({
      ok: false,
      error: "too-many-decimals",
    });
  });

  it("rejects amounts beyond the safe range", () => {
    expect(parseMoney("90071992547409.92", "USD")).toEqual({
      ok: false,
      error: "out-of-range",
    });
    expect(parseMoney("99999999999999999999", "JPY")).toEqual({
      ok: false,
      error: "out-of-range",
    });
  });
});
