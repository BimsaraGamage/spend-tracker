# ADR-0011: Environments, releases and deploy order

- **Status:** Accepted
- **Date:** 2026-10-04
- **Decided by:** maintainer (journal D-11, D-12, D-21, D-22)

## Context

A personal instance must cost $0, and a bad change must never reach real data unreviewed.

## Decision

- **Environments:**
  - **staging** deploys automatically on every merge to `main`;
  - **production** deploys only when a release-please release PR is merged, and only after the maintainer approves.
- **Services:** two free Supabase projects (staging and production), two free PowerSync instances, Cloudflare Workers for the web assets, and EAS Update channels for mobile.
- **Deploy order:** database migrations, then sync config, then web, then mobile update ([DB4](../engineering-standards.md#8-database-and-deploys-db)). Each step must work with the previous version of the next.
- **Releases:** release-please versions releases from Conventional Commit titles.

## Consequences

- Free tiers pause after about 7 idle days, so staging may need an occasional manual un-pause.
- The free Supabase tier has no backups. Encrypted nightly backups are required before any real data goes in ([launch checklist](../operations/launch-checklist.md)).
