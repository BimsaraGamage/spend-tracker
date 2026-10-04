# AI code review

Two AI reviewers support the human review. Both follow the same rules, [`docs/pr-review.md`](../pr-review.md) and [`docs/engineering-standards.md`](../engineering-standards.md), and neither can approve or merge anything. The maintainer decides.

## CodeRabbit (free for public repositories)

Its configuration is [`.coderabbit.yaml`](../../.coderabbit.yaml):

- the "chill" profile (low noise), no poems;
- path-specific checks for database, domain, sync, workflow and agent-instruction files;
- the standards as its knowledge base.

**One-time setup (maintainer):**

1. Open <https://github.com/apps/coderabbitai> and click **Install**.
2. Choose **Only select repositories** → `spend-tracker` → **Install**.
3. Sign in at <https://app.coderabbit.ai> with GitHub once, so the repository shows up there. No payment details are needed: open-source repositories get the Pro features free.

CodeRabbit then reviews every non-draft PR, except Renovate's.

## Claude review (inactive until you add a credential)

The [`claude-review.yml`](../../.github/workflows/claude-review.yml) workflow reviews PRs with Claude Code, following `docs/pr-review.md`.

- It runs only on non-draft PRs that people open from branches in this repository. It never runs on fork PRs or bot PRs.
- Its tools are limited to reading code and posting review comments.
- Without a credential, it skips with a notice.

**To turn it on, add exactly one repository secret** (Settings → Secrets and variables → Actions → Secrets):

| Secret                    | When to use it                                                                                                                                                                                                             |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CLAUDE_CODE_OAUTH_TOKEN` | You have a personal Claude Pro or Max subscription. Create the token with `claude setup-token`. A subscription is for your own use, which fits this workflow because it reviews only PRs from branches in this repository. |
| `ANTHROPIC_API_KEY`       | Pay-per-use API billing from the Anthropic Console. Needed if reviews ever have to cover other people's work.                                                                                                              |

Never paste either value into chat or into a file. Enter it only in the GitHub secret form, and keep a copy in your password manager.
