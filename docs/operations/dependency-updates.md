# Dependency updates (Renovate)

[Renovate](https://docs.renovatebot.com) keeps dependencies current through pull requests. Its configuration is [`renovate.json`](../../renovate.json).

## How it behaves here

- **Schedule:** before 6 am every Monday (Asia/Colombo). Security fixes can arrive at any time.
- **Waiting period:** only versions at least **3 days old**, the same rule pnpm enforces.
- **Grouping:** one PR for non-major development dependencies, and one for GitHub Actions.
- **Major versions wait for your approval.** Tick them on the **Dependency Dashboard** issue. They often break compatibility, as TypeScript 7 and ESLint 10 did at first.
- **Expo-managed packages** (`expo`, `react-native`, …) are left alone. They move only in dedicated Expo SDK upgrade PRs (`npx expo install --fix`).
- PR titles follow Conventional Commits (`chore(deps): …`, `fix(deps): …`), so the PR-title check passes.

## Accepted advisories

Dependency review blocks pull requests that add a dependency with a known high or critical vulnerability. An advisory with no fixed version can be accepted, after review, in `allow-ghsas` in [`.github/workflows/dependency-review.yml`](../../.github/workflows/dependency-review.yml). Each accepted advisory is listed here, and removed as soon as a fix is released.

| Advisory                                                                 | Package                                  | Why it's accepted                                                                                                                                                                                                   |
| ------------------------------------------------------------------------ | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) | `braces` 3.0.3 and older, via micromatch | No fixed version exists. Only build and test tools (Metro, Jest) use it, on glob patterns from the project's own configuration, never on user input. It isn't part of the app. Accepted 2026-10-04 (journal D-155). |

## One-time setup (maintainer)

1. Open <https://github.com/apps/renovate> and click **Install** (the app is free).
2. Choose **Only select repositories** → `spend-tracker` → **Install**.
3. Renovate reads `renovate.json` from `main` and opens a **Dependency Dashboard** issue. From then on, its PRs go through the same checks and reviews as any other PR.
