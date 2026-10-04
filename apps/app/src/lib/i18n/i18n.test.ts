import { describe, expect, test } from "@jest/globals";

import { i18n, preferredLanguage } from "./index";

describe("preferredLanguage", () => {
  test("picks the first of the device's languages that has a catalog", () => {
    expect(
      preferredLanguage([{ languageCode: "si" }, { languageCode: "en" }]),
    ).toBe("en");
  });

  test("falls back to English when none has a catalog", () => {
    expect(
      preferredLanguage([{ languageCode: "ta" }, { languageCode: null }]),
    ).toBe("en");
    expect(preferredLanguage([])).toBe("en");
  });
});

describe("i18n", () => {
  test("is ready before the first render", () => {
    expect(i18n.isInitialized).toBe(true);
    expect(i18n.t("home.title")).toBe("Spend Tracker");
  });
});
