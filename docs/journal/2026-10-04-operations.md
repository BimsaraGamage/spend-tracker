# 2026-10-04 · Operations runbooks

### D-91 · Operations docs as an independent PR that doubles as a diagnostic (autopilot)

- **Decision:** Build the account-recovery runbook and the launch checklist as a pull request directly on `main`, outside the stack (autopilot).
- **Why:**
  - These documents don't depend on the stacked PRs.
  - Opened _after_ the "extra approval for unattributed changes" rule was turned off, the PR is also a test (D-82). If it can be merged, the older PRs are stuck on a stale state; if it's blocked too, the cause is something else.
  - Confidence that this isolates the cause: moderate.
- **Contents:**
  - every account, with how it's recovered;
  - a secrets inventory (names only);
  - the lost-device procedure;
  - commit-signing setup on a new machine;
  - the milestone gates: before real data, before inviting others, before the app stores.

### D-92 · Diagnostic result: every PR into `main` is blocked (autopilot)

- **Result:** This PR, opened after the rule change, is blocked too. So the "extra approval for unattributed changes" rule (now confirmed `false`) is **not** the cause.
- **Leading explanation (moderate confidence):** Other projects report that under "require signed commits", _unverified_ commits on a PR branch block even a squash merge, although GitHub signs the squash commit itself. Every commit in these PRs shows "unknown key", because the maintainer's signing key isn't registered on GitHub yet (D-53).
- **Next step:** The maintainer registers the signing key as a GitHub _Signing Key_. If the PRs are still blocked afterwards, the merge box in the browser names the exact rule.
- **Lesson:** A deferred step ("add the key later") can quietly turn into a blocker once a rule depends on it. When you defer something, note which rules rely on it.
