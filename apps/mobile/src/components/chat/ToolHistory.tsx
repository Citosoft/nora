import { Text, View } from "react-native";
import type { ToolActivity } from "@shared/types/conversation/contracts.types";
import { summarizeToolHistory } from "@shared/conversations/toolHistory";
import type { Theme } from "@/types/theme.types";
import { spacing, type } from "@/theme/tokens";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { Disclosure } from "@/components/common/Disclosure";
import { toolStatePresentation } from "@/state/toolPresentation";
import { ToolCard, ToolStateGlyph } from "./ToolCard";

/** One expanding history per turn; its identity stays fixed as tool updates arrive. */
export function ToolHistory({ items }: { items: readonly ToolActivity[] }) {
  const styles = useThemedStyles(createStyles);
  const summary = summarizeToolHistory(items);
  const status = toolStatePresentation[summary.state].label;
  return <Disclosure label={`${summary.count} tool calls, ${status}. Show tool history`} summary={
    <View style={styles.summary}>
      <ToolStateGlyph state={summary.state} />
      <Text style={styles.label} numberOfLines={1}>{summary.label}</Text>
      <Text style={styles.count}>{summary.state === "running" ? `${summary.count} calls` : status}</Text>
      {summary.failedCount > 0 ? <Text style={styles.failed}>{summary.failedCount} failed</Text> : null}
    </View>
  }>
    {items.map((item) => <ToolCard key={item.id} item={item} />)}
  </Disclosure>;
}

const createStyles = (theme: Theme) => ({
  summary: { flexDirection: "row" as const, alignItems: "center" as const, gap: spacing.sm },
  label: { ...type.subheadline, flexShrink: 1, color: theme.colors.textMuted },
  count: { ...type.caption, color: theme.colors.textMuted },
  failed: { ...type.caption, color: theme.colors.danger }
});
