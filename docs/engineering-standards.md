# Engineering standards

Version 1.0, 2026-10-04. These rules apply to every change in this repository, whether a person or an AI agent makes it. Where other material lives:

- repository facts (commands, layout, test policy): [`AGENTS.md`](../AGENTS.md);
- how pull requests are reviewed: [`docs/pr-review.md`](pr-review.md);
- requirements: [`docs/requirements/`](requirements/);
- the decision trail: [`docs/journal/`](journal/).

## 0. Scope and how to apply

- **Precedence:** explicit instructions from the maintainer or the issue come first, then `AGENTS.md`, then this document.
- **MUST** is required whenever the rule is relevant. **SHOULD** is the default; deviate only with a reason stated in the PR.
- A rule about a feature applies only once that feature exists. For example, the SYNC rules apply once sync is wired up.
- Existing code that breaks a rule doesn't count against a change, unless the change touches, copies or extends that code.

### System context

- **Product:** local-first personal finance for iOS, Android and the web. Data belongs to ledgers that users are members of. Accounts can have different currencies.
- **Stack:**
  - App: Expo (React Native, TypeScript, Expo Router).
  - On-device database: SQLite, encrypted on mobile.
  - Sync: PowerSync (Sync Streams).
  - Backend: Supabase (Postgres, Auth, Row Level Security).
  - Web hosting: Cloudflare Workers.
  - Monorepo: pnpm and Turborepo.
- **Data flow:**
  1. The UI reads and writes the local database.
  2. Local writes go into an upload queue.
  3. Supabase applies the queued writes, checking RLS and constraints.
  4. Postgres logical replication feeds PowerSync.
  5. PowerSync sends the changes to the user's other devices.

## 1. Workflow (WF)

- **WF1: MUST trace the flow before editing.**
  - Read the requirement or issue.
  - Trace the affected flow end to end: UI → data package → upload connector → database policies and constraints → sync rules.
  - Read the tests that cover the flow.
- **WF2: MUST look for existing code before writing new code.**
  - Check `packages/core` (money, IDs, dates, validation), `packages/data` (queries, connector) and `packages/ui`.
  - Never copy a block: extract it and reuse it.
- **WF3: MUST keep each pull request to one purpose.**
  - Aim for about 400 hand-written lines or fewer; generated files don't count.
  - Split larger work in this order: schema, backfill, behaviour, cleanup.
  - When one PR depends on another, stack them.
- **WF4: MUST NOT invent behaviour.**
  - Don't invent business rules, currency rules or the behaviour of external services. List your assumptions in the PR, and ask when something is ambiguous.
  - Requirements marked _proposed_ don't bind until the maintainer confirms them.
- **WF5: MUST read version-matched documentation before changing a tool's configuration.**
  - Sources: the docs shipped in `node_modules/<tool>/`, the `action.yml` at the pinned commit, the schema bundled with the package.
  - Training data and blog posts go stale.
- **WF6: MUST record decisions.**
  - Every decision prompt, and every decision taken without one, gets an entry in [`docs/journal/`](journal/) in the PR that acts on it.
  - Architecture decisions also get an ADR.
- **WF7: MUST finish each PR with a handoff.** Include:
  - the behaviour change;
  - the commands run, with their results;
  - what was not verified, and why;
  - deploy notes (DB5).

## 2. Code conventions (CON)

- **CON1: Strict TypeScript.**
  - No `any`: use `unknown` and narrow it.
  - No non-null assertion (`!`) without a comment proving the invariant.
  - No `@ts-ignore`: use `@ts-expect-error` with a reason.
- **CON2: Comments explain contracts, units and side effects,** not what the code obviously does.
  - Exported functions in `packages/*` get a TSDoc summary.
  - Parameters that hold money or time state their unit (minor units, local date, UTC instant).
- **CON3: Naming.**
  - `camelCase` for values and functions, `PascalCase` for types and React components.
  - Booleans read as predicates (`isSynced`, `hasAccess`).
  - File names are kebab-case, except React component files (`TransactionRow.tsx`).
