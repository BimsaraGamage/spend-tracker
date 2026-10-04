import { describe, expect, it } from "vitest";
import { type Result, err, ok } from "./result";

describe("Result", () => {
  it("wraps a value in the ok branch", () => {
    const result: Result<number, string> = ok(42);
    expect(result).toEqual({ ok: true, value: 42 });
  });

  it("wraps an expected failure in the error branch", () => {
    const result: Result<number, "too-big"> = err("too-big");
    expect(result).toEqual({ ok: false, error: "too-big" });
  });

  it("narrows on the ok flag", () => {
    const result: Result<number, string> = ok(1);
    expect(result.ok ? result.value + 1 : result.error).toBe(2);
  });
});
