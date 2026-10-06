import "../../lib/i18n";

import { describe, expect, test } from "@jest/globals";
import { render, screen } from "@testing-library/react-native";

import { ConfigurationErrorScreen } from "./ConfigurationErrorScreen";

describe("ConfigurationErrorScreen", () => {
  test("says what's wrong with each setting", async () => {
    await render(
      <ConfigurationErrorScreen
        problems={[
          { variable: "EXPO_PUBLIC_SUPABASE_URL", reason: "missing" },
          { variable: "EXPO_PUBLIC_POWERSYNC_URL", reason: "insecureAddress" },
        ]}
      />,
    );

    expect(
      screen.getByRole("heading", {
        name: "This build of the app isn't set up",
      }),
    ).toBeTruthy();
    expect(
      screen.getByText("EXPO_PUBLIC_SUPABASE_URL is missing."),
    ).toBeTruthy();
    expect(
      screen.getByText("EXPO_PUBLIC_POWERSYNC_URL must start with https://."),
    ).toBeTruthy();
  });
});
