# 2026-10-04 · Phase 1: money

### D-109 · The Money type (autopilot)

- **Decision:** `Money` is `{ amountMinor, currency }`, with safe integers only. Construction and arithmetic return `Result` values (autopilot):
  - mixing currencies is a `currency-mismatch` error;
  - overflow beyond ±(2^53 − 1) is an `out-of-range` error, never a silent precision loss;
  - `-0` is normalized to `0`, so equal amounts compare and serialize equally.
- **Why:** DATA1 and DATA2, and ADR-0006. Overflow in money must be loud. A JavaScript sum past 2^53 rounds quietly.

### D-110 · Exact parsing, printing and display (autopilot)

- **Decision:** (autopilot)
  - **Parsing:** `parseMoney` accepts only a normalized decimal string ("1234.5"). More decimals than the currency allows is an error, never rounding.
  - **Printing:** `toDecimalString` prints with BigInt arithmetic.
  - **Display:** `formatMoney` lets `Intl` format the whole units, then splices in the exact fraction digits, in the locale's own numerals.
- **Why:** The common shortcut, `minor / 100` plus `Intl`, goes through floating point. Splicing is exact at every safe amount, and the test at 2^53 − 1 proves it.
- **Found while testing:** Locales separate symbol and number with a **non-breaking space** (U+00A0), and right-to-left locales add invisible direction marks. Test expectations now spell these out.
- **Lesson:** When output looks right but a comparison fails, check the code points. Locale data is full of invisible characters.

### D-111 · Property-based tests for money (autopilot)

- **Decision:** fast-check checks five rules, 500 generated cases each, across all 155 currencies and the full safe range (autopilot):
  - printing then parsing returns the same amount;
  - addition is commutative;
  - subtraction undoes addition;
  - totals don't depend on order;
  - display formatting keeps every digit and the sign.
- **Why:** Hand-picked examples miss edge cases. Generators include the extremes (0, ±2^53 − 1, 0-digit and 3-digit currencies), and shrink any failure to its smallest counterexample.
