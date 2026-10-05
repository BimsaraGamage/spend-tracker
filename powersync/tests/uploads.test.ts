/**
 * What happens to the changes a device makes (SYNC2, SYNC3, ADR-0008,
 * ADR-0014).
 *
 * The app's upload connector sends them through the real REST API as the
 * user, against the local stack: `supabase start`, then ./powersync/up.sh.
 * Only the device database is simulated: it hands the connector one queued
 * transaction and records what the connector writes back.
 */
import { type CrudEntry, CrudTransaction, UpdateType } from "@powersync/common";
import { uuidv7 } from "@spend-tracker/core";
import { AppSchema, SupabaseConnector } from "@spend-tracker/data";
import { describe, expect, test, vi } from "vitest";

import {
  createUser,
  type SyncedData,
  supabaseAs,
  syncAs,
  type TestUser,
} from "./stack";

let nextClientId = 1;

/**
 * A change from the device's upload queue. As on a real device, it can only
 * hold columns of the device schema.
 */
function queued(
  op: UpdateType,
  table: string,
  id: string,
  opData?: Record<string, unknown>,
): CrudEntry {
  const columns = AppSchema.tables
    .find(({ name }) => name === table)
    ?.columns.map(({ name }) => name);
  for (const column of Object.keys(opData ?? {})) {
    if (!columns?.includes(column)) {
      throw new Error(`The device schema has no column ${table}.${column}`);
    }
  }
  return {
    clientId: nextClientId++,
    op,
    table,
    id,
    ...(opData === undefined ? {} : { opData }),
    toJSON: () => ({}),
    equals: () => false,
    toComparisonArray: () => [],
  };
}

/** Uploads one transaction of changes as the user, as the app would. */
async function upload(user: TestUser, changes: CrudEntry[]) {
  const rejections: unknown[][] = [];
  let completed = false;
  const connector = new SupabaseConnector({
    supabase: supabaseAs(user),
    powerSyncUrl: "http://127.0.0.1:8080",
  });
  await connector.uploadData({
    getNextCrudTransaction: () =>
      Promise.resolve(
        new CrudTransaction(changes, () => {
          completed = true;
          return Promise.resolve();
        }),
      ),
    execute: (_sql: string, params: unknown[]) => {
      rejections.push(params);
      return Promise.resolve();
    },
  });
  return { completed, rejections };
}

/** A new ledger with one account and one transaction, as the device creates them. */
function newLedger(owner: TestUser) {
  const ids = { ledger: uuidv7(), account: uuidv7(), transaction: uuidv7() };
  const changes = [
    queued(UpdateType.PUT, "ledgers", ids.ledger, {
      name: "Personal",
      base_currency: "LKR",
      time_zone: "Asia/Colombo",
      created_by: owner.id,
    }),
    queued(UpdateType.PUT, "accounts", ids.account, {
      ledger_id: ids.ledger,
      name: "Cash",
      currency: "LKR",
    }),
    queued(UpdateType.PUT, "transactions", ids.transaction, {
      ledger_id: ids.ledger,
      account_id: ids.account,
      amount_minor: -125_000,
      currency: "LKR",
      occurred_on: "2026-10-04",
      description: "Groceries",
      created_by: owner.id,
    }),
  ];
  return { ids, changes };
}

function idsIn(synced: SyncedData, table: string): string[] {
  return [...(synced.get(table)?.keys() ?? [])].sort();
}

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

