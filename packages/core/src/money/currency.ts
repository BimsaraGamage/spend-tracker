import { type Result, err, ok } from "../result";
import { ISO4217_MINOR_UNITS } from "./iso4217.generated";

/** An active ISO 4217 currency code, such as `"LKR"` or `"USD"`. */
export type CurrencyCode = keyof typeof ISO4217_MINOR_UNITS;

/** Every supported currency code, in alphabetical order. */
export const CURRENCY_CODES = Object.keys(
  ISO4217_MINOR_UNITS,
) as readonly CurrencyCode[];

/** Whether `value` is a supported ISO 4217 code. Matching is exact: `"usd"` is not a code. */
export function isCurrencyCode(value: string): value is CurrencyCode {
  return Object.hasOwn(ISO4217_MINOR_UNITS, value);
}

/** Parse untrusted input into a currency code, without guessing or normalizing. */
export function parseCurrencyCode(
  value: string,
): Result<CurrencyCode, "unknown-currency"> {
  return isCurrencyCode(value) ? ok(value) : err("unknown-currency");
}

/**
 * How many minor-unit digits a currency has, per ISO 4217.
 * For example, 2 for LKR (cents), 0 for JPY and 3 for KWD.
 */
export function minorUnitDigits(currency: CurrencyCode): number {
  return ISO4217_MINOR_UNITS[currency];
}
