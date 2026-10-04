# Dependency updates (Renovate)

[Renovate](https://docs.renovatebot.com) keeps dependencies current through pull requests. Its configuration is [`renovate.json`](../../renovate.json).

## How it behaves here

- **Schedule:** before 6 am every Monday (Asia/Colombo). Security fixes can arrive at any time.
- **Waiting period:** only versions at least **3 days old**, the same rule pnpm enforces.
- **Grouping:** one PR for non-major development dependencies, and one for GitHub Actions.
- **Major versions wait for your approval.** Tick them on the **Dependency Dashboard** issue. They often break compatibility, as TypeScript 7 and ESLint 10 did at first.
- **Expo-managed packages** (`expo`, `react-native`, …) are left alone. They move only in dedicated Expo SDK upgrade PRs (`npx expo install --fix`).
- PR titles follow Conventional Commits (`chore(deps): …`, `fix(deps): …`), so the PR-title check passes.

## One-time setup (maintainer)

1. Open <https://github.com/apps/renovate> and click **Install** (the app is free).
2. Choose **Only select repositories** → `spend-tracker` → **Install**.
3. Renovate reads `renovate.json` from `main` and opens a **Dependency Dashboard** issue. From then on, its PRs go through the same checks and reviews as any other PR.
