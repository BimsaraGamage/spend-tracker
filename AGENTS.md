# AGENTS.md

Instructions for AI coding agents, and a quick reference for humans. This file is reviewed like code ([SEC10](docs/engineering-standards.md#6-security-sec)). No tool or dependency may write to it.

## What this repository is

`spend-tracker` is a local-first personal finance app for iOS, Android and the web: Expo / React Native and TypeScript, with SQLite on the device, PowerSync for sync, and Supabase (Postgres, Auth, Row Level Security) as the backend. It is **pre-alpha**: the repository foundation is in place, and the app and backend are being built now.

## Read before changing anything

1. [`docs/engineering-standards.md`](docs/engineering-standards.md): the rules, with stable IDs (WF, CON, ARC, DATA, SYNC, SEC, PERF, DB, TEST, GIT).
2. [`docs/pr-review.md`](docs/pr-review.md): how changes are reviewed.
3. [`docs/requirements/`](docs/requirements/): the requirement IDs to cite. Requirements marked _proposed_ are not binding.
4. [`docs/journal/`](docs/journal/): the decision trail. Read the newest file to see where things stand.

## Commands

Node 24 (from `.nvmrc`) and pnpm through Corepack:

```sh
corepack enable pnpm
pnpm install --frozen-lockfile
pnpm format:check   # Prettier
pnpm lint           # type-aware ESLint in every package
pnpm typecheck      # TypeScript in every package
pnpm test           # tests in every package
```

Set `TURBO_TELEMETRY_DISABLED=1`; tools must not phone home.

## Layout

| Path              | Contents                                                        |
| ----------------- | --------------------------------------------------------------- |
| `packages/config` | Shared TypeScript and ESLint configuration                      |
| `docs/`           | Requirements, standards, the review guide, the decision journal |
| `.github/`        | CI and security workflows, issue and PR templates, code owners  |

Planned, not yet created:

- `apps/app`: the Expo app;
- `packages/core`: pure domain logic;
- `packages/data`: local database, queries and the sync connector;
- `packages/ui`: design tokens and components;
- `supabase/`: migrations, RLS and pgTAP tests;
- `powersync/`: the sync configuration.

Dependencies point one way: `apps → packages/data → packages/core` ([ARC1](docs/engineering-standards.md#3-architecture-arc)).

## Check the installed version's documentation, not memory

Several tools here are newer than most training data. Before changing a tool's configuration, read the documentation that matches the installed version ([WF5](docs/engineering-standards.md#1-workflow-wf)):

- **Turborepo:** `node_modules/turbo/docs/` and `node_modules/turbo/schema.json`.
- **GitHub Actions:** the action's `action.yml` at the exact commit SHA pinned in the workflow.
- **pnpm:** the release notes for the version pinned in `package.json` (`packageManager`). pnpm 11 reads only auth and registry settings from `.npmrc`; everything else lives in `pnpm-workspace.yaml`.
- **Expo:** the documentation for the SDK version in the app's `package.json`.

## How to work

- **Branches** start from the latest remote base (`git fetch`, then `git switch -c <branch> origin/<base>`). When a change depends on an open PR, stack the new branch on that PR's branch.
- **Commits** are small, one purpose each, with a Conventional Commit subject and a body that explains why. Stage files by explicit path, never with `git add -A`. No AI attribution lines.
- **Pull requests** use the template, with Conventional Commit titles, and are squash-merged.
- **Decisions:** every decision prompt, and every decision taken without one, gets an entry in `docs/journal/` in the PR that acts on it ([WF6](docs/engineering-standards.md#1-workflow-wf)). Continue the `D-<number>` sequence from the newest journal file.
- **Verification:** run the checks, report the exact commands and results, and trust a new check only after you've seen it fail ([TEST6](docs/engineering-standards.md#9-testing-test)).

## Never, without the maintainer's explicit approval

- Push to `main` (it is protected anyway), merge, close or delete PRs, branches or data.
- Change repository settings, rulesets or environments.
- Create, read, rotate or print secrets. Secrets never appear in chat, code, logs or fixtures.
- Make anything public, or spend money (paid services, app-store accounts).
- Use `pull_request_target`, weaken workflow permissions, or work around a check that blocks you. Find out why it blocks instead.

## Test policy

Every behaviour change ships with tests at the lowest layer that proves it ([TEST1](docs/engineering-standards.md#9-testing-test)):

- unit tests for `packages/core`;
- component tests for the app;
- pgTAP tests for RLS, constraints and SQL functions;
- Playwright (web) and Maestro (Android) tests for user journeys.

CI runs formatting, lint, type checks and tests on every pull request, alongside CodeQL, dependency review and workflow security scans.
