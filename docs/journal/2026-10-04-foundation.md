# 2026-10-04 · Phase 0: repository foundation

Project decisions made while building the repository foundation. ★ marks the recommended option recorded at the time.

### D-41 · Toolchain versions (turning point)

- **Prompt:** "Latest" on npm was TypeScript 7.0 (a new Go-based compiler) and ESLint 10. But typescript-eslint supports TypeScript below 6.1 only, Expo's ESLint plugins stop at ESLint 9, and Expo SDK 57's template ships TypeScript 6.0. Which version policy?
- **Options:** ★ Latest compatible (TypeScript 6.0 + ESLint 9) · Bleeding edge (TypeScript 7 + ESLint 10)
- **Decision:** Latest compatible (maintainer).
- **Action:** TypeScript 6.0.3 and ESLint 9.39.5, pinned in the pnpm catalog. Renovate will propose the upgrades once the ecosystem catches up.
- **Lesson:** "Latest" is not "ready". Before adopting a major version, check three signals: your plugins' peer-dependency ranges, what the framework's own template ships, and the slowest critical dependency. The slowest one sets your pace.

### D-43 · Where project decisions are recorded

- **Decision:** Keep a decision journal in the repository.
- **Action:** Project decisions and their supporting rationale are recorded here; significant architecture decisions also receive an ADR.

### D-45 · Commit-signing key (follow-up to D-39)

- **Prompt:** Should the new signing key have a passphrase? Note that the existing SSH login key on this machine has none.
- **Options:** ★ Passphrase + ssh-agent · no passphrase
- **Decision:** (written answer) Don't disturb the existing access used for other work, allow working on this project in parallel, and never be locked out if the machine is lost (maintainer).
- **Action:**
  - A dedicated ed25519 signing key, without a passphrase, referenced only by this repository's local git config. Existing keys and the global git config are untouched.
  - The key lives outside `~/.ssh`, because the desktop keyring auto-loaded it from there and would have offered it for SSH logins.
  - Losing the machine costs nothing: revoke the key on GitHub. Commits already pushed stay "Verified", because GitHub stores the verification result.
- **Lesson:** Security controls are only as strong as the weakest path to the same outcome. A passphrase on the signing key adds friction without reducing risk while the login key next to it has none.

### D-46 · Who presses "merge"

- **Options:** Maintainer reviews and merges · assistant merges on green checks · split by risk · maintainer approves in chat, assistant merges
- **Decision:** Maintainer approves in chat, assistant merges (maintainer).
- **Action:** Every merge waits for the maintainer's "merge". Each PR is presented with a summary, its risk, and what to look at.
- **Lesson:** This is the four-eyes principle: author and approver are different parties. Its failure mode is rubber-stamping, so scale review depth with risk: skim docs and tooling, read migrations and security changes line by line.

### D-47 · Going public (one-way door)

- **Prompt:** Create the repository as public, push the initial commits and apply the planned settings? Once public, assume the content is permanent.
- **Options:** ★ Yes, create and configure · create, but review settings first · not yet
- **Decision:** Yes (maintainer).
- **Action:**
  - Created the repository and confirmed nothing secret was in it.
  - Merge settings: squash-only, PR title as the commit title, branches deleted after merge.
  - Discussions on, topics set, a label taxonomy (type, area, priority, status).
  - Security: secret scanning with push protection, private vulnerability reporting, Dependabot alerts, a read-only default Actions token, and approval required before workflows from outside contributors run.
  - Environments: `staging`, and `production` gated on the maintainer's approval.
  - A `main` ruleset requiring PRs, linear history and signed commits, and blocking force-pushes and deletion.

### D-49 · Direction: git workflow

- **Direction (maintainer):**
  - No AI attribution lines in commits or PRs.
  - Create branches from the remote branch.
  - Make small commits that are easy to tell apart.
  - Stage only relevant changes, then push.
- **Action:**
  - Branches start from `origin/<base>`, and files are staged by explicit path.
  - Each commit has one purpose and an explanatory body.
  - Unpushed history is tidied with fixup commits; pushed history is never rewritten.

### D-50 · Registering the signing key on GitHub

- **Pending action:** Register the public signing key and enable reported content for Code of Conduct reports.
- **Outcome:** D-53 records the decision to push before key registration.

### D-51 · Meaning of "no AI credits"

- **Options:** ★ No attribution lines in commits or PRs · also avoid any paid AI usage
- **Decision:** No attribution lines (maintainer).

### D-52 · AI-assistance disclosure policy

- **Options:** Keep disclosure in PRs · optional disclosure · remove AI mentions
- **Decision:** Optional disclosure (maintainer).
- **Action:** CONTRIBUTING and the PR template say naming AI tools is optional; contributors stay responsible for every line. The same rule applies to the maintainer's own PRs.
- **Lesson:** Optional fields are usually left blank, so they give reviewers a weak signal. Revisit if outside contributions grow.

