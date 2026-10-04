# ADR-0002: Monorepo with pnpm workspaces and Turborepo

- **Status:** Accepted
- **Date:** 2026-10-04
- **Decided by:** maintainer (journal D-07, D-55, D-57)

## Context

One app serves three platforms. Domain logic must be shared, and testable without UI. A separate web app or a docs site may follow.

## Decision

- **Packages:** a pnpm 11 workspace with `apps/*` for applications and `packages/*` for shared code.
- **Pinning:** pnpm comes through Corepack with an integrity hash. Versions are defined once in a pnpm catalog.
- **Supply-chain settings:** new versions must be at least 3 days old, no git or tarball sub-dependencies, and install scripts run only when allow-listed.
- **Tasks:** Turborepo runs `lint`, `typecheck`, `test` and `build`, and caches unchanged packages.

## Consequences

- Package boundaries make the dependency direction enforceable ([ARC1](../engineering-standards.md#3-architecture-arc)).
- pnpm's isolated installs are supported by Expo since SDK 54. If a React Native library breaks under them, fall back to `nodeLinker: hoisted`.
- pnpm 12, a Rust rewrite, waits until Expo tooling is proven with it.

## Alternatives considered

- **A single app with folders:** simpler at first, but boundaries are convention only.
- **Nx:** stronger generators and boundary rules, but heavier to learn and run.
