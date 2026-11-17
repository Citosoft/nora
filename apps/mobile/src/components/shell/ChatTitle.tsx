import { Text, View } from "react-native";
import type { ExecutionState } from "@/types/conversationState.types";
import type { Theme } from "@/types/theme.types";
import { spacing, type } from "@/theme/tokens";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { StatusDot } from "@/components/common/StatusDot";

/** The chat's title in the top bar, with its state underneath while the agent is busy or needs you. */
export function ChatTitle({ title, status }: { title: string; status: ExecutionState | null }) {
  const styles = useThemedStyles(createStyles);
  const showStatus = status !== null && status.tone !== "neutral" && status.tone !== "success";
  return (
    <View style={styles.box}>
      <Text style={styles.title} numberOfLines={1} accessibilityRole="header">{title}</Text>
      {showStatus ? (
        <View style={styles.status}>
          <StatusDot tone={status.tone} size={6} />
          <Text style={styles.statusText}>{status.label}</Text>
        </View>
      ) : null}
    </View>
  );
}

const createStyles = (theme: Theme) => ({
  box: { alignItems: "center" as const, maxWidth: "100%" as const },
  title: { ...type.headline, color: theme.colors.text },
  status: { flexDirection: "row" as const, alignItems: "center" as const, gap: spacing.xs + 1 },
  statusText: { ...type.caption, color: theme.colors.textMuted }
});