- **CON4: Named exports only.** Default exports are allowed only where a framework requires them, such as Expo Router routes and tool config files.
- **CON5: Expected failures are values; never swallow errors.**
  - At package boundaries, expected failures are returned as discriminated unions (`{ ok: true, value } | { ok: false, error }`).
  - Throw only for programmer errors and broken invariants.
  - Never write an empty `catch`, and never return success on failure.
- **CON6: Log only through the app logger,** which drops financial and personal data. `console.log` is a lint error.
- **CON7: All user-facing text goes through i18n,** including accessibility labels. Build sentences with interpolation and plural rules, never by concatenating strings.
- **CON8: Configuration comes from the typed config module** (validated `EXPO_PUBLIC_*` values). Never hard-code hosts, project references, keys, currencies or time zones.
- **CON9: Prettier formats and ESLint lints.** Don't debate style in reviews; change the tool configuration in its own PR instead.

## 3. Architecture (ARC)

- **ARC1: Dependency direction** is `apps → packages/data → packages/core`.
  - `packages/ui` is used by apps only.
  - `packages/core` has no React, React Native or I/O dependencies.
  - Lint rules enforce the boundaries.
- **ARC2: Feature modules** live in `apps/app/src/features/<feature>/` with their screens, components, hooks and tests. Features communicate through `packages/data`, never through each other's internals.
- **ARC3: Platform differences** use `.native.ts` and `.web.ts` files behind one shared interface. No scattered `Platform.OS` branches in feature code.
- **ARC4: An ADR comes first** for new architecture, a new dependency category (state library, UI kit, sync engine, analytics) or a reversal of an existing ADR.
- **ARC5: Every beta dependency sits behind a seam.** `packages/data` wraps it so it can be replaced without touching features. Today that covers PowerSync's React Native Web support and the encrypted SQLite adapter.
- **ARC6: The server is authoritative.** Checks in the client are for user experience. RLS, constraints and SQL functions enforce the rules.

## 4. Domain correctness (DATA)

- **DATA1: Money is an integer number of minor units plus an ISO 4217 currency code.**
  - Never use floating point.
  - Postgres stores it as `amount_minor bigint`; TypeScript checks it with `Number.isSafeInteger`.
  - Do arithmetic through the `packages/core` money helpers.
  - Every conversion states its rounding mode explicitly.
- **DATA2: Currencies.**
  - An account has exactly one currency. A transaction's currency equals its account's currency; a composite foreign key enforces this.
  - Conversion to the ledger's base currency records the rate, its source and its date. Never convert silently.
- **DATA3: Dates.**
  - A transaction's date is a calendar date in the ledger's time zone (`date`).
  - Moments in time are stored as UTC instants (`timestamptz`).
  - Never reinterpret a stored date in the device's current time zone.
- **DATA4: IDs.** Every synced row has a UUIDv7 generated on the device. Never derive identity from position or timestamps.
- **DATA5: Database constraints are the final authority.**
  - Use NOT NULL, CHECK, foreign keys (including composite keys for same-ledger and same-currency rules) and unique indexes on business keys.
  - Never drop or loosen a constraint to make code or tests pass.
- **DATA6: Ledger data is soft-deleted** (`deleted_at`). Hard deletes happen only through documented retention or erasure jobs, such as account deletion.
- **DATA7: Audit.** Database triggers write an audit row for every change to ledger data. Application code never writes audit rows itself.

## 5. Local-first sync (SYNC)

- **SYNC1: Every synced table has** `id uuid`, `ledger_id`, `created_at`, `updated_at` and `deleted_at`. The `ledgers` table's own `id` is its ledger id.
  - PowerSync evaluates sync-stream filters itself, on its copy of the data, so Postgres indexes don't speed them up.
  - Index the columns that RLS policies and app queries filter on, in Postgres and in the device schema.
