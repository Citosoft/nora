import { Pressable, Text, View } from "react-native";
import type { SidebarRowProps } from "@/types/sidebar.types";
import type { Theme } from "@/types/theme.types";
import { radii, spacing, type } from "@/theme/tokens";
import { useTheme } from "@/hooks/useTheme";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { Icon } from "@/components/common/Icon";

/** A sidebar destination: outline icon, label, optional detail; the current one sits on a soft highlight. */
export function SidebarRow({ label, icon, leading, selected = false, onPress, detail, trailing, accessibilityLabel }: SidebarRowProps) {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  return (
    <View style={[styles.row, selected && styles.selected]}>
      <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? (detail ? `${label}, ${detail}` : label)}
        accessibilityState={{ selected }} onPress={onPress} style={({ pressed }) => [styles.main, pressed && styles.pressed]}>
        {leading ?? (icon ? <Icon name={icon} size={23} color={colors.text} /> : null)}
        <Text style={styles.label} numberOfLines={1}>{label}</Text>
        {detail ? <Text style={styles.detail} numberOfLines={1}>{detail}</Text> : null}
      </Pressable>
      {trailing}
    </View>
  );
}

const createStyles = (theme: Theme) => ({
  row: { flexDirection: "row" as const, alignItems: "center" as const, borderRadius: radii.sm + 2, paddingRight: spacing.xs },
  selected: { backgroundColor: theme.colors.sidebarSelected },
  main: { flex: 1, minHeight: 46, flexDirection: "row" as const, alignItems: "center" as const, gap: spacing.md + 2, paddingHorizontal: spacing.md + 2 },
  pressed: { opacity: 0.55 },
  label: { ...type.body, flex: 1, color: theme.colors.text },
  detail: { ...type.subheadline, color: theme.colors.textMuted }
});
