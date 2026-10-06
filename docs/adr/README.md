# Architecture decision records

Significant, hard-to-reverse decisions about the system's structure ([ARC4](../engineering-standards.md#3-architecture-arc)). Every other decision, including these ones in more detail, is in the [decision journal](../journal/).

- An accepted ADR is never edited in substance. To change a decision, write a new ADR that supersedes it, and set the old one's status to "Superseded by ADR-NNNN", or "Accepted, partly superseded by ADR-NNNN" when only some of it changes.
- Each ADR links to the journal entries where it was decided.

| ADR                                             | Decision                                            | Status                              |
| ----------------------------------------------- | --------------------------------------------------- | ----------------------------------- |
| [0001](0001-record-architecture-decisions.md)   | Record architecture decisions                       | Accepted                            |
| [0002](0002-monorepo-pnpm-turborepo.md)         | Monorepo with pnpm workspaces and Turborepo         | Accepted                            |
| [0003](0003-expo-universal-client.md)           | One Expo codebase for iOS, Android and web          | Accepted                            |
| [0004](0004-local-first-powersync-supabase.md)  | Local-first with PowerSync and Supabase             | Accepted                            |
| [0005](0005-ledger-tenancy-and-rls.md)          | Ledgers with members, isolated by RLS               | Accepted                            |
| [0006](0006-money-and-currency.md)              | Money as integer minor units, multi-currency        | Accepted                            |
| [0007](0007-ids-and-synced-table-shape.md)      | Device-generated IDs and a fixed synced-table shape | Accepted, partly superseded by 0014 |
| [0008](0008-write-path-and-conflicts.md)        | Write path, upload errors and conflicts             | Accepted, partly superseded by 0014 |
| [0009](0009-authentication-and-sessions.md)     | Authentication and sessions                         | Accepted                            |
| [0010](0010-device-encryption-and-app-lock.md)  | Encrypted device database and app lock              | Accepted                            |
| [0011](0011-environments-and-deploy-order.md)   | Environments, releases and deploy order             | Accepted                            |
| [0012](0012-telemetry-and-privacy.md)           | Telemetry and privacy                               | Accepted                            |
| [0013](0013-license-and-contributions.md)       | License and contributions                           | Accepted                            |
| [0014](0014-upload-inserts-and-sync-indexes.md) | Plain inserts for uploads, no sync-filter indexes   | Accepted                            |
| [0015](0015-translations-with-i18next.md)       | Translations with i18next                           | Accepted                            |
| [0016](0016-styling-with-uniwind.md)            | Styling with Uniwind and React Native Reusables     | Accepted                            |
