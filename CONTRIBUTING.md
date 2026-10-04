# Contributing to spend-tracker

Thanks for your interest! This project is **pre-alpha**: the architecture and foundations are still being built, so here is how you can help right now.

## How to help today

| You want to…           | Do this                                                                                                                                                                   |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Report a bug           | Open an issue with the **Bug report** form.                                                                                                                               |
| Suggest a feature      | Start a thread in [Discussions → Ideas](https://github.com/BimsaraGamage/spend-tracker/discussions/categories/ideas). Once it's well defined, open a **Feature request**. |
| Ask a question         | Use [Discussions → Q&A](https://github.com/BimsaraGamage/spend-tracker/discussions/categories/q-a).                                                                       |
| Report a vulnerability | Follow [SECURITY.md](SECURITY.md). Please never use a public issue.                                                                                                       |

**Code contributions** open once the foundation (the walking skeleton) is in place. Until then, pull requests from outside the project may be closed without review, because the core design is still moving. That isn't a judgment of your work.

Never include real financial data, account numbers or personal information in issues, pull requests, tests or screenshots.

## Development setup

Prerequisites:

- Node.js 24 LTS. The version is pinned in [`.nvmrc`](.nvmrc), so `nvm install && nvm use` picks it up.
- Docker, which the local database and sync stack will need.

```sh
corepack enable pnpm   # use the exact pnpm version pinned in package.json
pnpm install           # install dependencies and the git hooks
```

| Command             | What it does                               |
| ------------------- | ------------------------------------------ |
| `pnpm lint`         | Type-aware ESLint in every package         |
| `pnpm typecheck`    | TypeScript checks in every package         |
| `pnpm test`         | Unit tests in every package                |
| `pnpm format`       | Format all files with Prettier             |
| `pnpm format:check` | Check formatting without changing anything |

**Git hooks.** Before each commit, the formatting of staged files is checked. Before each push, packages changed since `origin/main` are linted and type-checked. CI runs every check again, so in an emergency you can skip the hooks with `--no-verify`.

**Supply-chain rules.** pnpm refuses package versions published less than 3 days ago. It also blocks dependency install scripts unless they are listed under `allowBuilds` in `pnpm-workspace.yaml`. If an install fails because a version is too new, wait or choose an older version; don't disable the check.

**Telemetry.** Turborepo sends anonymous usage data by default. Opt out with `pnpm exec turbo telemetry disable`, or set `TURBO_TELEMETRY_DISABLED=1`. CI always disables it.

## Workflow

- **Trunk-based:** `main` is always releasable. Work happens on short-lived branches named `feat/<slug>`, `fix/<slug>`, `docs/<slug>` or `chore/<slug>`.
- **Small pull requests:** one purpose each, ideally around 400 hand-written lines or fewer (generated files excluded).
- **PR titles follow [Conventional Commits](https://www.conventionalcommits.org).** PRs are squash-merged, so the title becomes the commit message on `main` and drives the changelog:
  - `feat(app): add transaction list`
  - `fix(sync): retry uploads after a network timeout`
  - `docs: explain the money representation`

  Scopes: `app`, `core`, `data`, `ui`, `db`, `sync`, `ci`, `docs`, `deps`.

- **Checks must pass:** every PR runs linting, type checks, tests and security scans.
- **Fill in the PR template:** what and why, how you tested (exact commands and results), risk and rollback, and deploy notes.

## AI-assisted contributions

AI coding tools are welcome; this project itself is built with them. You are responsible for every line you submit: understand it, test it, and be ready to explain it in review. Naming the tools you used in the PR description is optional, but it helps reviewers.

## License of contributions

By contributing, you agree that your contributions are licensed under the [Apache License 2.0](LICENSE) (see section 5 of the license). No separate contributor license agreement is required.
