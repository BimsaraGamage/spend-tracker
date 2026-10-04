# ADR-0003: One Expo codebase for iOS, Android and web

- **Status:** Accepted
- **Date:** 2026-10-04
- **Decided by:** maintainer (journal D-05, D-08)

## Context

The app must run on phones and in browsers now, and in the app stores later. The maintainer works on Linux, so iOS builds can't run locally.

## Decision

- **Codebase:** one Expo app (React Native, TypeScript, Expo Router) for iOS, Android and web.
- **Builds and updates:** EAS. Its cloud builds iOS from Linux, and EAS Update ships over-the-air updates.
- **Phase 1 web build:** an installable PWA. iPhone testing uses it until Apple enrolment.

## Consequences

- One UI codebase and truly native mobile screens.
- The web build depends on PowerSync's React Native Web support, which is in beta.
  - **Fallback:** a separate Vite web app on PowerSync's GA web SDK, reusing `packages/core` and `packages/data`.
  - That fallback stays cheap only if features talk to the data layer through `packages/data` ([ARC5](../engineering-standards.md#3-architecture-arc)).
- Native modules (encrypted SQLite) need development builds; Expo Go isn't enough.

## Alternatives considered

- **PWA now, Capacitor later:** GA web sync, but a WebView UI on mobile.
- **Separate web and native apps:** GA sync everywhere, but every screen is built twice.
- **Flutter:** a new language, and its web support is in beta too.
