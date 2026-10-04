import { type Result, err, ok } from "../result";
import { type CurrencyCode, minorUnitDigits } from "./currency";
import type { Money } from "./money";

/** The parts of an amount, split exactly with integer arithmetic (no floating point). */
export interface SplitAmount {
  readonly negative: boolean;
  /** Whole units, for example rupees. */
  readonly major: bigint;
  /** Minor units, zero-padded to the currency's digits, for example "05". Empty for 0-digit currencies. */
  readonly fraction: string;
}

/** Split minor units into sign, whole units and fraction digits. */
export function splitMinor(amountMinor: number, digits: number): SplitAmount {
  const magnitude = BigInt(Math.abs(amountMinor));
  const scale = 10n ** BigInt(digits);
  return {
    negative: amountMinor < 0,
    major: magnitude / scale,
    fraction:
      digits === 0 ? "" : (magnitude % scale).toString().padStart(digits, "0"),
  };
}

/**
 * A plain decimal string with a "." separator and no grouping, for example
 * "-1234.56" for -123456 LKR. Used for storage, export and form values,
 * never for display (see `formatMoney`).
 */
export function toDecimalString(money: Money): string {
  const { negative, major, fraction } = splitMinor(
    money.amountMinor,
    minorUnitDigits(money.currency),
  );
  return `${negative ? "-" : ""}${major.toString()}${fraction === "" ? "" : `.${fraction}`}`;
}

const DECIMAL = /^(?<sign>-)?(?<whole>\d+)(?:\.(?<fraction>\d+))?$/;

/**
 * Parse a plain decimal string ("1234.5", "-0.05") into money.
 *
 * The input must already be normalized: a "." separator, no grouping, no
 * spaces, no "+" and no exponent. The UI converts locale input first. More
 * decimals than the currency allows is an error, never silently rounded (DATA1).
 */
export function parseMoney(
  input: string,
  currency: CurrencyCode,
): Result<Money, "invalid-format" | "too-many-decimals" | "out-of-range"> {
  const groups = DECIMAL.exec(input)?.groups;
  if (!groups) return err("invalid-format");
  const whole = groups["whole"] ?? "0";
  const fraction = groups["fraction"] ?? "";
  const digits = minorUnitDigits(currency);
  if (fraction.length > digits) return err("too-many-decimals");

  const magnitude =
    BigInt(whole) * 10n ** BigInt(digits) +
    BigInt(fraction.padEnd(digits, "0") || "0");
  if (magnitude > BigInt(Number.MAX_SAFE_INTEGER)) return err("out-of-range");

  const amount = Number(magnitude);
  return ok({
    amountMinor: groups["sign"] && amount !== 0 ? -amount : amount,
    currency,
  });
}
