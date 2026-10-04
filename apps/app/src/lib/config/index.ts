import { parseConfig } from "./config";

export {
  type AppConfig,
  type ConfigEnvironment,
  type ConfigProblem,
  parseConfig,
} from "./config";

/**
 * The configuration this build was made with. Expo replaces a
 * `process.env` reference only when the variable's name is written out in
 * full, so every variable is read by name.
 */
export const appConfig = parseConfig(
  {
    EXPO_PUBLIC_SUPABASE_URL: process.env["EXPO_PUBLIC_SUPABASE_URL"],
    EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env["EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY"],
    EXPO_PUBLIC_POWERSYNC_URL: process.env["EXPO_PUBLIC_POWERSYNC_URL"],
  },
  { allowInsecure: __DEV__ },
);
