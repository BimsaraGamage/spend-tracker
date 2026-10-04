# Decision journal

A chronological record of every decision prompt in this project: what was asked, which options were offered, what was chosen, who chose it, and what was done as a result.

Significant architecture decisions also get a formal ADR. This journal keeps the complete trail, including small decisions, so that anyone, including future maintainers, can see how the project got here and why.

## How to read an entry

Each entry has a stable ID (`D-<number>`) and these fields:

| Field        | Meaning                                                                                                                           |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| **Prompt**   | The question as it was asked, sometimes shortened                                                                                 |
| **Options**  | The choices offered. ★ marks the recommended option                                                                               |
| **Decision** | What was chosen, and by whom: the **maintainer**, or **autopilot** (the recommended option, taken automatically without a prompt) |
| **Action**   | What was done as a result, with links to pull requests or documents where they exist                                              |
| **Lesson**   | The reusable principle, for decisions worth remembering                                                                           |

Decisions are made in one of three collaboration modes, which the maintainer can switch at any time:

- **guided:** the maintainer is asked at every important decision, turning point and low-confidence moment;
- **balanced:** easily reversible decisions are taken automatically, and hard-to-reverse ones are asked;
- **autopilot:** the recommended option is always taken, and each decision is logged here.

In every mode, irreversible or outward-facing actions are always confirmed: making something public, deleting, merging, spending money and handling secrets.

New entries go into the pull request that acts on the decision.

## Index

| File                                                 | Period                                                         | Entries     |
| ---------------------------------------------------- | -------------------------------------------------------------- | ----------- |
| [2026-10-04-planning.md](2026-10-04-planning.md)     | Planning: product, architecture, security, repository, process | D-01 – D-40 |
| [2026-10-04-foundation.md](2026-10-04-foundation.md) | Phase 0: repository foundation                                 | D-41 – D-69 |
