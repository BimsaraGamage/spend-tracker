import { useTranslation } from "react-i18next";
import { StyleSheet, Text, View } from "react-native";

import type { ConfigProblem } from "../../lib/config";

/**
 * Shown instead of the app when the build's configuration is invalid
 * (CON8), so a misconfigured build fails visibly instead of half-working.
 */
export function ConfigurationErrorScreen({
  problems,
}: {
  readonly problems: readonly ConfigProblem[];
}) {
  const { t } = useTranslation();
  return (
    <View style={styles.container}>
      <Text accessibilityRole="header" style={styles.title}>
        {t("configuration.title")}
      </Text>
      <Text style={styles.text}>{t("configuration.description")}</Text>
      {problems.map(({ variable, reason }) => (
        <Text key={`${variable}:${reason}`} style={styles.text}>
          {t(`configuration.problems.${reason}`, { variable })}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", gap: 8, padding: 16 },
  title: { fontSize: 22, fontWeight: "600" },
  text: { fontSize: 16 },
});