describe("uploads", () => {
  test("a ledger created on the device reaches the server and syncs back, and uploading it again is harmless", async () => {
    const alice = await createUser();
    const { ids, changes } = newLedger(alice);

    // The second upload stands for a retry after a lost response (SYNC2).
    for (const attempt of [1, 2]) {
      expect(await upload(alice, changes), `upload ${String(attempt)}`).toEqual(
        { completed: true, rejections: [] },
      );
    }

    await syncUntil(alice, (synced) => {
      expect(idsIn(synced, "ledgers")).toEqual([ids.ledger]);
      expect(idsIn(synced, "accounts")).toEqual([ids.account]);
      expect(idsIn(synced, "transactions")).toEqual([ids.transaction]);
    });
  });

  test("a change the database refuses is recorded on the device, and the rest still uploads (SYNC3)", async () => {
    const alice = await createUser();
    const { ids, changes } = newLedger(alice);
    await upload(alice, changes);
    const refused = uuidv7();
    const accepted = uuidv7();

    const result = await upload(alice, [
      // Currency codes are three capital letters.
      queued(UpdateType.PUT, "accounts", refused, {
        ledger_id: ids.ledger,
        name: "Broken",
        currency: "lkr",
      }),
      queued(UpdateType.PUT, "accounts", accepted, {
        ledger_id: ids.ledger,
        name: "Bank",
        currency: "LKR",
      }),
    ]);

    expect(result.completed).toBe(true);
    expect(result.rejections).toEqual([
      expect.arrayContaining(["accounts", refused, "PUT", "23514"]),
    ]);
    await syncUntil(alice, (synced) => {
      expect(idsIn(synced, "accounts")).toEqual([ids.account, accepted].sort());
    });
  });

  test("an update to another user's row changes nothing, and is recorded as not applied", async () => {
    const [alice, bob] = await Promise.all([createUser(), createUser()]);
    const { ids, changes } = newLedger(alice);
    await upload(alice, changes);

    const result = await upload(bob, [
      queued(UpdateType.PATCH, "accounts", ids.account, { name: "Mine now" }),
    ]);

    expect(result.rejections).toEqual([
      expect.arrayContaining(["accounts", ids.account, "PATCH", "not_applied"]),
    ]);
    await syncUntil(alice, (synced) => {
      expect(synced.get("accounts")?.get(ids.account)).toMatchObject({
        name: "Cash",
      });
    });
  });

  test("a month's plan from the device uploads with its tag lists as JSON, and syncs back (D-175)", async () => {
    const alice = await createUser();
    const { ids, changes } = newLedger(alice);
    const plan = {
      tag: uuidv7(),
      costType: uuidv7(),
      fixedCost: uuidv7(),
      payment: uuidv7(),
      budget: uuidv7(),
    };
    // The device stores a tag list as JSON text.
    const tagIds = JSON.stringify([plan.tag]);

    const result = await upload(alice, [
      ...changes,
      queued(UpdateType.PUT, "tags", plan.tag, {
        ledger_id: ids.ledger,
        name: "Home",
        created_by: alice.id,
      }),
      queued(UpdateType.PUT, "cost_types", plan.costType, {
        ledger_id: ids.ledger,
        name: "Rent",
        tag_ids: tagIds,
        created_by: alice.id,
      }),
      queued(UpdateType.PUT, "fixed_obligations", plan.fixedCost, {
        ledger_id: ids.ledger,
        month: "2026-10",
        cost_type_id: plan.costType,
        amount_minor: 90_000,
        currency: "LKR",
        due_day: 20,
        created_by: alice.id,
      }),
      queued(UpdateType.PUT, "actual_costs", plan.payment, {
        ledger_id: ids.ledger,
        month: "2026-10",
        cost_type_id: plan.costType,
        amount_minor: 40_000,
        currency: "LKR",
        tag_ids: tagIds,
        note: "",
        date: "2026-10-18",
        fixed_obligation_id: plan.fixedCost,
        created_by: alice.id,
      }),
      queued(UpdateType.PUT, "monthly_budgets", plan.budget, {
        ledger_id: ids.ledger,
        month: "2026-10",
        amount_minor: 300_000,
        currency: "LKR",
        created_by: alice.id,
      }),
    ]);

    expect(result).toEqual({ completed: true, rejections: [] });
    await syncUntil(alice, (synced) => {
      expect(idsIn(synced, "monthly_budgets")).toEqual([plan.budget]);
      const payment = synced.get("actual_costs")?.get(plan.payment);
      expect(payment).toMatchObject({ fixed_obligation_id: plan.fixedCost });
      expect(JSON.parse(String(payment?.["tag_ids"]))).toEqual([plan.tag]);
    });
  });

  test("a delete on the device becomes a soft delete, and the row leaves the user's devices (DATA6)", async () => {
    const alice = await createUser();
    const { ids, changes } = newLedger(alice);
    await upload(alice, changes);
    await syncUntil(alice, (synced) => {
      expect(idsIn(synced, "transactions")).toEqual([ids.transaction]);
    });

    const result = await upload(alice, [
      queued(UpdateType.DELETE, "transactions", ids.transaction),
    ]);

    expect(result).toEqual({ completed: true, rejections: [] });
    await syncUntil(alice, (synced) => {
      expect(idsIn(synced, "transactions")).toEqual([]);
    });
  });
});
