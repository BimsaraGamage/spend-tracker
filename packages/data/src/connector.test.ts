import { UpdateType } from "@powersync/common";
import { describe, expect, test } from "vitest";

import { SupabaseConnector, UploadRetryError } from "./connector";
import {
  change,
  deviceDatabase,
  postgrestError,
  type Reply,
  rowsChanged,
  scriptedFetch,
  supabaseClient,
  supabaseUrl,
} from "./test-support/fakes";

const powerSyncUrl = "http://powersync.test";
const now = new Date("2026-10-04T10:00:00.000Z");

function connectorWith(replies: Reply[] = []) {
  const network = scriptedFetch(replies);
  const connector = new SupabaseConnector({
    supabase: supabaseClient(network.fetch),
    powerSyncUrl,
    now: () => now,
  });
  return { connector, sent: network.sent };
}

describe("fetchCredentials", () => {
  test("returns nothing when nobody is signed in", async () => {
    const { connector } = connectorWith();

    await expect(connector.fetchCredentials()).resolves.toBeNull();
  });

  test("throws when an expired session can't be refreshed", async () => {
    const network = scriptedFetch([
      Response.json(
        {
          code: 400,
          error_code: "refresh_token_not_found",
          msg: "Invalid Refresh Token: Refresh Token Not Found",
        },
        { status: 400 },
      ),
    ]);
    const connector = new SupabaseConnector({
      supabase: supabaseClient(network.fetch, {
        accessToken: "expired-jwt",
        expired: true,
      }),
      powerSyncUrl,
    });

    await expect(connector.fetchCredentials()).rejects.toThrow();
    expect(network.sent[0]?.url.pathname).toBe("/auth/v1/token");
  });

  test("hands PowerSync the signed-in user's session", async () => {
    const network = scriptedFetch();
    const connector = new SupabaseConnector({
      supabase: supabaseClient(network.fetch, { accessToken: "user-jwt" }),
      powerSyncUrl,
    });

    await expect(connector.fetchCredentials()).resolves.toEqual({
      endpoint: powerSyncUrl,
      token: "user-jwt",
    });
  });
});

