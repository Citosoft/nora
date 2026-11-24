import { Text, View } from "react-native";
import type { ChatTitleProps } from "@/types/sidebar.types";
import { BotAvatar } from "@/components/common/BotAvatar";
import { BarIconButton } from "@/components/common/BarIconButton";
import { Icon } from "@/components/common/Icon";
import { useTheme } from "@/hooks/useTheme";
import type { Theme } from "@/types/theme.types";
import { spacing, type } from "@/theme/tokens";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { StatusDot } from "@/components/common/StatusDot";

/** The chat's title in the top bar, with its state underneath while the agent is busy or needs you. */
export function ChatTitle({ title, status, bot, onEditBot }: ChatTitleProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const showStatus = status !== null && status.tone !== "neutral" && status.tone !== "success";
  return (
    <View style={styles.root}>
      {bot ? <BotAvatar avatar={bot.avatar} name={bot.name} size={26} /> : null}
      <View style={styles.box}>
        <Text style={styles.title} numberOfLines={1} accessibilityRole="header">{title}</Text>
        {showStatus ? (
          <View style={styles.status}>
            <StatusDot tone={status.tone} size={6} />
            <Text style={styles.statusText}>{status.label}</Text>
          </View>
        ) : null}
      </View>
      {onEditBot ? <BarIconButton label={`Edit ${bot?.name ?? "bot"}`} onPress={onEditBot}>
        <Icon name="create-outline" size={20} color={colors.textMuted} />
      </BarIconButton> : null}
    </View>
  );
}

const createStyles = (theme: Theme) => ({
  root: { flexDirection: "row" as const, alignItems: "center" as const, gap: spacing.sm, maxWidth: "100%" as const },
  box: { flexShrink: 1, alignItems: "center" as const, maxWidth: "100%" as const },
  title: { ...type.headline, color: theme.colors.text },
  status: { flexDirection: "row" as const, alignItems: "center" as const, gap: spacing.xs + 1 },
  statusText: { ...type.caption, color: theme.colors.textMuted }
});
