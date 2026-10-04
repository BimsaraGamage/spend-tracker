import { describe, expect, test } from "@jest/globals";

import { parseConfig } from "./config";

const local = {
  EXPO_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
  EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_local",
  EXPO_PUBLIC_POWERSYNC_URL: "http://127.0.0.1:8080",
};

const hosted = {
  EXPO_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
  EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_hosted",
  EXPO_PUBLIC_POWERSYNC_URL: "https://instance.powersync.journeyapps.com",
};

describe("parseConfig", () => {
  test("reads a hosted configuration", () => {
    expect(parseConfig(hosted, { allowInsecure: false })).toEqual({
      ok: true,
      value: {
        supabaseUrl: "https://project.supabase.co",
        supabasePublishableKey: "sb_publishable_hosted",
        powerSyncUrl: "https://instance.powersync.journeyapps.com",
      },
    });
  });

  test("accepts the local stack's plain http addresses in development only", () => {
    expect(parseConfig(local, { allowInsecure: true }).ok).toBe(true);
    expect(parseConfig(local, { allowInsecure: false })).toEqual({
      ok: false,
      error: [
        { variable: "EXPO_PUBLIC_SUPABASE_URL", reason: "insecureAddress" },
        { variable: "EXPO_PUBLIC_POWERSYNC_URL", reason: "insecureAddress" },
      ],
    });
  });

  test("reports every missing or blank variable", () => {
    expect(
      parseConfig(
        { EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "  " },
        { allowInsecure: true },
      ),
    ).toEqual({
      ok: false,
      error: [
        { variable: "EXPO_PUBLIC_SUPABASE_URL", reason: "missing" },
        { variable: "EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY", reason: "missing" },
        { variable: "EXPO_PUBLIC_POWERSYNC_URL", reason: "missing" },
      ],
    });
  });

  test("rejects an address that isn't one", () => {
    expect(
      parseConfig(
        { ...hosted, EXPO_PUBLIC_POWERSYNC_URL: "powersync" },
        { allowInsecure: false },
      ),
    ).toEqual({
      ok: false,
      error: [
        { variable: "EXPO_PUBLIC_POWERSYNC_URL", reason: "notAnAddress" },
      ],
    });
  });

  test("refuses Supabase's secret key, which must never ship in an app (SEC3)", () => {
    expect(
      parseConfig(
        { ...hosted, EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_secret_abc" },
        { allowInsecure: false },
      ),
    ).toEqual({
      ok: false,
      error: [
        {
          variable: "EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
          reason: "secretKey",
        },
      ],
    });
  });
});
