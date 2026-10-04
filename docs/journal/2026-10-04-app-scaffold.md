# 2026-10-04 · Phase 1: the Expo app's scaffold

### D-148 · A hand-written app that mirrors Expo's SDK 57 template (autopilot)

- **Options:**
  - ★ Write the app by hand: the template's configuration (typed routes, the React Compiler, routes in `src/app`), with none of its demo screens and assets.
  - Generate it with `create-expo-app` and delete the demo.
  - The blank template, which has no router.
- **Decision:** The first option (autopilot). `apps/app` is `@spend-tracker/app`: Expo SDK 57, React Native 0.86, React 19.2, Expo Router, strict TypeScript from `packages/config`, and the React Hooks lint rules.
- **Why:** Every file in the scaffold is one we chose and can explain. Nothing has to be deleted later.

### D-149 · Routes re-export feature screens (autopilot)

- **Decision:** Screens live in `src/features/<feature>/` with their tests (ARC2). The files in `src/app` only re-export them, as the router requires (autopilot).
- **Why:** Expo Router treats every file in `src/app` as a route, so tests can't sit next to the code they test there. Features stay free of routing details.

### D-150 · The web build is a single-page app (autopilot)

- **Options:** ★ Expo's "single" web output (one `index.html`), or "static", which renders every page at build time.
- **Decision:** "single" (autopilot).
- **Why:** The data lives in a database inside the browser, so pages rendered at build time would be empty shells anyway. Cloudflare serves single-page apps with a fallback to `index.html`. Rendering at build time would also run browser-only database code in Node.
- **Baseline for the bundle budget (PERF3):** the empty app's JavaScript is 1.2 MB, or 312 KB gzipped. Most of it is React Native for Web and the router.

### D-151 · Pin the native modules that SDK 57 expects (autopilot)

- **Finding:** On the first install, pnpm filled the router's optional peers with their newest versions: Reanimated 4.7, Gesture Handler 3.3 and Worklets 0.13. SDK 57 expects Reanimated 4.5.1, Gesture Handler 2.32 and Worklets 0.10.1. Mismatched native modules break native builds, and nothing complained until `pnpm peers check`.
- **Decision:** The app pins the versions SDK 57 expects, as Expo's own template does, and CI runs `expo install --check` on every pull request (autopilot). Test-only packages were pinned the same way: `test-renderer` 1.2.0 matches React 19.2, and `@react-native/metro-config` matches React Native 0.86.
- **Lesson:** A package manager fills gaps with the newest versions it's allowed. In a React Native app, "newest" and "compatible" differ, so pin what the SDK specifies and check it in CI.

### D-152 · Translations with i18next (autopilot)

- **Options:** ★ i18next with react-i18next; Lingui; i18n-js; react-intl.
- **Decision:** i18next with react-i18next, with keys typed from the English catalog, and the device's languages read with `expo-localization` (autopilot). Recorded as [ADR-0015](../adr/0015-translations-with-i18next.md), because translations are a new dependency category (ARC4).
- **Why:** Stable and widely used on React Native and the web, no compile step for contributors, and plurals and interpolation built in.
- **Found while choosing:** Hermes, the JavaScript engine on iOS and Android, doesn't ship `Intl.PluralRules`, so the first message with plural forms needs a polyfill on mobile. Hermes does support `formatToParts`, which `formatMoney` in `packages/core` relies on; check money formatting on a device when the ledger screens arrive.

### D-153 · Component tests with jest-expo and React Native Testing Library (autopilot)

- **Decision:** jest-expo 57 with Jest 29, and React Native Testing Library 14 (autopilot).
  - Tests import Jest's functions from `@jest/globals` instead of adding global types to the whole app.
  - Jest's ignore pattern lets it transform React Native and Expo packages inside pnpm's `.pnpm` folder.
- **Why:** jest-expo is Expo's supported way to test components; Vitest doesn't run React Native code without heavy configuration. Jest 29, not 30, because jest-expo 57 is built on it.

### D-154 · CI builds the web app and checks it against the Expo SDK (autopilot)

- **Decision** (autopilot):
  - the main CI job now also runs `build`, which exports the web app, and `expo install --check`;
  - the sync job installs only the packages its tests use;
  - Turborepo passes `CI`, `DO_NOT_TRACK` and `EXPO_NO_TELEMETRY` through to tasks.
- **Why:** Turborepo's strict mode hides undeclared environment variables from tasks, so Expo would have run without the telemetry opt-out. Passing them through doesn't affect the cache.

### D-155 · Accept the unfixed `braces` advisory (autopilot)

- **Finding:** Dependency review failed on the scaffold: `braces` 3.0.3 has a high-severity advisory, [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm), published 2026-09-18. Deeply nested patterns can exhaust the stack. No fixed version exists yet. Expo's Metro and Jest reach it through micromatch.
- **Options:**
  - ★ Accept this one advisory in dependency review, with the reasons on record, until a fix is released.
  - Hold the app until `braces` is fixed.
  - Replace `braces` with a fork.
- **Decision:** Accept it (autopilot). It's listed in `allow-ghsas`, and in a new "Accepted advisories" table in `docs/operations/dependency-updates.md`.
- **Why:** Only build and test tools use it, on glob patterns from the project's own configuration, never on user input, and it isn't part of the app. A denial of service on a developer's own build is a low risk. Holding the app would stop all app work for an unknown time.
- **Follow-up:** Remove the exception when `braces` releases a fix. Dependabot alerts will show it.
