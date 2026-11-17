import { memo } from "react";
import { Pressable, Text, View } from "react-native";
import type { ConversationSummary } from "@shared/types/conversation/queries.types";
import type { Theme } from "@/types/theme.types";
import { layout, spacing, type } from "@/theme/tokens";
import { deriveExecutionState } from "@/state/executionState";
import { relativeTime } from "@/state/relativeTime";
import { useTheme } from "@/hooks/useTheme";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { Icon } from "@/components/common/Icon";
import { StatusDot } from "@/components/common/StatusDot";

interface ConversationRowProps {
  summary: ConversationSummary;
  projectName: string | null;
  now: Date;
  onOpen: (conversationId: string) => void;
}

/** A Mail-style chat row: state dot, title and time, then what the agent is doing (or why it failed) and the project. */
export const ConversationRow = memo(function ConversationRow({ summary, projectName, now, onOpen }: ConversationRowProps) {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  const state = deriveExecutionState(summary);
  const updated = relativeTime(summary.latestRun?.updatedAt ?? summary.conversation.updatedAt, now);
  const title = summary.conversation.title;
  const failure = summary.latestRun?.state === "failed" ? summary.latestRun.failure?.message ?? null : null;
  const details = [state.tone !== "neutral" || summary.latestRun ? state.label : null, summary.queuedCount > 0 ? `${summary.queuedCount} queued` : null, projectName]
    .filter(Boolean).join(" · ");
  const flagged = state.tone === "attention" || state.tone === "active" || state.tone === "danger";
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${title}, ${state.label}, updated ${updated}`} onPress={() => onOpen(summary.conversation.id)}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <View style={styles.marker}>{flagged ? <StatusDot tone={state.tone} size={9} /> : null}</View>
      <View style={styles.texts}>
        <View style={styles.top}>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          <Text style={styles.time}>{updated}</Text>
          <Icon name="chevron-forward" size={14} color={colors.textTertiary} />
        </View>
        {details ? <Text style={[styles.details, flagged && { color: colors.tones[state.tone].text }]} numberOfLines={1}>{details}</Text> : null}
        {failure ? <Text style={styles.failure} numberOfLines={2}>{failure}</Text> : null}
      </View>
    </Pressable>
  );
});

const createStyles = (theme: Theme) => ({
  row: { flexDirection: "row" as const, paddingVertical: spacing.md - 2, paddingRight: layout.gutter, paddingLeft: spacing.xs },
  pressed: { backgroundColor: theme.colors.pressed },
  marker: { width: 24, alignItems: "center" as const, paddingTop: 7 },
  texts: { flex: 1, minWidth: 0, gap: 2 },
  top: { flexDirection: "row" as const, alignItems: "center" as const, gap: spacing.xs + 2 },
  title: { ...type.headline, flex: 1, color: theme.colors.text },
  time: { ...type.subheadline, color: theme.colors.textMuted },
  details: { ...type.subheadline, color: theme.colors.textMuted },
  failure: { ...type.subheadline, color: theme.colors.danger }
});
