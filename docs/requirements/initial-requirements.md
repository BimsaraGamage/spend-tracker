# Initial requirements

Status: **draft v0.1** (2026-10-04). These are the foundation requirements from the maintainer's original brief, plus a few proposed by the assistant. The functional requirements (FR) will be added as the maintainer writes them.

Requirement IDs are stable: never renumber or reuse them. Code, tests, pull requests and reviews cite them, for example `Implements FR-SK-3` or `Verifies NFR-SEC-1`.

**Source** column:

- **brief:** stated by the maintainer.
- **decision:** chosen during planning (see the [decision journal](../journal/)).
- **proposed:** suggested by the assistant; needs the maintainer's confirmation before it binds.

## Non-functional requirements

### Platforms and availability

| ID         | Requirement                                                                                                                               | Source          |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| NFR-PLAT-1 | One codebase runs on iOS, Android and current mobile and desktop browsers, with responsive layouts from 360 px wide phones up to desktop. | brief           |
| NFR-PLAT-2 | Usable without running anything on the user's machine: the web app is hosted, and the backend is managed or self-hosted by others.        | brief           |
| NFR-PLAT-3 | Installable as a web app (PWA) now, and from the App Store and Google Play later.                                                         | brief           |
| NFR-OFF-1  | Local-first: every read and write works offline, and offline writes sync automatically and are never lost.                                | decision (D-02) |

### Extensibility and scale

| ID        | Requirement                                                                                                                                       | Source                |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- |
| NFR-EXT-1 | Domain logic lives in platform-independent packages. Features are isolated modules, and new clients (for example, a separate web app) reuse them. | brief                 |
| NFR-EXT-2 | The data model supports full personal finance and shared ledgers without re-keying existing data.                                                 | decision (D-01, D-03) |
| NFR-SCL-1 | Each device syncs only the ledgers its user belongs to, sync filters are indexed, and server cost grows with active users rather than total data. | brief                 |

### Performance

| ID         | Requirement                                                                                                                                                                                                                                                                                                                          | Source   |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- |
| NFR-PERF-1 | A list of 10,000 transactions renders in under 150 ms (95th percentile) on a mid-range Android phone. Web pages reach Largest Contentful Paint within 2.5 s on a first visit over 4G, and within 1 s on repeat visits. A change appears on another online device within 2 s (95th percentile). CI enforces a web bundle-size budget. | proposed |

### Security and privacy

| ID          | Requirement                                                                                                                                                                   | Source                |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- |
| NFR-SEC-1   | Each ledger's data is visible only to its members. Postgres Row Level Security and the sync rules enforce this, and automated tests prove it.                                 | brief                 |
| NFR-SEC-2   | Sign-in by email one-time code, email and password, Google, or Apple, with optional TOTP two-factor authentication.                                                           | decision (D-09)       |
| NFR-SEC-3   | Data is encrypted in transit (TLS) and at rest, on the server and on devices.                                                                                                 | decision (D-10)       |
| NFR-SEC-4   | App lock (biometric or PIN) on mobile, and an inactivity lock on web.                                                                                                         | decision (D-10)       |
| NFR-SEC-5   | A server-side audit log records every ledger change (who, when, before and after). Clients can't write to it.                                                                 | decision (D-10)       |
| NFR-SEC-6   | No financial data or personal data in logs or telemetry. Telemetry can be switched off. No advertising and no third-party analytics.                                          | decision (D-15)       |
| NFR-SEC-7   | Supply-chain safeguards: frozen lockfile, a 3-day minimum age for new package versions, Actions pinned to commit SHAs, CodeQL, secret scanning, and signed commits on `main`. | decision (D-57, D-67) |
| NFR-MONEY-1 | Money is stored as integer minor units with an ISO 4217 currency code. Each account has its own currency, and each ledger has a base currency.                                | decision (D-13)       |

### Quality, openness and operations

| ID         | Requirement                                                                                                                                              | Source          |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| NFR-I18N-1 | All UI text is externalized, and numbers, currency and dates use locale-aware formatting. English at launch.                                             | decision (D-14) |
| NFR-A11Y-1 | Web meets WCAG 2.2 AA. Mobile supports screen-reader labels, dynamic type and sufficient contrast.                                                       | proposed        |
| NFR-QUAL-1 | Engineering standards use stable rule IDs and are enforced by lint, type checks and tests. Every change goes through a pull request with passing checks. | brief           |
| NFR-OSS-1  | A public Apache-2.0 repository with contributor guidelines, issue and PR templates, a security policy and a code of conduct.                             | brief           |
| NFR-OSS-2  | Self-hostable through a documented Docker setup (Supabase and PowerSync Open Edition).                                                                   | decision (D-04) |
| NFR-COST-1 | A personal instance runs at $0/month on free tiers.                                                                                                      | decision (D-12) |
| NFR-REC-1  | Losing any single device, including the maintainer's laptop, loses no data, credentials or access.                                                       | brief           |

## Functional requirements

To be supplied by the maintainer. The walking skeleton needs only these three:

| ID      | Requirement                                                                                                   | Source          |
| ------- | ------------------------------------------------------------------------------------------------------------- | --------------- |
| FR-SK-1 | A user can sign in with an email one-time code, or with an email and password.                                | decision (D-29) |
| FR-SK-2 | On first run, the user chooses a base currency. This creates a personal ledger with a "Cash" account.         | decision (D-29) |
| FR-SK-3 | The user can add and list transactions while offline; they sync to the user's other devices when back online. | decision (D-29) |

## Glossary

| Term          | Meaning                                                                                                                           |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Ledger        | A container of financial data (accounts, transactions, budgets) shared by its members. Every user has at least a personal ledger. |
| Member        | A user's role in a ledger: owner, editor or viewer.                                                                               |
| Account       | Where money is held, such as cash, a bank account or a card. Each account has one currency.                                       |
| Transaction   | A dated money movement on an account: positive for money in, negative for money out.                                              |
| Transfer      | Movement between two accounts, recorded as two linked transactions.                                                               |
| Base currency | The ledger currency that totals and reports are expressed in.                                                                     |
| Minor unit    | The smallest currency unit (cents for USD, cents for LKR). Amounts are stored as whole numbers of minor units.                    |
| Local-first   | The app reads and writes a database on the device; sync with the server happens in the background.                                |
