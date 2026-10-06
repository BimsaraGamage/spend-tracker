import { describe, expect, jest, test } from "@jest/globals";
import { renderHook } from "@testing-library/react-native";
import { DefaultTheme } from "expo-router";

import { useNavigationTheme } from "./navigation-theme";

// The design tokens come from global.css, which only Metro compiles. Stand in
// for Uniwind with the values it would resolve. jest.mock is hoisted above
// the imports, so its factory may only use variables named mock….
const tokens = {
  "--color-background": "#0a0a0a",
  "--color-card": "#171717",
  "--color-foreground": "#fafafa",
  "--color-border": "#262626",
  "--color-primary": "#e5e5e5",
  "--color-destructive": "#ff6467",
};
let mockTheme: "light" | "dark" = "dark";
let mockTokens: Partial<Record<string, string>> = tokens;

jest.mock("uniwind", () => ({
  useUniwind: () => ({ theme: mockTheme }),
  useCSSVariable: (names: readonly string[]) =>
    names.map((name) => mockTokens[name]),
}));

describe("useNavigationTheme", () => {
  test("colors navigation with the design tokens of the current theme", async () => {
    mockTheme = "dark";
    mockTokens = tokens;

    const { result } = await renderHook(() => useNavigationTheme());

    expect(result.current.dark).toBe(true);
    expect(result.current.colors).toEqual({
      background: "#0a0a0a",
      card: "#171717",
      text: "#fafafa",
      border: "#262626",
      primary: "#e5e5e5",
      notification: "#ff6467",
    });
  });

  test("falls back to the standard colors when a token is missing", async () => {
    mockTheme = "light";
    mockTokens = {};

    const { result } = await renderHook(() => useNavigationTheme());

    expect(result.current.dark).toBe(false);
    expect(result.current.colors).toEqual(DefaultTheme.colors);
  });
});
