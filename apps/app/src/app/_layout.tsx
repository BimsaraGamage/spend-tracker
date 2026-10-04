import "../lib/i18n";

import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { ConfigurationErrorScreen } from "../features/configuration/ConfigurationErrorScreen";
import { appConfig } from "../lib/config";

export default function RootLayout() {
  if (!appConfig.ok) {
    return <ConfigurationErrorScreen problems={appConfig.error} />;
  }
  return (
    <>
      <Stack screenOptions={{ headerShown: false }} />
      <StatusBar style="auto" />
    </>
  );
}
