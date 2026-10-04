/**
 * What each user's devices receive (NFR-SEC-1, SYNC6, ADR-0005).
 *
 * Runs against the local stack: `supabase start`, then ./powersync/up.sh.
 * Every test creates its own users, so the tests don't depend on each other.
 */
import { uuidv7 } from "@spend-tracker/core";
import { AppSchema } from "@spend-tracker/data";
import { describe, expect, test, vi } from "vitest";

import {
  createUser,
  forgeToken,
  insertRow,
  openSyncStream,
  type SyncedData,
  syncAs,
  type TestUser,
  updateRow,
} from "./stack";

const syncedTables = [
  "ledgers",
  "ledger_members",
  "accounts",
  "transactions",
] as const;

interface Ledger {
  readonly ledgerId: string;
  readonly accountId: string;
  readonly transactionId: string;
}

/** A ledger with one account and one transaction, created by its owner. */
async function createLedger(owner: TestUser): Promise<Ledger> {
  const ledger = {
    ledgerId: uuidv7(),
    accountId: uuidv7(),
    transactionId: uuidv7(),
  };
  await insertRow(owner, "ledgers", {
    id: ledger.ledgerId,
    name: "Personal",
    base_currency: "LKR",
    time_zone: "Asia/Colombo",
    created_by: owner.id,
  });
  await insertRow(owner, "accounts", {
    id: ledger.accountId,
    ledger_id: ledger.ledgerId,
    name: "Cash",
    currency: "LKR",
  });
  await insertRow(owner, "transactions", {
    id: ledger.transactionId,
    ledger_id: ledger.ledgerId,
    account_id: ledger.accountId,
    amount_minor: -125_000,
    currency: "LKR",
    occurred_on: "2026-10-04",
    description: "Groceries",
    created_by: owner.id,
  });
  return ledger;
}

/** The ids of the rows a device holds in `table`, sorted. */
function idsIn(synced: SyncedData, table: string): string[] {
  return [...(synced.get(table)?.keys() ?? [])].sort();
}

/** Syncs as the user until `check` passes, because replication takes a moment. */
async function syncUntil(
  user: TestUser,
  check: (synced: SyncedData) => void,
): Promise<void> {
  await vi.waitFor(
    async () => {
      check(await syncAs(user));
    },
    { timeout: 20_000, interval: 250 },
  );
}

/** Expects the device to hold exactly this ledger, its owner's membership, its account and its transaction. */
function expectOnly(synced: SyncedData, ledger: Ledger, owner: TestUser): void {
  expect(idsIn(synced, "ledgers")).toEqual([ledger.ledgerId]);
  expect(idsIn(synced, "accounts")).toEqual([ledger.accountId]);
  expect(idsIn(synced, "transactions")).toEqual([ledger.transactionId]);
  const members = [...(synced.get("ledger_members")?.values() ?? [])];
  expect(members).toEqual([
    expect.objectContaining({
      ledger_id: ledger.ledgerId,
      user_id: owner.id,
      role: "owner",
    }),
  ]);
}

describe("Sync Streams", () => {
  test("a user's devices receive their ledger, with its members, accounts and transactions", async () => {
    const alice = await createUser();
    const ledger = await createLedger(alice);

    await syncUntil(alice, (synced) => {
      expectOnly(synced, ledger, alice);
    });
  });

  test("nothing from another user's ledger reaches a user's devices", async () => {
    const [alice, bob] = await Promise.all([createUser(), createUser()]);
    const [alicesLedger, bobsLedger] = await Promise.all([
      createLedger(alice),
      createLedger(bob),
    ]);

    // Wait until both ledgers have replicated, so the checks below can't pass
    // just because the other ledger hasn't arrived yet.
    await syncUntil(alice, (synced) => {
      expect(idsIn(synced, "ledgers")).toEqual([alicesLedger.ledgerId]);
    });
    await syncUntil(bob, (synced) => {
      expect(idsIn(synced, "ledgers")).toEqual([bobsLedger.ledgerId]);
    });

    expectOnly(await syncAs(alice), alicesLedger, alice);
    expectOnly(await syncAs(bob), bobsLedger, bob);
  });

  test("devices receive exactly the columns of the device schema, in the types the app expects", async () => {
    const alice = await createUser();
    const ledger = await createLedger(alice);

    await syncUntil(alice, (synced) => {
      // The device schema in packages/data is the contract: no column more,
      // none less, and never deleted_at.
      for (const { name, columns, localOnly } of AppSchema.tables) {
        if (localOnly) {
          continue;
        }
        const rows = [...(synced.get(name)?.values() ?? [])];
        expect(rows.length, name).toBeGreaterThan(0);
        for (const row of rows) {
          expect(Object.keys(row).sort(), name).toEqual(
            ["id", ...columns.map((column) => column.name)].sort(),
          );
        }
      }
      expect(
        synced.get("transactions")?.get(ledger.transactionId),
      ).toMatchObject({
        ledger_id: ledger.ledgerId,
        account_id: ledger.accountId,
        // An integer number of minor units, never text or a fraction (DATA1).
        amount_minor: -125_000,
        currency: "LKR",
        // A calendar date, never a timestamp (DATA3).
        occurred_on: "2026-10-04",
        description: "Groceries",
        created_by: alice.id,
      });
    });
  });

  test("a soft-deleted transaction leaves the user's devices", async () => {
    const alice = await createUser();
    const ledger = await createLedger(alice);
    await syncUntil(alice, (synced) => {
      expect(idsIn(synced, "transactions")).toEqual([ledger.transactionId]);
    });

    await updateRow(alice, "transactions", ledger.transactionId, {
      deleted_at: new Date().toISOString(),
    });

    await syncUntil(alice, (synced) => {
      expect(idsIn(synced, "transactions")).toEqual([]);
      expect(idsIn(synced, "accounts")).toEqual([ledger.accountId]);
    });
  });

  test("a soft-deleted ledger leaves the user's devices with all its data", async () => {
    const alice = await createUser();
    const ledger = await createLedger(alice);
    await syncUntil(alice, (synced) => {
      expect(idsIn(synced, "ledgers")).toEqual([ledger.ledgerId]);
    });

    await updateRow(alice, "ledgers", ledger.ledgerId, {
      deleted_at: new Date().toISOString(),
    });

    await syncUntil(alice, (synced) => {
      for (const table of syncedTables) {
        expect(idsIn(synced, table)).toEqual([]);
      }
    });
  });

  test("a sync request without a genuine session is refused", async () => {
    const alice = await createUser();

    for (const token of ["not-a-token", forgeToken(alice.id)]) {
      const response = await openSyncStream(token);
      await response.text();
      expect(response.status).toBe(401);
    }
  });
});
