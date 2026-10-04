import { describe, expect, test } from "vitest";

import { classifyUploadError } from "./upload-outcome";

describe("classifyUploadError", () => {
  test("an insert that already arrived counts as applied (SYNC2)", () => {
    expect(
      classifyUploadError(
        {
          code: "23505",
          message:
            'duplicate key value violates unique constraint "ledgers_pkey"',
        },
        "ledgers",
      ),
    ).toEqual({ kind: "applied" });
  });

  test("a duplicate on any other key, or another table's key, is refused", () => {
    for (const message of [
      'duplicate key value violates unique constraint "ledger_members_ledger_id_user_id_key"',
      'duplicate key value violates unique constraint "accounts_pkey"',
    ]) {
      expect(
        classifyUploadError({ code: "23505", message }, "ledgers"),
      ).toEqual({ kind: "rejected", code: "23505", message });
    }
  });

  test.each([
    ["22P02", "invalid input syntax for type uuid"],
    ["22023", "Unknown time zone: Mars/Olympus"],
    ["23503", "insert or update violates foreign key constraint"],
    ["23514", "transactions.ledger_id cannot be changed"],
    [
      "42501",
      'new row violates row-level security policy for table "accounts"',
    ],
  ])("SQLSTATE %s is refused for good (SYNC3)", (code, message) => {
    expect(classifyUploadError({ code, message }, "accounts")).toEqual({
      kind: "rejected",
      code,
      message,
    });
  });

  test.each([
    ["", "TypeError: fetch failed"],
    ["PGRST301", "JWT expired"],
    ["PGRST204", "Could not find the 'notes' column in the schema cache"],
    ["53300", "too many connections"],
    ["57014", "canceling statement due to statement timeout"],
    ["2200", "not a full SQLSTATE"],
  ])("code %j is retried", (code, message) => {
    expect(classifyUploadError({ code, message }, "accounts")).toEqual({
      kind: "retry",
      code,
      message,
    });
  });
});
