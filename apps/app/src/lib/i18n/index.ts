/**
 * Translations (CON7, ADR-0014). Every piece of user-facing text, including
 * accessibility labels, comes from a catalog in ./locales through `t()`.
 * Numbers, money and dates are formatted with `Intl` in packages/core.
 */
import { getLocales } from "expo-localization";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "./locales/en.json";

/** Languages with a complete catalog. English is the fallback for the rest. */
export const supportedLanguages = ["en"] as const;

export const resources = { en: { translation: en } } as const;

/** The first of the device's preferred languages that the app supports. */
export function preferredLanguage(
  locales: readonly { languageCode: string | null }[] = getLocales(),
): (typeof supportedLanguages)[number] {
  for (const { languageCode } of locales) {
    const supported = supportedLanguages.find(
      (language) => language === languageCode,
    );
    if (supported !== undefined) {
      return supported;
    }
  }
  return "en";
}

// Synchronous, so the first render already has its text.
void i18n.use(initReactI18next).init({
  resources,
  lng: preferredLanguage(),
  fallbackLng: "en",
  initAsync: false,
  // React escapes rendered text already.
  interpolation: { escapeValue: false },
});

export { i18n };