- **SYNC2: Uploads are idempotent.** Inserts are upserts by primary key, so a retry never creates a duplicate.
- **SYNC3: Upload error policy.**
  - Transient errors (network failures, timeouts, 5xx responses) retry with backoff.
  - Permanent errors (constraint or RLS violations, validation failures) are removed from the queue, recorded on the device and shown to the user.
  - Never let one bad change block the queue, and never drop a change silently.
- **SYNC4: Conflicts resolve last-write-wins per row,** and the audit log keeps the history. Invariants that span rows, such as transfers, go through SQL functions, never through separate row writes.
- **SYNC5: Schema changes must tolerate offline devices,** which may be weeks out of date.
  - Use expand, migrate, then contract.
  - Never rename or drop a synced column, or tighten a constraint that old clients may violate, in a single release.
  - Ship the client change before any server constraint that depends on it.
- **SYNC6: Sync rules grant the minimum.**
  - Data is scoped to ledger membership, mirroring the RLS read policies.
  - Streams list their columns; never `SELECT *`. A new column reaches devices only when it's added to a stream on purpose.
  - Never sync other users' profiles, or any data the UI doesn't need.

## 6. Security (SEC)

- **SEC1: Row Level Security on every table in exposed schemas,** denying access by default.
  - Every policy has tests covering allowed and denied cases, other ledgers and each role.
  - CI fails if any table lacks RLS.
- **SEC2: Prefer `security invoker` functions.** A `security definer` function must set `search_path = ''`, fully qualify every name, validate its inputs and check membership.
- **SEC3: Secrets.**
  - Secrets never appear in code, logs, fixtures, screenshots or chat. They live only in GitHub Environments, EAS secrets and the maintainer's password manager.
  - The Supabase service-role key never reaches a client.
  - Clients use the publishable key, and RLS protects the data.
- **SEC4: Authentication.**
  - Never reveal whether an email address has an account.
  - Rely on Supabase Auth rate limits for one-time codes and passwords.
  - On native platforms, sessions live in SecureStore.
  - Signing out wipes the local database and its keys.
- **SEC5: Data on devices.**
  - The local database is encrypted on mobile, with its key in Keychain or Keystore.
  - No financial data in notifications, logs, analytics or crash reports. Tests prove the scrubbing.
- **SEC6: Web.**
  - A strict Content Security Policy: no inline or third-party scripts.
  - HSTS and `frame-ancestors 'none'`.
  - No `dangerouslySetInnerHTML` with non-constant content.
  - No `eval` or `new Function`.
- **SEC7: Validate input at every boundary** with the zod schemas in `packages/core`. The database validates again.
- **SEC8: Dependencies.**
  - Justify every new dependency in the PR: the need, its maintenance, its license and its size.
  - Respect the 3-day minimum release age.
  - Install scripts run only when allow-listed in `allowBuilds`.
  - No git or tarball dependencies.
  - Licenses must pass dependency review.
- **SEC9: CI and CD.**
  - Pin every action to a full commit SHA.
  - Set `permissions: {}` by default, and comment every permission a job needs.
  - Check out with `persist-credentials: false`.
  - Never use `pull_request_target` together with a checkout of PR code.
  - Pass untrusted input only through environment variables.
  - Expose secrets only to the jobs that need them, and never to PRs from forks.
- **SEC10: Files that instruct AI agents are reviewed like code.** This covers `AGENTS.md`, `CLAUDE.md`, `.claude/` and review-tool configs. Tools and dependencies must not write to them.
- **SEC11: Personal data.**
  - Collect the minimum.
  - Document every field that leaves the device.
  - Support data export and deletion.

## 7. Performance (PERF)

