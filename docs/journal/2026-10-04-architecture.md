# 2026-10-04 · Architecture overview and threat model

### D-99 · Diagrams as Mermaid text (autopilot)

- **Decision:** Draw architecture diagrams as Mermaid code blocks inside the Markdown (autopilot).
- **Why:** GitHub renders Mermaid natively, and as plain text the diagrams change in pull requests like code. Images drift out of date and can't be reviewed line by line.

### D-100 · Threat model format (autopilot)

- **Decision:** Use STRIDE (spoofing, tampering, repudiation, information disclosure, denial of service, elevation of privilege). Each threat gets a concrete example, a mitigation and the rule IDs that enforce it. A list of accepted risks closes the model, and it is revisited before inviting other users (autopilot).
- **Why:** STRIDE covers the threat categories systematically. Linking each threat to rule IDs turns the model into something reviews can check, not just a document.
- **Lesson:** A threat model is only useful if every mitigation points to something enforceable: a rule, a test, a setting.
