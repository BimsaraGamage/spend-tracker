import { ColumnType } from "@powersync/common";
import { describe, expect, test } from "vitest";

import { AppSchema } from "./schema";

function table(name: string) {
  const found = AppSchema.tables.find((candidate) => candidate.name === name);
  if (found === undefined) {
    throw new Error(`No table named ${name}`);
  }
  return found;
}

describe("AppSchema", () => {
  test("is a valid PowerSync schema", () => {
    expect(() => {
      AppSchema.validate();
    }).not.toThrow();
  });

  test("syncs the ledger tables, and keeps upload rejections on the device only", () => {
    expect(
      AppSchema.tables.map(({ name, localOnly }) => [name, localOnly]),
    ).toEqual([
      ["ledgers", false],
      ["ledger_members", false],
      ["accounts", false],
      ["transactions", false],
      ["upload_rejections", true],
    ]);
  });

  test("stores amounts as integer minor units (DATA1)", () => {
    const amount = table("transactions").columns.find(
      ({ name }) => name === "amount_minor",
    );
    expect(amount?.type).toBe(ColumnType.INTEGER);
  });

  test("never stores deleted_at, because soft-deleted rows don't sync", () => {
    for (const { name, columns } of AppSchema.tables) {
      expect(
        columns.map((column) => column.name),
        name,
      ).not.toContain("deleted_at");
    }
  });
});
