# ADR-0006: Money as integer minor units, multi-currency

- **Status:** Accepted
- **Date:** 2026-10-04
- **Decided by:** maintainer (journal D-13)

## Context

Floating-point arithmetic loses cents. Users hold accounts in different currencies, for example a local bank account and a foreign card.

## Decision

- **Amounts:** integer minor units (`amount_minor`, `bigint` in Postgres) plus an ISO 4217 currency code. TypeScript checks amounts with `Number.isSafeInteger`.
- **Currencies:** each account has exactly one currency, and a transaction always uses its account's currency. A composite foreign key on `(account_id, currency)` enforces this.
- **Totals:** each ledger has a base currency for totals. Converting into it records the rate, its source and its date.
- **Arithmetic and formatting** go through `packages/core` helpers. Display uses `Intl.NumberFormat` with the currency's minor-unit digits.

## Consequences

- Exact sums, and currency mismatches rejected by the database.
- Exchange rates become a feature with their own data, rather than a hidden assumption.

## Alternatives considered

- **One currency per ledger:** simpler maths, but a second currency would need a second ledger.
- **One currency everywhere:** excludes users with foreign accounts.
