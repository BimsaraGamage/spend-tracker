# Decision journal

A record of project decisions: the context, alternatives, chosen approach, rationale and outcome. Entries help contributors understand the product and engineering constraints behind a change.

Significant architecture decisions also receive a formal [ADR](../adr/README.md). The journal connects requirements, implementation and verification without duplicating the architecture records.

## Entry format

Each entry has a stable ID (`D-<number>`) and the fields relevant to the decision:

| Field                | Meaning                                                         |
| -------------------- | --------------------------------------------------------------- |
| **Context**          | The problem, constraint or requirement being addressed          |
| **Options**          | Alternatives considered and their tradeoffs                     |
| **Decision**         | The selected approach and its status or source                  |
| **Why**              | Supporting evidence, assumptions and unresolved questions       |
| **Action / outcome** | What changed, linked artifacts, verification and remaining work |
| **Lesson**           | A reusable engineering consideration, where useful              |

Historical entries may use **Prompt** for the decision question or **Direction** for a project instruction. Their field names and decision provenance do not prescribe a contributor interaction process.

## Adding entries

Record decisions about product scope, architecture, implementation, security, delivery or operations in the PR that acts on them (WF6). Link the affected requirements, documents and tests. Distinguish proposals from approved requirements, and intended actions from observed results. Report exact verification commands and results in the PR handoff (WF7).

Use one file per day and topic, named `YYYY-MM-DD-<topic>.md`. Dates group files; stable IDs establish the decision sequence within a day. Never renumber or reuse IDs, including gaps left by removed entries.
