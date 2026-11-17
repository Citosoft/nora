import { ActivityIndicator, Pressable, Text } from "react-native";
import type { IconName } from "@/types/icon.types";
import type { Theme } from "@/types/theme.types";
import { radii, spacing, type } from "@/theme/tokens";
import { useTheme } from "@/hooks/useTheme";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { Icon } from "./Icon";

/** iOS button styles: filled (primary), grey (secondary), borderless tinted text (ghost) and destructive (danger). */
export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  icon?: IconName;
  disabled?: boolean;
  busy?: boolean;
  compact?: boolean;
  accessibilityHint?: string;
  /** Overrides the spoken label when the visible label needs context (e.g. "Rename Studio Mac"). */
  accessibilityLabel?: string;
}

export function Button({ label, onPress, variant = "secondary", icon, disabled = false, busy = false, compact = false, accessibilityHint, accessibilityLabel }: ButtonProps) {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  const inactive = disabled || busy;
  const foreground = { primary: colors.accentText, secondary: colors.text, ghost: colors.accent, danger: colors.danger }[variant];
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? label} accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: inactive, busy }} disabled={inactive} onPress={onPress}
      style={({ pressed }) => [styles.base, compact ? styles.compact : styles.regular, styles[variant], inactive && styles.inactive, pressed && styles.pressed]}>
      {busy ? <ActivityIndicator size="small" color={foreground} /> : icon ? <Icon name={icon} size={compact ? 16 : 19} color={foreground} /> : null}
      <Text style={[compact ? styles.compactLabel : styles.label, { color: foreground }]} numberOfLines={1}>{label}</Text>
    </Pressable>
  );
}

const createStyles = (theme: Theme) => ({
  base: { flexDirection: "row" as const, alignItems: "center" as const, justifyContent: "center" as const, gap: spacing.xs + 2, borderRadius: radii.pill },
  regular: { minHeight: 50, paddingHorizontal: spacing.xl },
  compact: { minHeight: 34, paddingHorizontal: spacing.md + 2 },
  primary: { backgroundColor: theme.colors.accent },
  secondary: { backgroundColor: theme.colors.fill },
  ghost: { backgroundColor: "transparent" },
  danger: { backgroundColor: theme.colors.dangerFill },
  inactive: { opacity: 0.4 },
  pressed: { opacity: 0.7 },
  label: { ...type.headline },
  compactLabel: { ...type.subheadline, fontWeight: "600" as const }
});
