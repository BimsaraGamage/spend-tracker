import { minorUnitDigits } from "./currency";
import { splitMinor } from "./decimal";
import type { Money } from "./money";

// Formatter construction is relatively expensive, and lists render many amounts,
// so formatters are reused. The caches are bounded by the number of locales and
// currencies the app actually uses.
const currencyFormatters = new Map<string, Intl.NumberFormat>();
const localeDigits = new Map<string, readonly string[]>();

/**
 * Format money for display in `locale`, with the currency's symbol, grouping
 * and exact minor-unit digits, for example "රු. 1,234.56" for 123456 LKR in "si-LK".
 *
 * Exact for every safe-integer amount: the whole units are formatted by
 * `Intl`, and the fraction digits are spliced in from integer arithmetic,
 * never from a floating-point division. Throws a `RangeError` for an invalid
 * locale tag, which is a programmer error (CON5).
 */
export function formatMoney(money: Money, locale: string): string {
  const digits = minorUnitDigits(money.currency);
  const { negative, major, fraction } = splitMinor(money.amountMinor, digits);
  const formatter = currencyFormatter(locale, money.currency, digits);

  // `major` is at most MAX_SAFE_INTEGER / 10^digits, so it is exact as a number.
  // Formatting -0 keeps the minus sign, which amounts like -0.05 need.
  const wholeUnits = Number(major);
  const parts = formatter.formatToParts(negative ? -wholeUnits : wholeUnits);

  const nativeDigits = digitsFor(locale);
  const localizedFraction = Array.from(
    fraction,
    (digit) => nativeDigits[Number(digit)] ?? digit,
  ).join("");
  return parts
    .map((part) => (part.type === "fraction" ? localizedFraction : part.value))
    .join("");
}

function currencyFormatter(
  locale: string,
  currency: string,
  digits: number,
): Intl.NumberFormat {
  const key = `${locale}|${currency}`;
  let formatter = currencyFormatters.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    });
    currencyFormatters.set(key, formatter);
  }
  return formatter;
}

/** The locale's own digits 0–9, for example "٠" to "٩" in "ar-EG". */
function digitsFor(locale: string): readonly string[] {
  let digits = localeDigits.get(locale);
  if (!digits) {
    const formatter = new Intl.NumberFormat(locale, { useGrouping: false });
    digits = Array.from({ length: 10 }, (_, digit) => formatter.format(digit));
    localeDigits.set(locale, digits);
  }
  return digits;
}
