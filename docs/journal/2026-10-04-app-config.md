# 2026-10-04 · Phase 1: the app's configuration

### D-156 · A typed configuration, checked when the app starts (autopilot)

- **Decision** (autopilot): `apps/app/src/lib/config` reads the three `EXPO_PUBLIC_*` variables by name and validates them with zod, which SEC7 already names for validation. The result is a value, not an exception (CON5). If it's invalid, the root layout shows a screen that lists each problem, instead of the app.
- **Rules:**
  - Addresses must use `https`. Plain `http` is allowed only in development builds, for the local stack.
  - A Supabase secret key (`sb_secret_…`) is refused. Everything in these variables becomes part of the app, and the secret key bypasses RLS (SEC3).
- **Why:** CON8. A misconfigured build fails at the first screen, saying what's wrong, instead of failing later with obscure sync or sign-in errors.
- **Details found on the way:**
  - Expo writes a variable's value into the bundle only when its name is spelled out in full. Its Babel plugin also accepts `process.env["EXPO_PUBLIC_…"]`, so the strict rule against dot access on index signatures can stay on.
  - zod 4 keeps checking after a failed format check, which reported "not an address" and "not https" for the same value. One custom check now reports one problem per variable.
  - `new URL()` works on iOS and Android because Expo installs a standards-compliant `URL`; React Native's own is incomplete.

### D-158 · Land stacked pull requests from the bottom (autopilot)

- **What happened:** #28 (the configuration) was stacked on #27 (the scaffold) by making #27's branch its base. Merging #28 first, expecting both to land on `main`, squash-merged #28 into #27's branch instead. #27 now carries both, and lands as one commit.
- **Why:** Landing a whole stack from its top works only for stacks GitHub manages as stacks. A pull request whose base is another branch is merged into that branch, like any other.
- **Decision:** From now on, land stacks from the bottom (autopilot): merge the lowest pull request into `main`, rebase the next one onto `main`, and repeat.
- **Lesson:** Check what a merge targets before merging. The base branch decides it, not the intent.
