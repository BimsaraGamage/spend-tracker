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
