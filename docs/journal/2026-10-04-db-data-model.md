# 2026-10-04 · Phase 1: the ledger data model

### D-125 · Data model choices (autopilot)

- **Decision:** Four tables: `ledgers` (the root), `ledger_members`, `accounts` and `transactions` (autopilot).
  - **Rules in the database (DATA5):**
    - composite foreign keys make "another ledger's account" and "a currency other than the account's" impossible to store;
    - CHECK constraints bound amounts to the JavaScript safe-integer range and currency codes to three uppercase letters;
    - a trigger rejects unknown time zones;
    - another trigger keeps identity columns immutable (ids, `ledger_id`, `created_by`, `created_at`, and an account's currency).
  - **Roles** are `text` with a CHECK constraint, not a Postgres enum. Enums can't drop or rename values easily, and they reach the device's SQLite as text anyway.
  - **Owner membership:** a security-definer trigger makes the ledger's creator its owner, because clients may not insert memberships themselves. The row gets a server-generated UUID (v4, since `uuidv7()` arrives in Postgres 18).
  - **Ledgers are the root:** their own `id` is the ledger id, so they carry no separate `ledger_id` column (a documented exception to SYNC1).
  - **Errors** use SQL states the app classifies as permanent rejections (`23xxx` and `22023`, see SYNC3).
- **Provisional:** name (80) and description (200) length limits, until the functional requirements arrive (WF4).
- **Deferred:** a `currencies` reference table generated from the same ISO 4217 data. Currency codes are checked for format only for now.

### D-126 · Deny by default, then open up (autopilot)

- **Decision:** (autopilot)
  - **No policies yet:** the tables arrive with row level security on and no policies, so clients can't read or write anything until the access rules (next PR) and their tests exist.
  - **Privileges:** anonymous users lose every privilege on these tables. Signed-in users lose DELETE (deletion is soft, DATA6), TRUNCATE (it isn't subject to RLS), REFERENCES and TRIGGER.
  - **Guard:** a database-wide pgTAP check enforces the privilege rules for every public table. It proves it can fail with a probe table that keeps Supabase's default grants.
- **Why:** There's never a window where data is reachable without tested rules. Supabase grants every new table to the client roles by default, so taking privileges back must be deliberate and checked.
