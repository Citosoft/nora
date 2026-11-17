import { Pressable, Text, View } from "react-native";
import type { ListRowProps } from "@/types/listUi.types";
import type { Theme } from "@/types/theme.types";
import { layout, spacing, type } from "@/theme/tokens";
import { useTheme } from "@/hooks/useTheme";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { Icon } from "./Icon";
import { IconTile } from "./IconTile";

/** One cell of an inset grouped list: optional icon tile, title and subtitle, value, and a chevron or checkmark. */
export function ListRow({ title, subtitle, value, icon, leading, trailing, accessory = "none", onPress, onLongPress, destructive = false,
  centered = false, disabled = false, titleLines = 2, subtitleLines = 2, accessibilityLabel, accessibilityHint }: ListRowProps) {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  const interactive = Boolean(onPress) && !disabled;
  const titleColor = destructive ? colors.danger : centered ? colors.accent : colors.text;
  return (
    <Pressable onPress={onPress} onLongPress={onLongPress} disabled={!interactive} accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={accessibilityLabel ?? [title, subtitle, value].filter(Boolean).join(", ")} accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled, ...(accessory === "checkmark" ? { selected: true } : {}) }}
      style={({ pressed }) => [styles.row, pressed && interactive && styles.pressed, disabled && styles.disabled]}>
      {icon ? <IconTile {...icon} /> : leading}
      <View style={[styles.texts, centered && styles.centered]}>
        <Text style={[styles.title, { color: titleColor }]} numberOfLines={titleLines}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle} numberOfLines={subtitleLines}>{subtitle}</Text> : null}
      </View>
      {value ? <Text style={styles.value} numberOfLines={1}>{value}</Text> : null}
      {trailing}
      {accessory === "chevron" ? <Icon name="chevron-forward" size={17} color={colors.textTertiary} /> : null}
      {accessory === "checkmark" ? <Icon name="checkmark" size={22} color={colors.accent} /> : null}
    </Pressable>
  );
}

const createStyles = (theme: Theme) => ({
  row: { minHeight: layout.rowHeight, flexDirection: "row" as const, alignItems: "center" as const, gap: spacing.md,
    paddingHorizontal: layout.gutter, paddingVertical: spacing.sm + 2 },
  pressed: { backgroundColor: theme.colors.pressed },
  disabled: { opacity: 0.45 },
  texts: { flex: 1, minWidth: 0, gap: 1 },
  centered: { alignItems: "center" as const },
  title: { ...type.body },
  subtitle: { ...type.subheadline, color: theme.colors.textMuted },
  value: { ...type.body, color: theme.colors.textMuted, maxWidth: "45%" as const }
});
