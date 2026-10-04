// Property-based tests: rules that must hold for every amount and currency.
// fast-check generates the inputs, including extreme values, and shrinks any
// failure to the smallest counterexample.
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { CURRENCY_CODES } from "./currency";
import { parseMoney, toDecimalString } from "./decimal";
import { formatMoney } from "./format";
import { addMoney, type Money, subtractMoney, sumMoney } from "./money";

const currency = fc.constantFrom(...CURRENCY_CODES);
const anyMoney = fc.record({ amountMinor: fc.maxSafeInteger(), currency });
// Bounded so that sums of two or of a few dozen amounts can't overflow.
const bounded = fc.integer({ min: -(2 ** 51), max: 2 ** 51 });
const RUNS = { numRuns: 500 };

describe("money properties", () => {
  it("printing then parsing returns the same amount", () => {
    fc.assert(
      fc.property(anyMoney, (money) => {
        expect(parseMoney(toDecimalString(money), money.currency)).toEqual({
          ok: true,
          value: money,
        });
      }),
      RUNS,
    );
  });

  it("addition is commutative", () => {
    fc.assert(
      fc.property(bounded, bounded, currency, (x, y, code) => {
        const a: Money = { amountMinor: x, currency: code };
        const b: Money = { amountMinor: y, currency: code };
        expect(addMoney(a, b)).toEqual(addMoney(b, a));
      }),
      RUNS,
    );
  });

  it("subtraction undoes addition", () => {
    fc.assert(
      fc.property(bounded, bounded, currency, (x, y, code) => {
        const a: Money = { amountMinor: x, currency: code };
        const b: Money = { amountMinor: y, currency: code };
        const total = addMoney(a, b);
        expect(total.ok && subtractMoney(total.value, b)).toEqual({
          ok: true,
          value: a,
        });
      }),
      RUNS,
    );
  });

  it("totals don't depend on order", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: -1e12, max: 1e12 }), { maxLength: 50 }),
        currency,
        (amounts, code) => {
          const items = amounts.map((amountMinor): Money => ({
            amountMinor,
            currency: code,
          }));
          expect(sumMoney(items, code)).toEqual(
            sumMoney([...items].reverse(), code),
          );
        },
      ),
      RUNS,
    );
  });

  it("display formatting keeps every digit and the sign (en-US)", () => {
    fc.assert(
      fc.property(anyMoney, (money) => {
        const formatted = formatMoney(money, "en-US");
        expect(Number(formatted.replace(/\D/g, ""))).toBe(
          Math.abs(money.amountMinor),
        );
        expect(formatted.startsWith("-")).toBe(money.amountMinor < 0);
      }),
      RUNS,
    );
  });
});
