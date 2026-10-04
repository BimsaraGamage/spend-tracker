import { useTranslation } from "react-i18next";
import { StyleSheet, Text, View } from "react-native";

/** The start screen. It will list the user's ledgers. */
export function HomeScreen() {
  const { t } = useTranslation();
  return (
    <View style={styles.container}>
      <Text accessibilityRole="header" style={styles.title}>
        {t("home.title")}
      </Text>
      <Text style={styles.description}>{t("home.description")}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 16,
  },
  title: { fontSize: 28, fontWeight: "600" },
  description: { fontSize: 16 },
});
