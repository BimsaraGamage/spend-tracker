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

### D-155 · Accept two unfixed advisories in build tools (autopilot)

- **Finding:** Dependency review failed on the scaffold, on two high-severity advisories that have no fixed version yet:
  - [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) (published 2026-09-18): in `braces` 3.0.3, deeply nested patterns can exhaust the stack. Expo's Metro and Jest reach it through micromatch.
  - [GHSA-86w9-cpqp-85rv](https://github.com/advisories/GHSA-86w9-cpqp-85rv) (published 2026-09-03): `node-forge` 1.4.0 accepts some malformed RSA signatures. Only the Expo CLI uses it.
- **Options:**
  - ★ Accept these two advisories in dependency review, with the reasons on record, until fixes are released.
  - Hold the app until both packages are fixed.
  - Replace them with forks.
- **Decision:** Accept them (autopilot). They're listed in `allow-ghsas`, and in a new "Accepted advisories" table in `docs/operations/dependency-updates.md`.
- **Why:** Neither is part of the app.
  - `braces` only matches glob patterns from the project's own configuration, during builds and tests, never user input. A denial of service on a developer's own build is a low risk.
  - `node-forge` is used by the Expo CLI on a developer's machine, to read local iOS signing certificates and to sign development manifests. Production builds don't use it.
  - Holding the app would stop all app work for an unknown time.
- **Follow-up:** Remove each exception when its package releases a fix. Dependabot alerts will show it.

### D-157 · Allow the Unicode data license and public-domain dedications (autopilot)

- **Finding:** With the advisories accepted, dependency review failed on licenses. GitHub's license scanner reports four build-time packages under licenses outside the allow list: Babel's Unicode tables (`unicode-match-property-value-ecmascript`, `unicode-property-aliases-ecmascript`) and `xmlbuilder` as "Unicode AND MIT", and `big-integer` as "public domain AND Unlicense".
- **Decision:** Add the Unicode data license (`Unicode-3.0`, `Unicode-DFS-2016`, and the scanner's `LicenseRef-scancode-unicode`) and public-domain dedications (`LicenseRef-scancode-public-domain`) to the allow list (autopilot).
- **Why:** Both are permissive and compatible with distributing the app under Apache-2.0, like CC0 and the Unlicense, which were already allowed. The rule against copyleft and source-available licenses is unchanged.
