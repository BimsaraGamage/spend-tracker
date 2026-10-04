# 2026-10-04 · Guides for AI coding agents

### D-89 · One tool-neutral source of agent instructions (autopilot)

- **Decision:** `AGENTS.md` holds every instruction for AI agents and works with any tool. `CLAUDE.md` only imports it (`@AGENTS.md`) and adds Claude Code specifics (autopilot).
- **Why:** Two copies of the same instructions drift apart. Several agent tools read `AGENTS.md` directly, and Claude Code follows the import.
- **Contents:**
  - the documents to read first;
  - the commands and layout;
  - the instruction to check version-matched documentation (D-58);
  - how branches, commits, PRs and the journal work;
  - an explicit "never without the maintainer" list mirroring the safety floor.

### D-90 · A read-only review skill (autopilot)

- **Decision:** The shared `/review-pr` skill runs the `docs/pr-review.md` procedure and never edits, pushes, comments, approves or merges (autopilot).
- **Why:** A review tool that can change what it reviews isn't independent. Keeping it read-only also keeps merges with the maintainer (D-46).
- **Note:** The maintainer's personal mode shortcuts (`/guided`, `/balanced`, `/autopilot`) stay outside the repository. They are excluded locally through `.git/info/exclude`, not `.gitignore`, so they leave no trace in the public repository.
