# spend-tracker

A local-first, privacy-respecting personal finance tracker for iOS, Android and the web.

> **Status: pre-alpha.** The foundation is being built in the open. The app isn't ready for real financial data yet.
> `spend-tracker` is a working name.

## Why another finance app?

- **Works offline, feels instant.** Your data lives on your device first, and every screen reads from a local database. Changes sync in the background when you're online.
- **Your data stays yours.** Each ledger is isolated at the database level, financial data is never sent to analytics, and you can run your own backend.
- **One app everywhere.** The same codebase runs on Android, iOS and in any modern browser, where you can install it as an app.
- **Built for real-world money.** Accounts in different currencies, a base currency per ledger, and exact integer arithmetic (no floating-point rounding errors).
- **Open source.** Apache-2.0, developed in public with documented engineering standards.

## Planned scope

Accounts, transactions, transfers, categories, budgets, recurring items, savings goals and shared ledgers (for example, a household budget), delivered incrementally. The detailed functional requirements are being written now.

## Technology

| Layer                   | Choice                                                               |
| ----------------------- | -------------------------------------------------------------------- |
| App (iOS, Android, web) | [Expo](https://expo.dev) / React Native, TypeScript, Expo Router     |
| On-device database      | SQLite (encrypted on mobile)                                         |
| Sync                    | [PowerSync](https://www.powersync.com)                               |
| Backend                 | [Supabase](https://supabase.com): Postgres, Auth, Row Level Security |
| Web hosting             | Cloudflare Workers (static assets)                                   |
| Monorepo                | pnpm workspaces + Turborepo                                          |

## Roadmap

1. **Foundation:** repository, standards, CI/CD and security automation.
2. **Walking skeleton:** sign-in, a personal ledger, and offline transactions syncing between phone and browser.
3. **Security baseline and backups:** app lock, MFA and encrypted backups. Required before any real data goes in.
4. **MVP:** the core personal-finance features.
5. **Public readiness:** custom domain and email, privacy policy, account deletion, self-hosting guide.
6. **App stores:** Google Play and the App Store.

## Contributing

Bug reports, questions and ideas are welcome now. Code contributions will open once the foundation settles. See [CONTRIBUTING.md](CONTRIBUTING.md) and the [Code of Conduct](CODE_OF_CONDUCT.md).

## Security

Please report vulnerabilities privately, as described in [SECURITY.md](SECURITY.md). Don't open a public issue.

## License

[Apache License 2.0](LICENSE)
