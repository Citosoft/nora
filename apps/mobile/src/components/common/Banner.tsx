import type { ReactNode } from "react";
import { Text, View } from "react-native";
import type { StatusTone } from "@/types/conversationState.types";
import type { IconName } from "@/types/icon.types";
import type { Theme } from "@/types/theme.types";
import { radii, spacing, type } from "@/theme/tokens";
import { useTheme } from "@/hooks/useTheme";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { Icon } from "./Icon";

interface BannerProps {
  tone: StatusTone;
  title: string;
  message?: string | null;
  action?: ReactNode;
}

const toneIcons: Record<StatusTone, IconName> = {
  neutral: "information-circle",
  active: "sync-circle",
  attention: "warning",
  danger: "alert-circle",
  success: "checkmark-circle"
};

/** Inline status message; announced politely to screen readers. */
export function Banner({ tone, title, message, action }: BannerProps) {
  const styles = useThemedStyles(createStyles);
  const colors = useTheme().colors.tones[tone];
  return (
    <View style={[styles.banner, { backgroundColor: colors.background }]} accessibilityRole="alert" accessibilityLiveRegion="polite">
      <Icon name={toneIcons[tone]} size={22} color={colors.solid} />
      <View style={styles.text}>
        <Text style={styles.title}>{title}</Text>
        {message ? <Text style={styles.message}>{message}</Text> : null}
        {action ? <View style={styles.action}>{action}</View> : null}
      </View>
    </View>
  );
}

const createStyles = (theme: Theme) => ({
  banner: { borderRadius: radii.md, padding: spacing.md + 2, flexDirection: "row" as const, alignItems: "flex-start" as const, gap: spacing.md },
  text: { flex: 1, minWidth: 0, gap: spacing.xxs },
  title: { ...type.subheadline, fontWeight: "600" as const, color: theme.colors.text },
  message: { ...type.footnote, color: theme.colors.textMuted },
  action: { flexDirection: "row" as const, gap: spacing.sm, marginTop: spacing.sm, flexWrap: "wrap" as const }
});
