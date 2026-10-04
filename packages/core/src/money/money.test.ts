import { describe, expect, it } from "vitest";
import {
  addMoney,
  compareMoney,
  type Money,
  moneyFromMinor,
  negateMoney,
  subtractMoney,
  sumMoney,
  zeroMoney,
} from "./money";

const lkr = (amountMinor: number): Money => ({ amountMinor, currency: "LKR" });
const usd = (amountMinor: number): Money => ({ amountMinor, currency: "USD" });
const MAX = Number.MAX_SAFE_INTEGER;

describe("moneyFromMinor", () => {
  it("accepts whole minor units", () => {
    expect(moneyFromMinor(1234, "LKR")).toEqual({ ok: true, value: lkr(1234) });
    expect(moneyFromMinor(-MAX, "LKR")).toEqual({ ok: true, value: lkr(-MAX) });
  });

  it("normalizes negative zero", () => {
    const result = moneyFromMinor(-0, "LKR");
    expect(result.ok && Object.is(result.value.amountMinor, 0)).toBe(true);
  });

  it.each([
    [12.5, "not-an-integer"],
    [Number.NaN, "not-an-integer"],
    [Number.POSITIVE_INFINITY, "out-of-range"],
    [MAX + 1, "out-of-range"],
    [-(MAX + 1), "out-of-range"],
  ])("rejects %s with %s", (input, error) => {
    expect(moneyFromMinor(input, "LKR")).toEqual({ ok: false, error });
  });
});

describe("arithmetic", () => {
  it("adds and subtracts in the same currency", () => {
    expect(addMoney(lkr(150), lkr(-50))).toEqual({ ok: true, value: lkr(100) });
    expect(subtractMoney(lkr(150), lkr(200))).toEqual({
      ok: true,
      value: lkr(-50),
    });
  });

  it("never mixes currencies", () => {
    expect(addMoney(lkr(1), usd(1))).toEqual({
      ok: false,
      error: "currency-mismatch",
    });
    expect(subtractMoney(lkr(1), usd(1))).toEqual({
      ok: false,
      error: "currency-mismatch",
    });
    expect(compareMoney(lkr(1), usd(1))).toEqual({
      ok: false,
      error: "currency-mismatch",
    });
  });

  it("reports overflow instead of losing precision", () => {
    expect(addMoney(lkr(MAX), lkr(1))).toEqual({
      ok: false,
      error: "out-of-range",
    });
    expect(subtractMoney(lkr(-MAX), lkr(1))).toEqual({
      ok: false,
      error: "out-of-range",
    });
  });

  it("negates without producing negative zero", () => {
    expect(negateMoney(lkr(25))).toEqual(lkr(-25));
    expect(Object.is(negateMoney(lkr(0)).amountMinor, 0)).toBe(true);
  });

  it("compares amounts", () => {
    expect(compareMoney(lkr(1), lkr(2))).toEqual({ ok: true, value: -1 });
    expect(compareMoney(lkr(2), lkr(2))).toEqual({ ok: true, value: 0 });
    expect(compareMoney(lkr(3), lkr(2))).toEqual({ ok: true, value: 1 });
  });
});

describe("sumMoney", () => {
  it("totals an empty list as zero", () => {
    expect(sumMoney([], "JPY")).toEqual({ ok: true, value: zeroMoney("JPY") });
  });

  it("totals amounts in one currency", () => {
    expect(sumMoney([lkr(100), lkr(-30), lkr(5)], "LKR")).toEqual({
      ok: true,
      value: lkr(75),
    });
  });

  it("rejects a list containing another currency", () => {
    expect(sumMoney([lkr(100), usd(5)], "LKR")).toEqual({
      ok: false,
      error: "currency-mismatch",
    });
  });

  it("rejects a total beyond the safe range", () => {
    expect(sumMoney([lkr(MAX), lkr(MAX)], "LKR")).toEqual({
      ok: false,
      error: "out-of-range",
    });
  });
});
