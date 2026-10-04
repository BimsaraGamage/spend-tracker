# ADR-0013: License and contributions

- **Status:** Accepted
- **Date:** 2026-10-04
- **Decided by:** maintainer (journal D-17, D-36, D-52)

## Context

The project is public and will ship through app stores. The GPL family conflicts with App Store terms once outside contributions are accepted.

## Decision

- **License:** Apache-2.0. Section 5 makes contributions arrive under the same license ("inbound = outbound"), so there is no CLA and no DCO.
- **Contributions:** bug reports and ideas are welcome now. Code contributions open after the foundation is complete.
- **AI-assisted contributions** are welcome. Naming the tools used is optional, and authors stay responsible for every line.
- **Dependencies** must carry licences compatible with Apache-2.0 distribution, which CI checks.

## Consequences

- Anyone may fork, including commercially.
- Copyleft dependencies need a deliberate exception.
