import { type Result, err, ok } from "../result";
import type { CurrencyCode } from "./currency";

/**
 * An exact amount of money: a whole number of minor units in one currency
 * (DATA1). An `amountMinor` of 1234 is Rs 12.34 in LKR, and ¥1,234 in JPY.
 *
 * Amounts are always safe integers (within ±(2^53 − 1)), and never `-0`.
 */
export interface Money {
  readonly amountMinor: number;
  readonly currency: CurrencyCode;
}

/** Create money from a whole number of minor units. */
export function moneyFromMinor(
  amountMinor: number,
  currency: CurrencyCode,
): Result<Money, "not-an-integer" | "out-of-range"> {
  if (Number.isNaN(amountMinor)) return err("not-an-integer");
  if (!Number.isFinite(amountMinor)) return err("out-of-range");
  if (!Number.isInteger(amountMinor)) return err("not-an-integer");
  if (!Number.isSafeInteger(amountMinor)) return err("out-of-range");
  return ok(make(amountMinor, currency));
}

/** Zero in the given currency. */
export function zeroMoney(currency: CurrencyCode): Money {
  return make(0, currency);
}

/** `a + b`. Both amounts must share a currency, and the result must stay a safe integer. */
export function addMoney(
  a: Money,
  b: Money,
): Result<Money, "currency-mismatch" | "out-of-range"> {
  if (a.currency !== b.currency) return err("currency-mismatch");
  return checked(a.amountMinor + b.amountMinor, a.currency);
}

/** `a − b`. Both amounts must share a currency, and the result must stay a safe integer. */
export function subtractMoney(
  a: Money,
  b: Money,
): Result<Money, "currency-mismatch" | "out-of-range"> {
  if (a.currency !== b.currency) return err("currency-mismatch");
  return checked(a.amountMinor - b.amountMinor, a.currency);
}

/** The same amount with the opposite sign. */
export function negateMoney(money: Money): Money {
  return make(-money.amountMinor, money.currency);
}

/** The total of `amounts`, all of which must be in `currency`. An empty list totals zero. */
export function sumMoney(
  amounts: readonly Money[],
  currency: CurrencyCode,
): Result<Money, "currency-mismatch" | "out-of-range"> {
  let total = zeroMoney(currency);
  for (const amount of amounts) {
    const next = addMoney(total, amount);
    if (!next.ok) return next;
    total = next.value;
  }
  return ok(total);
}

/** −1, 0 or 1 as `a` is less than, equal to or greater than `b`. */
export function compareMoney(
  a: Money,
  b: Money,
): Result<-1 | 0 | 1, "currency-mismatch"> {
  if (a.currency !== b.currency) return err("currency-mismatch");
  return ok(
    a.amountMinor < b.amountMinor ? -1 : a.amountMinor > b.amountMinor ? 1 : 0,
  );
}

function checked(
  amountMinor: number,
  currency: CurrencyCode,
): Result<Money, "out-of-range"> {
  return Number.isSafeInteger(amountMinor)
    ? ok(make(amountMinor, currency))
    : err("out-of-range");
}

// `x || 0` turns -0 into 0, so equal amounts always compare and serialize equally.
function make(amountMinor: number, currency: CurrencyCode): Money {
  return { amountMinor: amountMinor || 0, currency };
}
