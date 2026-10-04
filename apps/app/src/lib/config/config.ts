/**
 * The app's configuration (CON8). It comes from `EXPO_PUBLIC_*` environment
 * variables, which Expo writes into the bundle when it's built, so anything
 * here is public. Nothing else in the app reads `process.env`.
 */
import { err, ok, type Result } from "@spend-tracker/core";
import { z } from "zod";

export interface AppConfig {
  /** The Supabase project's API address. */
  readonly supabaseUrl: string;
  /** Supabase's publishable key. It's public; RLS protects the data. */
  readonly supabasePublishableKey: string;
  /** The PowerSync service's address. */
  readonly powerSyncUrl: string;
}

/** The environment variables the configuration is read from. */
export interface ConfigEnvironment {
  readonly EXPO_PUBLIC_SUPABASE_URL?: string | undefined;
  readonly EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?: string | undefined;
  readonly EXPO_PUBLIC_POWERSYNC_URL?: string | undefined;
}

const variables = [
  "EXPO_PUBLIC_SUPABASE_URL",
  "EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "EXPO_PUBLIC_POWERSYNC_URL",
] as const satisfies readonly (keyof ConfigEnvironment)[];

const reasons = [
  "missing",
  "notAnAddress",
  "insecureAddress",
  "secretKey",
] as const;

/** A problem with one variable, for the configuration error screen. */
export interface ConfigProblem {
  readonly variable: (typeof variables)[number];
  readonly reason: (typeof reasons)[number];
}

function protocolOf(address: string): string | undefined {
  try {
    return new URL(address).protocol;
  } catch {
    return undefined;
  }
}

function serviceAddress(allowInsecure: boolean) {
  return z
    .string({ error: "missing" })
    .trim()
    .min(1, { error: "missing", abort: true })
    .superRefine((address, context) => {
      const protocol = protocolOf(address);
      if (protocol === undefined) {
        context.addIssue({ code: "custom", message: "notAnAddress" });
      } else if (
        protocol !== "https:" &&
        !(allowInsecure && protocol === "http:")
      ) {
        context.addIssue({ code: "custom", message: "insecureAddress" });
      }
    });
}

function schema(allowInsecure: boolean) {
  return z.object({
    EXPO_PUBLIC_SUPABASE_URL: serviceAddress(allowInsecure),
    EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z
      .string({ error: "missing" })
      .trim()
      .min(1, { error: "missing", abort: true })
      // The secret key bypasses RLS. It must never ship in an app (SEC3).
      .refine((key) => !key.startsWith("sb_secret_"), { error: "secretKey" }),
    EXPO_PUBLIC_POWERSYNC_URL: serviceAddress(allowInsecure),
  });
}

/**
 * Validates the configuration. Plain `http` addresses are allowed only when
 * `allowInsecure` is set, which the app does in development builds, for the
 * local stack.
 */
export function parseConfig(
  environment: ConfigEnvironment,
  { allowInsecure }: { readonly allowInsecure: boolean },
): Result<AppConfig, ConfigProblem[]> {
  const parsed = schema(allowInsecure).safeParse(environment);
  if (!parsed.success) {
    return err(
      parsed.error.issues.map((issue) => {
        const variable = variables.find((name) => name === issue.path[0]);
        const reason = reasons.find((name) => name === issue.message);
        if (variable === undefined || reason === undefined) {
          throw new Error(`Unexpected configuration problem: ${issue.message}`);
        }
        return { variable, reason };
      }),
    );
  }
  const values = parsed.data;
  return ok({
    supabaseUrl: values.EXPO_PUBLIC_SUPABASE_URL,
    supabasePublishableKey: values.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    powerSyncUrl: values.EXPO_PUBLIC_POWERSYNC_URL,
  });
}
