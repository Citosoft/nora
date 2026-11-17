import { ActivityIndicator, Pressable, Text } from "react-native";
import type { NavButtonProps } from "@/types/navigationUi.types";
import type { Theme } from "@/types/theme.types";
import { layout, spacing, type } from "@/theme/tokens";
import { useTheme } from "@/hooks/useTheme";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { Icon } from "./Icon";

/** A bare top-bar control in the app's ChatGPT-like style: an outline glyph, or a text action ("Done" is semibold). */
export function NavButton({ label, icon, onPress, disabled = false, busy = false, prominent = false }: NavButtonProps) {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  const inactive = disabled || busy;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: inactive, busy }} disabled={inactive}
      onPress={onPress} hitSlop={6} style={({ pressed }) => [styles.base, pressed && styles.pressed, disabled && styles.inactive]}>
      {busy ? <ActivityIndicator size="small" color={colors.text} />
        : icon ? <Icon name={icon} size={25} color={colors.text} />
        : <Text style={[styles.label, prominent && styles.prominent]}>{label}</Text>}
    </Pressable>
  );
}

const createStyles = (theme: Theme) => ({
  base: { minWidth: layout.minTouchTarget, height: layout.minTouchTarget, alignItems: "center" as const, justifyContent: "center" as const,
    paddingHorizontal: spacing.xs },
  pressed: { opacity: 0.5 },
  inactive: { opacity: 0.35 },
  label: { ...type.body, color: theme.colors.text },
  prominent: { fontWeight: "600" as const }
});
