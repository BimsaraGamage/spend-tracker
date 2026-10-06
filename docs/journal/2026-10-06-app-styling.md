# 2026-10-06 · App styling

### D-188 · The styling toolkit

- **Question:** Which styling toolkit should the app use? Every screen is built on it, and switching later means touching every screen.
- **Options:**
  - ★ Uniwind 1.12 with Tailwind CSS 4 and React Native Reusables: stable releases, but a younger project.
  - NativeWind 4.2 with Tailwind CSS 3: the longest-proven option, but on the previous Tailwind version.
  - NativeWind 5 release candidate with Tailwind CSS 4: not a stable release yet.
  - Pause before styling.
- **Decision:** Uniwind (maintainer).
- **Why:** It's the stable option on Tailwind CSS 4. Its classes are standard Tailwind, so a later move would mostly change configuration.
- **Action / outcome:**
  - [ADR-0016](../adr/0016-styling-with-uniwind.md).
  - Design tokens for light and dark themes in `apps/app/src/global.css`.
  - `Text` and `Button` from React Native Reusables, credited in `NOTICE`.
  - Navigation colors come from the same tokens.
  - The home and configuration screens use them.
  - Not verified here: rendering on a phone. The laptop has no emulator, so CI checks the web build, and device builds come later.

### D-189 · How the styling setup is wired

- **Context:** The assistant made these choices while setting up D-188, without a separate question.
- **Decision (assistant):**
  - The Metro configuration is an ES module (`metro.config.mjs`), because the lint rules forbid `require`.
  - Uniwind's generated type file is committed, so type checks pass without running Metro. Prettier ignores it.
  - Only the design tokens in use are kept. The template's chart and sidebar colors can come back when a screen needs them.
  - Headings now use the `heading` role, as React Native Reusables sets it. Screen readers announce it the same way. Two tests now look for `heading` instead of `header`.
