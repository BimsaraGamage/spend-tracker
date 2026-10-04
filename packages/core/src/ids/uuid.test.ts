import { describe, expect, it } from "vitest";
import { isUuid, uuidv7 } from "./uuid";

describe("uuidv7", () => {
  it("matches the RFC 9562 test vector (Appendix A.6)", () => {
    // unix_ts_ms 0x017F22E279B0, rand_a 0xCC3, rand_b 0x18C4DC0C0C07398F
    const random = [
      0, 0, 0, 0, 0, 0, 0x0c, 0xc3, 0x18, 0xc4, 0xdc, 0x0c, 0x0c, 0x07, 0x39,
      0x8f,
    ];
    const id = uuidv7({
      now: () => 0x017f22e279b0,
      randomBytes: () => Uint8Array.from(random),
    });
    expect(id).toBe("017f22e2-79b0-7cc3-98c4-dc0c0c07398f");
  });

  it("sets the version and variant bits whatever the random bytes are", () => {
    const id = uuidv7({
      now: () => 0,
      randomBytes: () => new Uint8Array(16).fill(0xff),
    });
    expect(id).toBe("00000000-0000-7fff-bfff-ffffffffffff");
    expect(isUuid(id)).toBe(true);
  });

  it("orders by creation time", () => {
    const earlier = uuidv7({ now: () => 1_700_000_000_000 });
    const later = uuidv7({ now: () => 1_700_000_000_001 });
    expect(earlier < later).toBe(true);
  });

  it("uses the platform's secure random source by default", () => {
    const ids = new Set(Array.from({ length: 1000 }, () => uuidv7()));
    expect(ids.size).toBe(1000);
    for (const id of ids) expect(isUuid(id)).toBe(true);
  });

  it.each([-1, 2 ** 48, 1.5, Number.NaN])(
    "rejects the timestamp %s",
    (timestamp) => {
      expect(() => uuidv7({ now: () => timestamp })).toThrow(RangeError);
    },
  );

  it("rejects a random source that returns the wrong number of bytes", () => {
    expect(() => uuidv7({ randomBytes: () => new Uint8Array(8) })).toThrow(
      RangeError,
    );
  });

  it("fails clearly when no secure random source exists", () => {
    const original = Object.getOwnPropertyDescriptor(globalThis, "crypto");
    Object.defineProperty(globalThis, "crypto", {
      value: undefined,
      configurable: true,
    });
    try {
      expect(() => uuidv7()).toThrow(/No secure random source/);
    } finally {
      if (original) Object.defineProperty(globalThis, "crypto", original);
    }
  });
});

describe("isUuid", () => {
  it.each([
    "017f22e2-79b0-7cc3-98c4-dc0c0c07398f",
    "550e8400-e29b-41d4-a716-446655440000",
  ])("accepts %s", (value) => {
    expect(isUuid(value)).toBe(true);
  });

  it.each([
    ["uppercase", "017F22E2-79B0-7CC3-98C4-DC0C0C07398F"],
    ["no hyphens", "017f22e279b07cc398c4dc0c0c07398f"],
    ["the nil UUID", "00000000-0000-0000-0000-000000000000"],
    ["a wrong variant", "017f22e2-79b0-7cc3-c8c4-dc0c0c07398f"],
    ["empty", ""],
  ])("rejects %s", (_label, value) => {
    expect(isUuid(value)).toBe(false);
  });
});
