import { describe, expect, it } from "vitest";
import { formatMoney } from "./format";

describe("formatMoney", () => {
  it.each([
    [1234, "USD", "en-US", "$12.34"],
    [-5, "USD", "en-US", "-$0.05"],
    [0, "USD", "en-US", "$0.00"],
    [123456, "LKR", "si-LK", "රු.\u00a01,234.56"],
    [1234, "JPY", "ja-JP", "￥1,234"],
    [-123456, "EUR", "de-DE", "-1.234,56\u00a0€"],
    [1234567, "KWD", "en-US", "KWD\u00a01,234.567"],
  ] as const)(
    "formats %s %s in %s as %j",
    (amountMinor, currency, locale, expected) => {
      expect(formatMoney({ amountMinor, currency }, locale)).toBe(expected);
    },
  );

  it("is exact at the largest safe amount, where a float division would round", () => {
    expect(
      formatMoney(
        { amountMinor: Number.MAX_SAFE_INTEGER, currency: "USD" },
        "en-US",
      ),
    ).toBe("$90,071,992,547,409.91");
  });

  it("writes the fraction in the locale's own digits", () => {
    const formatted = formatMoney(
      { amountMinor: 123456, currency: "EGP" },
      "ar-EG",
    );
    expect(formatted).toContain("٥٦");
    expect(formatted).not.toMatch(/[0-9]/);
  });

  it("reuses formatters across calls", () => {
    const first = formatMoney({ amountMinor: 100, currency: "LKR" }, "en-LK");
    expect(formatMoney({ amountMinor: 100, currency: "LKR" }, "en-LK")).toBe(
      first,
    );
  });

  it("throws for an invalid locale tag", () => {
    expect(() =>
      formatMoney({ amountMinor: 1, currency: "USD" }, "not a locale!"),
    ).toThrow(RangeError);
  });
});
