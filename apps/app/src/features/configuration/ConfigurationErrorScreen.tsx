import { useTranslation } from "react-i18next";
import { View } from "react-native";

import { Text } from "../../components/ui/text";
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
    <View className="bg-background flex-1 justify-center gap-2 p-4">
      <Text variant="h3">{t("configuration.title")}</Text>
      <Text>{t("configuration.description")}</Text>
      {problems.map(({ variable, reason }) => (
        <Text key={`${variable}:${reason}`}>
          {t(`configuration.problems.${reason}`, { variable })}
        </Text>
      ))}
    </View>
  );
}
