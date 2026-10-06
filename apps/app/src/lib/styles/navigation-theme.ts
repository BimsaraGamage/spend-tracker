import { DarkTheme, DefaultTheme, type Theme } from "expo-router";
import type { ColorValue } from "react-native";
import { useCSSVariable, useUniwind } from "uniwind";

/**
 * The navigation theme, built from the design tokens in global.css, so
 * screens, headers and the space behind them share one set of colors.
 */
export function useNavigationTheme(): Theme {
  const { theme } = useUniwind();
  const base = theme === "dark" ? DarkTheme : DefaultTheme;
  const [background, card, text, border, primary, notification] =
    useCSSVariable([
      "--color-background",
      "--color-card",
      "--color-foreground",
      "--color-border",
      "--color-primary",
      "--color-destructive",
    ]);
  const color = (value: string | number | undefined, fallback: ColorValue) =>
    typeof value === "string" ? value : fallback;
  return {
    ...base,
    colors: {
      background: color(background, base.colors.background),
      card: color(card, base.colors.card),
      text: color(text, base.colors.text),
      border: color(border, base.colors.border),
      primary: color(primary, base.colors.primary),
      notification: color(notification, base.colors.notification),
    },
  };
}
