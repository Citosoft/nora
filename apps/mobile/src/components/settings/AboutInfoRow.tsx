import { Text, View } from "react-native";
import type { AboutInfoRowProps } from "@/types/appAbout.types";
import type { Theme } from "@/types/theme.types";
import { layout, spacing, type } from "@/theme/tokens";
import { useThemedStyles } from "@/hooks/useThemedStyles";

/** Diagnostic IDs must remain fully visible and selectable rather than truncated in a trailing list value. */
export function AboutInfoRow({ row }: AboutInfoRowProps) {
  const styles = useThemedStyles(createStyles);
  return <View style={styles.row}>
    <Text style={styles.label}>{row.label}</Text>
    <Text selectable style={styles.value}>{row.value}</Text>
  </View>;
}

const createStyles = (theme: Theme) => ({
  row: { paddingHorizontal: layout.gutter, paddingVertical: spacing.md, gap: spacing.xs },
  label: { ...type.footnote, color: theme.colors.textMuted },
  value: { ...type.body, color: theme.colors.text }
});