### D-53 · The "Verified" badge

- **Options:** Key added, then push · push now, add the key later
- **Decision:** Push now, add the key later (maintainer).
- **Action:** The first commits show "unverified (unknown key)" on GitHub until the key is registered.

### D-55 · pnpm version (low confidence)

- **Prompt:** pnpm 12 is a complete rewrite in Rust: labelled stable, 5 weeks old, 21 bug-fix releases, and no evidence of testing with Expo's tooling. pnpm 11 is mature and has the same security defaults.
- **Options:** ★ pnpm 11.28 · pnpm 12.9
- **Decision:** pnpm 11.28 (maintainer).
- **Action:** pnpm 11.28.3 pinned through Corepack with an integrity hash. 11.28.4 was skipped because it was less than 3 days old (D-57).

### D-57 · Waiting period for new package versions

- **Prompt:** Make pnpm refuse package versions published less than N days ago, because hijacked releases are usually caught within hours to days.
- **Options:** ★ 3 days · 1 day · 7 days
- **Decision:** 3 days (maintainer).
- **Action:** `minimumReleaseAge: 4320` in `pnpm-workspace.yaml`. Pinned versions also have to be at least 3 days old, so turbo 2.11.6 and pnpm 11.28.3 were chosen over versions published days earlier.
- **Lesson:** A security rule constrains your own choices too. Pick versions that comply on day one rather than starting with exceptions.

### D-58 · Turbo's auto-managed AGENTS.md block

- **Prompt:** turbo 2.11 writes, and keeps rewriting, a block of instructions for AI agents into `AGENTS.md`. It's useful (it caught an outdated schema URL), but a dependency writing agent instructions is a prompt-injection channel.
- **Options:** ★ Opt out and keep the advice in our own file · keep turbo's managed block
- **Decision:** Opt out and keep the advice (maintainer).
- **Action:** `agentGuidance: false` in `turbo.json` and the generated file deleted. Our own AGENTS.md will tell agents to consult the version-matched docs in `node_modules`.
- **Lesson:** Files that steer AI agents are part of your attack surface. Review them like code, and don't let dependencies write to them.

### D-59 · Git hooks

- **Options:** ★ Format on commit, check on push · format on commit only · everything on commit
- **Decision:** Format on commit, check on push (maintainer).
- **Action:** Pre-push lints and type-checks the affected packages. Pre-commit changed slightly in D-64.

### D-63 · Node.js globals for JavaScript config files (autopilot)

- **Decision:** Give `*.js` tooling files Node.js globals in the shared ESLint config (autopilot).
- **Why:** A negative test (deliberately broken code) showed `console` reported as undefined in Node config files.
- **Lesson:** A passing check proves nothing until you've seen it fail. Plant a deliberate mistake first.

### D-64 · Pre-commit checks formatting instead of fixing it (autopilot)

- **Decision:** The commit hook _checks_ formatting rather than auto-fixing it (autopilot). This deviates from the wording of D-59.
- **Why:** Auto-fixing re-stages whole files, which could pull unrelated, unstaged edits into a commit. That conflicts with D-49 (stage only relevant changes). Fixing happens on save in the editor, or with `pnpm format`.

### D-65 · Prettier settings (autopilot)

- **Decision:** Prettier's defaults; generated files and the verbatim Contributor Covenant text are excluded (autopilot).
- **Why:** Debating formatting is a classic time sink, and contributors already know the defaults.

### D-66 · What "affected" is measured against (autopilot)

- **Decision:** The pre-push hook compares against `origin/main`, not the local `main` (autopilot).
- **Why:** Branches start from the remote, and a stale local `main` would make "affected packages" wrong.

### D-67 · How CI installs tools (autopilot)

- **Decision:** CI uses Corepack instead of the third-party `pnpm/action-setup` action. Every action is pinned to a full commit SHA of a release at least 3 days old (autopilot).
- **Why:** Each third-party action is one more party that can be compromised. A tag such as `v4` can be moved to different code; a commit SHA can't.

### D-68 · Workflow security scanners (autopilot)

- **Decision:** Pin zizmor to version 1.30.1 and make it fail the build with annotations. Install actionlint from a checksum-verified release archive (autopilot).
- **Why:** The zizmor action defaults to the _latest_ zizmor and to upload-only mode. `curl | bash` installers run whatever the server sends.

### D-69 · Reviewable project decision records

- **Decision:** Keep project decisions and their outcomes in the versioned journal.
- **Action:** Entries accompany the PR that implements the decision, with links to relevant requirements and artifacts.

### D-70 · No manual index in the journal (autopilot)

- **Decision:** Remove the index table from the journal README. Files are named `YYYY-MM-DD-<topic>.md`, so sorting by name is chronological (autopilot).
- **Why:** Several pull requests are open at once, and each adds journal entries. A shared index table would give every one of them a merge conflict.
- **Lesson:** Avoid "registry" files that every change must edit. Let naming conventions do the indexing.
