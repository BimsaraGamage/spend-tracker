import "../global.css";
import "../lib/i18n";

import { Stack, ThemeProvider } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { ConfigurationErrorScreen } from "../features/configuration/ConfigurationErrorScreen";
import { appConfig } from "../lib/config";
import { useNavigationTheme } from "../lib/styles/navigation-theme";

export default function RootLayout() {
  const navigationTheme = useNavigationTheme();
  if (!appConfig.ok) {
    return <ConfigurationErrorScreen problems={appConfig.error} />;
  }
  return (
    <ThemeProvider value={navigationTheme}>
      <Stack screenOptions={{ headerShown: false }} />
      <StatusBar style={navigationTheme.dark ? "light" : "dark"} />
    </ThemeProvider>
  );
}
