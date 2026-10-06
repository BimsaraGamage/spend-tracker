import { describe, expect, test } from "@jest/globals";
import { render, screen } from "@testing-library/react-native";

import { Text } from "./text";

describe("Text", () => {
  test("marks heading variants as headings for screen readers", async () => {
    await render(<Text variant="h1">Plan</Text>);

    expect(screen.getByRole("heading", { name: "Plan" })).toBeTruthy();
  });

  test("leaves body text without a role", async () => {
    await render(<Text>Spent so far</Text>);

    expect(screen.queryByRole("heading")).toBeNull();
    expect(screen.getByText("Spent so far")).toBeTruthy();
  });
});
