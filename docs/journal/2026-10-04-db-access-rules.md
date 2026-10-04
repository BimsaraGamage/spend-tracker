# 2026-10-04 · Phase 1: access rules (row level security)

### D-127 · Access rules for ledger data (autopilot)

- **Decision:** One hardened helper, `private.has_ledger_role(ledger, roles)`, backs every policy (autopilot).
  - It's security-definer with an empty `search_path`, so policies don't recurse into `ledger_members`' own RLS.
  - It's the only internal function signed-in users may execute; the guard's allowlist names it.
  - It counts only active memberships of active ledgers.
- **The rules:**
  - **viewers** read;
  - **editors and owners** add and change accounts and transactions, and record transactions only in their own name;
  - **owners** rename or soft-delete the ledger;
  - **anyone signed in** creates ledgers, as themselves only;
  - **memberships** are read-only for clients until sharing exists;
  - **a soft-deleted ledger** hides all its data;
  - **hard deletes** aren't possible, since DELETE isn't granted.
- **Why:**
  - The rules follow ADR-0005 directly.
  - Leaving out the membership write rules removes the riskiest surface (self-promotion to a ledger) until the sharing feature designs it properly.
  - `(select auth.uid())` lets Postgres evaluate the user once per query, not once per row.

### D-128 · Proving isolation with tests that act as real users (autopilot)

- **Decision:** `020_access_rules.test.sql` acts as users the way Supabase does for API requests: a JWT claim, plus the `authenticated` or `anon` role. Every rule gets an allowed path and a denied path (autopilot). It checks that:
  - another user can't read, insert, update, impersonate or join a ledger;
  - a viewer can't write;
  - anonymous users get nothing;
  - hard deletes fail;
  - soft-deleted ledgers vanish.
- **Why:** NFR-SEC-1 requires isolation that is _proven_. Denied updates are checked by reading the stored value afterwards as the database owner, because RLS silently skips rows rather than raising an error (TEST4: don't trust what you can't observe).