- **PERF1: Screens read from the local database with indexed queries.** No network calls on the render path.
- **PERF2: Long lists are virtualized** with FlashList. Aggregate in SQL, on SQLite or Postgres, never by looping in JavaScript over every transaction.
- **PERF3: CI enforces the web bundle budget.** A PR that adds a dependency states its size impact.
- **PERF4: Measure before claiming.** A performance change includes before-and-after numbers, with the device, data size and method used.
- **PERF5: Avoid re-render storms.** Derive expensive data once. Prefer what the React Compiler produces over hand-written memoization where it applies.

## 8. Database and deploys (DB)

- **DB1: Migrations are forward-only SQL files** in `supabase/migrations/`, one purpose each. Never edit a migration that has already been applied.
- **DB2: Every migration works with what is currently running:** the deployed app, the deployed sync rules and offline clients (SYNC5).
- **DB3: Backfills run as batched jobs or scripts,** never inside schema migrations. A destructive data change needs a dry run with counts, and the maintainer's approval.
- **DB4: Deploy order** is database migrations, then sync config, then web, then the mobile over-the-air update. Each step must work with the previous version of the next one.
- **DB5: Deploy notes in the PR** list migrations, sync-rule changes, new environment variables or secrets, feature flags and ordering constraints.

## 9. Testing (TEST)

- **TEST1: Every behaviour change ships with tests at the lowest layer that proves it:**
  - unit tests for `packages/core`;
  - component tests for the app;
  - database tests (pgTAP) for RLS, constraints and functions;
  - end-to-end tests (Playwright on web, Maestro on Android) for user journeys.
- **TEST2: Cover the risk cases that apply:**
  - going offline and reconnecting;
  - duplicate and out-of-order uploads;
  - another ledger's IDs;
  - a role that should be denied;
  - a currency mismatch;
  - time-zone and month boundaries;
  - zero and very large amounts;
  - rejected uploads.
- **TEST3: Tests are deterministic.**
  - Fake the clock and timers.
  - No real network in unit or component tests.
  - Each test creates its own data, and no state is shared between tests.
- **TEST4: Never mock the unit under test, or the behaviour a test claims to verify.** RLS tests run against real Postgres, and sync tests against a real local stack.
- **TEST5: Never delete, skip or weaken a test to get a passing run.** Fix the code, or fix the test's wrong assumption and explain it in the PR.
- **TEST6: Report the exact commands and their results,** and say what couldn't run and why. Only trust a new check once you've seen it fail.

## 10. Git and pull requests (GIT)

- **GIT1: Branch from the latest remote base,** using `feat/…`, `fix/…`, `docs/…` or `chore/…`. A stacked branch starts from its parent's remote branch.
- **GIT2: Commits.**
  - One logical change per commit.
  - A Conventional Commit subject, with a body that explains why.
  - Stage files by explicit path.
  - No AI attribution lines.
- **GIT3: PR titles follow Conventional Commits** (CI enforces this), and PRs are squash-merged.
- **GIT4: Keep history linear and readable, and never rewrite shared history.**
  - Never rewrite `main`, or a branch someone else works on.
  - Update your own PR branch by **rebasing** it onto its base, never by merging the base into it. Push with `--force-with-lease=<branch>:<expected-sha>`, so you never overwrite work you haven't seen.
  - Fold a fix into the commit it belongs to: `git commit --fixup=<sha>`, then `git rebase --autosquash <base>`.
  - **Stacked PRs** (GitHub stacks) merge bottom-up. GitHub then rebases the PRs above. `gh pr merge` refuses stacked PRs; use the asynchronous merge API (`PUT /repos/{owner}/{repo}/pulls/{n}/merge-async`, without bypassing rules).
  - Delete branches once their PR is merged.
- **GIT5: Never commit generated or personal files:** build output, coverage, `.env*`, personal configs, `lefthook-local.yml`.

## 11. Maintaining this standard

- Rule IDs are stable: never renumber or reuse them. Reviews and journal entries cite them.
- Change a rule only with its reason and its evidence (an incident, a journal entry or an ADR), in the same PR.
- Revisit the rules after incidents and after major architecture changes.
