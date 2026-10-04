# 2026-10-04 · Clean history and stacked pull requests

### D-122 · Direction: clean, readable history inside branches too

- **Direction (maintainer):** Keep the commit history inside branches clean and easy to understand, and keep branch management tidy.
- **Action:**
  - PR branches are no longer updated by merging `main` into them, which had left "Merge remote-tracking branch…" commits. They're rebased onto their base and pushed with `--force-with-lease`.
  - Fixes are folded into the commit they belong to (fixup + autosquash).
  - Rule GIT4 was rewritten to match, and D-49's "pushed history is never rewritten" is narrowed: `main` and shared branches are never rewritten; your own PR branches may be.
  - The open stack (#13–#15) was rebased this way. It went from two merge commits to clean, linear branches.

### D-123 · GitHub's native stacked pull requests

- **Found by:** The maintainer's screenshot showing GitHub's new stack view ("Stack #17": "Some branches in this stack have diverged and must be rebased"). GitHub shipped native stacked PRs in public preview on 2026-07-30.
- **Facts learned while merging:**
  - `gh pr merge` refuses a stacked PR. GitHub requires the asynchronous merge API, `PUT /pulls/{n}/merge-async`, which was used with `bypass_rules=false` and a head-SHA check.
  - After the lower PR merged, GitHub rebased and retargeted the PRs above it by itself. It created new commits signed by GitHub, which pass the signed-commits rule.
  - Merging the top PR landed the remaining layers in one action, still as one squash commit per PR on `main`.
- **Lesson:** Stacks work best when each branch's history is clean. The tool then does the rebasing that used to be manual.

### D-124 · Branch cleanup after merging (autopilot)

- **Decision:** After merges, fast-forward local `main` and delete local branches whose PR GitHub reports as merged. Squash-merged branches aren't ancestors of `main`, so the check uses the PR state rather than git ancestry. Remote branches are deleted automatically on merge (autopilot).
- **Result:** After #8–#16 merged, the repository had exactly one branch, `main`, both locally and on GitHub.
