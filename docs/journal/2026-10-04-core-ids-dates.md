# 2026-10-04 · Phase 1: IDs and dates

### D-112 · UUIDv7 implemented in-house, verified by the RFC test vector (autopilot)

- **Decision:** A small UUIDv7 generator in `packages/core` instead of a dependency, with time and randomness injectable (autopilot).
  - The default random source is `crypto.getRandomValues`. If it's missing, generation fails loudly; it never falls back to `Math.random`.
- **Why:**
  - RFC 9562 fully specifies the format, and about 30 lines cover it (SEC8: no dependency without need).
  - The official test vector in RFC 9562 Appendix A.6 proves the bit layout.
  - Injecting time and randomness keeps tests deterministic (TEST3).
- **Follow-up:** React Native needs a `crypto.getRandomValues` polyfill. That gets wired up with the app.

### D-113 · Calendar dates through Intl, not a date library (autopilot)

- **Decision:** `LocalDate` is a validated "YYYY-MM-DD" string. `localDateIn` uses `Intl.DateTimeFormat` with the ledger's IANA time zone (autopilot).
- **Why:**
  - A transaction's date must not shift when viewed from another zone (DATA3).
  - `Intl` is built into every target engine, so no dependency is needed. The Temporal API isn't available in React Native's Hermes engine yet.
- **Tested:** Midnight in Asia/Colombo (UTC+05:30) to the millisecond, year and month rollovers (including UTC+14), and leap years (including 1900 and 2000).

### D-114 · Input-validation schemas postponed (autopilot)

- **Decision:** No zod schemas for ledgers, accounts or transactions yet (autopilot).
- **Why:** Their fields depend on the functional requirements the maintainer is still writing. Defining them now would invent requirements (WF4). They'll arrive with the data layer, matching the confirmed requirements.
