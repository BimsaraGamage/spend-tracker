import "../../lib/i18n";

import { describe, expect, test } from "@jest/globals";
import { render, screen } from "@testing-library/react-native";

import { HomeScreen } from "./HomeScreen";

describe("HomeScreen", () => {
  test("shows the app's name as the screen's heading", async () => {
    await render(<HomeScreen />);

    expect(screen.getByRole("heading", { name: "Spend Tracker" })).toBeTruthy();
  });
});
