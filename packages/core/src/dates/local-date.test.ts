import { describe, expect, it } from "vitest";
import { isValidTimeZone, localDateIn, parseLocalDate } from "./local-date";

describe("parseLocalDate", () => {
  it.each([
    "2026-10-04",
    "2024-02-29",
    "2000-02-29",
    "0001-01-01",
    "9999-12-31",
    "2026-04-30",
  ])("accepts %s", (value) => {
    expect(parseLocalDate(value)).toEqual({ ok: true, value });
  });

  it.each([
    ["a non-leap 29 February", "2023-02-29"],
    ["29 February in a century year", "1900-02-29"],
    ["31 April", "2026-04-31"],
    ["month 13", "2026-13-01"],
    ["day 0", "2026-10-00"],
    ["year 0", "0000-01-01"],
    ["no zero padding", "2026-1-4"],
    ["a time part", "2026-10-04T00:00"],
    ["slashes", "2026/10/04"],
    ["empty", ""],
  ])("rejects %s", (_label, value) => {
    expect(parseLocalDate(value)).toEqual({ ok: false, error: "invalid-date" });
  });
});

describe("localDateIn", () => {
  // 2026-10-04T18:29:59.999Z and one millisecond later.
  const beforeColomboMidnight = Date.UTC(2026, 9, 4, 18, 29, 59, 999);
  const atColomboMidnight = beforeColomboMidnight + 1;

  it("uses the time zone's calendar day, not UTC's", () => {
    expect(localDateIn("Asia/Colombo", beforeColomboMidnight)).toBe(
      "2026-10-04",
    );
    expect(localDateIn("Asia/Colombo", atColomboMidnight)).toBe("2026-10-05");
    expect(localDateIn("America/Los_Angeles", atColomboMidnight)).toBe(
      "2026-10-04",
    );
    expect(localDateIn("UTC", atColomboMidnight)).toBe("2026-10-04");
  });

  it("crosses month and year boundaries correctly", () => {
    expect(localDateIn("Asia/Colombo", Date.UTC(2026, 11, 31, 18, 30))).toBe(
      "2027-01-01",
    );
    expect(
      localDateIn("Pacific/Kiritimati", Date.UTC(2026, 1, 28, 10, 0)),
    ).toBe("2026-03-01");
  });

  it("defaults to the current time", () => {
    expect(parseLocalDate(localDateIn("UTC")).ok).toBe(true);
  });

  it("throws for an unknown time zone", () => {
    expect(() => localDateIn("Mars/Olympus_Mons", 0)).toThrow(RangeError);
  });
});

describe("isValidTimeZone", () => {
  it.each(["Asia/Colombo", "UTC", "America/Los_Angeles"])(
    "accepts %s",
    (zone) => {
      expect(isValidTimeZone(zone)).toBe(true);
    },
  );

  it.each(["", "Mars/Olympus_Mons", "Asia/Kolkata "])("rejects %j", (zone) => {
    expect(isValidTimeZone(zone)).toBe(false);
  });
});
