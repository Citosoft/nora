import type { ReactNode } from "react";
import { Text, View } from "react-native";
import type { Theme } from "@/types/theme.types";
import { layout, spacing, type } from "@/theme/tokens";
import { useThemedStyles } from "@/hooks/useThemedStyles";

/** The caption above an inset grouped section, with an optional trailing action (e.g. "See all"). */
export function SectionHeader({ title, action }: { title: string; action?: ReactNode }) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.row}>
      <Text style={styles.title} accessibilityRole="header" numberOfLines={1}>{title}</Text>
      {action}
    </View>
  );
}

const createStyles = (theme: Theme) => ({
  row: { flexDirection: "row" as const, alignItems: "center" as const, justifyContent: "space-between" as const, gap: spacing.sm,
    paddingHorizontal: layout.gutter + spacing.sm, paddingBottom: spacing.xxs },
  title: { ...type.body, color: theme.colors.textMuted, flexShrink: 1 }
});
