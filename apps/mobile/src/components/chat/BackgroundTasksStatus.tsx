import { Text, View } from "react-native";
import { backgroundTasksStatus } from "@shared/conversations/backgroundTasks";
import type { BackgroundTask } from "@shared/types/conversation/contracts.types";
import type { Theme } from "@/types/theme.types";
import { spacing, type } from "@/theme/tokens";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { ThinkingOrb } from "@/components/visuals/ThinkingOrb";

export function BackgroundTasksStatus({ tasks }: { tasks: readonly BackgroundTask[] }) {
  const styles = useThemedStyles(createStyles);
  const status = backgroundTasksStatus(tasks);
  if (!status) return null;
  return <View style={styles.box} accessibilityRole="status" accessibilityLiveRegion="polite">
    <View style={styles.row}>
      <ThinkingOrb state="working" />
      <Text style={styles.title}>{status.title}</Text>
    </View>
    {tasks.map((task) => <Text key={task.id} style={styles.item}>{task.description}</Text>)}
  </View>;
}

const createStyles = (theme: Theme) => ({
  box: { gap: spacing.xs, paddingVertical: spacing.sm },
  row: { flexDirection: "row" as const, alignItems: "center" as const, gap: spacing.sm },
  title: { ...type.subheadline, color: theme.colors.text, flexShrink: 1 },
  item: { ...type.footnote, color: theme.colors.textMuted, paddingLeft: spacing.lg }
});