describe("uploadData", () => {
  test("does nothing when the queue is empty", async () => {
    const { connector, sent } = connectorWith();
    const device = deviceDatabase(null);

    await connector.uploadData(device.database);

    expect(sent).toEqual([]);
  });

  test("uploads a new row as a plain insert, without the columns the server maintains", async () => {
    const { connector, sent } = connectorWith();
    const device = deviceDatabase([
      change(1, UpdateType.PUT, "accounts", "a-1", {
        ledger_id: "l-1",
        name: "Cash",
        currency: "LKR",
        created_at: "2026-10-04T09:00:00.000Z",
        updated_at: "2026-10-04T09:00:00.000Z",
      }),
    ]);

    await connector.uploadData(device.database);

    expect(sent).toHaveLength(1);
    expect(sent[0]?.method).toBe("POST");
    expect(sent[0]?.url.href).toBe(`${supabaseUrl}/rest/v1/accounts`);
    // Not an upsert: no merge or ignore resolution.
    expect(sent[0]?.headers.get("Prefer") ?? "").not.toContain("resolution");
    expect(sent[0]?.body).toEqual({
      id: "a-1",
      ledger_id: "l-1",
      name: "Cash",
      currency: "LKR",
    });
    expect(device.timesCompleted()).toBe(1);
  });

  test("an insert that already arrived counts as applied, so a retry is harmless (SYNC2)", async () => {
    const { connector } = connectorWith([
      postgrestError(
        409,
        "23505",
        'duplicate key value violates unique constraint "ledgers_pkey"',
      ),
    ]);
    const device = deviceDatabase([
      change(1, UpdateType.PUT, "ledgers", "l-1", { name: "Personal" }),
    ]);

    await connector.uploadData(device.database);

    expect(device.executed).toEqual([]);
    expect(device.timesCompleted()).toBe(1);
  });

  test("uploads changed columns as an update of that row, counting the rows changed", async () => {
    const { connector, sent } = connectorWith([rowsChanged(1)]);
    const device = deviceDatabase([
      change(1, UpdateType.PATCH, "transactions", "t-1", {
        amount_minor: -1500,
        updated_at: "2026-10-04T09:00:00.000Z",
      }),
    ]);

    await connector.uploadData(device.database);

    expect(sent[0]?.method).toBe("PATCH");
    expect(sent[0]?.url.pathname).toBe("/rest/v1/transactions");
    expect(sent[0]?.url.searchParams.get("id")).toBe("eq.t-1");
    expect(sent[0]?.headers.get("Prefer")).toContain("count=exact");
    expect(sent[0]?.body).toEqual({ amount_minor: -1500 });
    expect(device.executed).toEqual([]);
    expect(device.timesCompleted()).toBe(1);
  });

  test("uploads a tag list as JSON, not as the text the device stores (D-175)", async () => {
    const { connector, sent } = connectorWith([
      new Response(null, { status: 201 }),
      rowsChanged(1),
    ]);
    const device = deviceDatabase([
      change(1, UpdateType.PUT, "actual_costs", "c-1", {
        ledger_id: "l-1",
        tag_ids: '["t-1","t-2"]',
      }),
      change(2, UpdateType.PATCH, "cost_types", "ct-1", { tag_ids: "[]" }),
    ]);

    await connector.uploadData(device.database);

    expect(sent[0]?.body).toEqual({
      id: "c-1",
      ledger_id: "l-1",
      tag_ids: ["t-1", "t-2"],
    });
    expect(sent[1]?.body).toEqual({ tag_ids: [] });
    expect(device.executed).toEqual([]);
    expect(device.timesCompleted()).toBe(1);
  });

  test("refuses a tag list that isn't JSON without sending it, and moves on (SYNC3)", async () => {
    const { connector, sent } = connectorWith();
    const device = deviceDatabase([
      change(5, UpdateType.PUT, "cost_types", "ct-1", {
        name: "Rent",
        tag_ids: "Home, Essential",
      }),
      change(6, UpdateType.PATCH, "cost_types", "ct-2", { tag_ids: "[" }),
    ]);

    await connector.uploadData(device.database);

    expect(sent).toEqual([]);
    expect(device.executed.map(({ params }) => params.slice(0, 6))).toEqual([
      [
        "upload-5",
        "cost_types",
        "ct-1",
        "PUT",
        JSON.stringify({ name: "Rent", tag_ids: "Home, Essential" }),
        "invalid_json",
      ],
      [
        "upload-6",
        "cost_types",
        "ct-2",
        "PATCH",
        JSON.stringify({ tag_ids: "[" }),
        "invalid_json",
      ],
    ]);
    expect(device.timesCompleted()).toBe(1);
  });

  test("an update that changes only server-maintained columns sends nothing", async () => {
    const { connector, sent } = connectorWith();
    const device = deviceDatabase([
      change(1, UpdateType.PATCH, "accounts", "a-1", {
        updated_at: "2026-10-04T09:00:00.000Z",
      }),
    ]);

    await connector.uploadData(device.database);

    expect(sent).toEqual([]);
    expect(device.timesCompleted()).toBe(1);
  });

  test("turns a delete into a soft delete (DATA6)", async () => {
    // Zero rows changed: the row is already gone for this user, which is
    // what the delete asked for.
    const { connector, sent } = connectorWith([rowsChanged(0)]);
    const device = deviceDatabase([
      change(1, UpdateType.DELETE, "transactions", "t-1"),
    ]);

    await connector.uploadData(device.database);

    expect(sent[0]?.method).toBe("PATCH");
    expect(sent[0]?.url.searchParams.get("id")).toBe("eq.t-1");
    expect(sent[0]?.body).toEqual({ deleted_at: now.toISOString() });
    expect(device.executed).toEqual([]);
    expect(device.timesCompleted()).toBe(1);
  });

  test("records a refused change on the device and moves on, so the queue never blocks (SYNC3)", async () => {
    const { connector, sent } = connectorWith([
      postgrestError(
        403,
        "42501",
        'new row violates row-level security policy for table "accounts"',
      ),
      rowsChanged(1),
    ]);
    const device = deviceDatabase([
      change(7, UpdateType.PUT, "accounts", "a-1", { name: "Cash" }),
      change(8, UpdateType.PATCH, "accounts", "a-2", { name: "Bank" }),
    ]);

    await connector.uploadData(device.database);

    expect(sent).toHaveLength(2);
    expect(device.executed).toHaveLength(1);
    expect(device.executed[0]?.sql).toContain("INSERT INTO upload_rejections");
    expect(device.executed[0]?.params).toEqual([
      "upload-7",
      "accounts",
      "a-1",
      "PUT",
      JSON.stringify({ name: "Cash" }),
      "42501",
      'new row violates row-level security policy for table "accounts"',
      now.toISOString(),
      "upload-7",
    ]);
    expect(device.timesCompleted()).toBe(1);
  });

  test("records an update the database refused", async () => {
    const { connector } = connectorWith([
      postgrestError(400, "23514", "accounts.currency cannot be changed"),
    ]);
    const device = deviceDatabase([
      change(4, UpdateType.PATCH, "accounts", "a-1", { currency: "USD" }),
    ]);

    await connector.uploadData(device.database);

    expect(device.executed[0]?.params).toEqual(
      expect.arrayContaining(["upload-4", "accounts", "PATCH", "23514"]),
    );
    expect(device.timesCompleted()).toBe(1);
  });

  test("retries a soft delete that didn't reach the server", async () => {
    const { connector } = connectorWith(["network failure"]);
    const device = deviceDatabase([
      change(1, UpdateType.DELETE, "transactions", "t-1"),
    ]);

    await expect(connector.uploadData(device.database)).rejects.toBeInstanceOf(
      UploadRetryError,
    );
    expect(device.timesCompleted()).toBe(0);
  });

  test("stamps soft deletes with the current time by default", async () => {
    const network = scriptedFetch([rowsChanged(1)]);
    const connector = new SupabaseConnector({
      supabase: supabaseClient(network.fetch),
      powerSyncUrl,
    });
    const before = Date.now();

    await connector.uploadData(
      deviceDatabase([change(1, UpdateType.DELETE, "transactions", "t-1")])
        .database,
    );

    const body = network.sent[0]?.body as { deleted_at: string };
    expect(Date.parse(body.deleted_at)).toBeGreaterThanOrEqual(before);
    expect(Date.parse(body.deleted_at)).toBeLessThanOrEqual(Date.now());
  });

  test("records an update that row level security silently skipped", async () => {
    const { connector } = connectorWith([rowsChanged(0)]);
    const device = deviceDatabase([
      change(3, UpdateType.PATCH, "transactions", "t-1", { amount_minor: 1 }),
    ]);

    await connector.uploadData(device.database);

    expect(device.executed[0]?.params).toEqual(
      expect.arrayContaining([
        "upload-3",
        "transactions",
        "t-1",
        "not_applied",
      ]),
    );
    expect(device.timesCompleted()).toBe(1);
  });

  test.each<[string, Reply]>([
    ["a network failure", "network failure"],
    ["a server error", new Response("upstream unavailable", { status: 503 })],
    ["an expired session", postgrestError(401, "PGRST301", "JWT expired")],
  ])("keeps the transaction queued for a retry after %s", async (_, reply) => {
    const { connector } = connectorWith([rowsChanged(1), reply]);
    const device = deviceDatabase([
      change(1, UpdateType.PATCH, "accounts", "a-1", { name: "Wallet" }),
      change(2, UpdateType.PUT, "accounts", "a-2", { name: "Bank" }),
    ]);

    await expect(connector.uploadData(device.database)).rejects.toBeInstanceOf(
      UploadRetryError,
    );

    expect(device.executed).toEqual([]);
    expect(device.timesCompleted()).toBe(0);
  });
});
