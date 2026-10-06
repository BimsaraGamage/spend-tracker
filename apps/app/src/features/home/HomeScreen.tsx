import { useTranslation } from "react-i18next";
import { View } from "react-native";

import { Text } from "../../components/ui/text";

/** The start screen. It will list the user's ledgers. */
export function HomeScreen() {
  const { t } = useTranslation();
  return (
    <View className="bg-background flex-1 items-center justify-center gap-2 p-4">
      <Text variant="h1">{t("home.title")}</Text>
      <Text variant="muted">{t("home.description")}</Text>
    </View>
  );
}
