# ADR-0015: Translations with i18next

- **Status:** Accepted
- **Date:** 2026-10-04
- **Decided by:** autopilot (journal D-152)

## Context

All user-facing text, including accessibility labels, goes through translations ([CON7](../engineering-standards.md#2-code-con)). English ships first; Sinhala and Tamil are on the roadmap. The library must work on iOS, Android and the web from one codebase, handle plurals and interpolation, and let TypeScript catch a missing or misspelled key. It's a new dependency category, so it needs an ADR ([ARC4](../engineering-standards.md#3-architecture-arc)).

## Decision

- **i18next with react-i18next.** Components call `t("key")` from `useTranslation()`.
- **Catalogs are JSON files** in `apps/app/src/lib/i18n/locales/`, one per language. English is the source and the fallback.
- **Keys are typed** from the English catalog, so a wrong key fails type checking.
- **The device's preferred languages,** read with `expo-localization`, choose the language, falling back to English.
- **Numbers, money and dates are formatted with `Intl`** by `packages/core`, not by i18next's formatters, so the same rules apply outside React.

## Consequences

- Adding a language means adding a catalog and listing it in `supportedLanguages`. Translators work with plain JSON.
- Plural rules come from `Intl.PluralRules`. Browsers have it, but Hermes, the JavaScript engine on iOS and Android, doesn't, so the first message with plural forms needs a polyfill on mobile.
- About 15 KB (gzipped) is added to the web bundle.

## Alternatives considered

- **Lingui:** compiles messages ahead of time, for a smaller runtime, but needs a compile step and Babel macros, which make contributions harder.
- **i18n-js** (the example in Expo's documentation): small, but no React bindings and weaker plural support.
- **react-intl (FormatJS):** full ICU message syntax, but heavier, and its formatters would duplicate the ones in `packages/core`.
