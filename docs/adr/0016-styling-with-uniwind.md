# ADR-0016: Styling with Uniwind and React Native Reusables

- **Status:** Accepted
- **Date:** 2026-10-06
- **Decided by:** the maintainer (journal D-188)

## Context

Every screen needs a shared look: spacing, typography, and light and dark themes, on iOS, Android and the web from one codebase ([ADR-0003](0003-expo-universal-client.md)). The plan chose Tailwind CSS with React Native Reusables, and left open which Tailwind runtime to use, "whichever is stable for the SDK". A UI kit is a new dependency category, so it needs an ADR ([ARC4](../engineering-standards.md#3-architecture-arc)). Switching later means touching every screen.

In October 2026, for Expo SDK 57 and React Native 0.86:

- **Uniwind** 1.12 supports Tailwind CSS 4, with stable releases about monthly.
- **NativeWind** 4.2 is stable, but on Tailwind CSS 3. NativeWind 5, for Tailwind CSS 4, is still a release candidate.

## Decision

- **Uniwind with Tailwind CSS 4.** Components style themselves with `className`. Uniwind compiles the classes at build time through Metro (`apps/app/metro.config.mjs`), and needs no Babel plugin.
- **Design tokens in one file,** `apps/app/src/global.css`: colors for the light and dark themes, and corner radii. Components use token names such as `bg-background` or `text-muted-foreground`, never raw colors. The theme follows the device's setting.
- **React Native Reusables components, copied into the app** (`apps/app/src/components/ui`), as that project intends. They stay close to the original, so updates can be compared, and are credited in `NOTICE` (MIT License). The first ones are `Text` and `Button`. Others are added as screens need them.
- **Navigation colors come from the same tokens** (`useNavigationTheme`), so screens and the space behind them always match.

## Consequences

- Styling looks the same as on the web, and Tailwind's documentation applies.
- Jest doesn't run Metro, so component tests check behaviour and accessibility, not styles. The web build in CI compiles the styles. Native rendering is only checked by device builds, which come with the Android end-to-end tests.
- Uniwind is younger than NativeWind, with a smaller community. Because the classes are standard Tailwind, moving to NativeWind 5 later would mostly change configuration, not components.
- About 27 KB of CSS is added to the web build.

## Alternatives considered

- **NativeWind 4 with Tailwind CSS 3:** the longest-proven option, but on the previous Tailwind version, so a later migration is certain.
- **NativeWind 5 release candidate:** Tailwind CSS 4 with a larger community, but not a stable release.
- **StyleSheet only, or Tamagui:** no Tailwind, so no React Native Reusables, which the plan chose for ready-made accessible components.
