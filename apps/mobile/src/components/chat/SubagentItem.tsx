import { Text, View } from "react-native";
import type { SubagentActivity, ToolActivity } from "@shared/types/conversation/contracts.types";
import type { Theme } from "@/types/theme.types";
import { spacing, type } from "@/theme/tokens";
import { toolStatePresentation } from "@/state/toolPresentation";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { Disclosure } from "@/components/common/Disclosure";
import { Markdown } from "@/components/markdown/Markdown";
import { ToolCard, ToolStateGlyph } from "./ToolCard";

/** A delegated agent, with its own tool calls nested inside. */
export function SubagentItem({ item, children }: { item: SubagentActivity; children: readonly ToolActivity[] }) {
  const styles = useThemedStyles(createStyles);
  const state = toolStatePresentation[item.state];
  return (
    <Disclosure label={`Helper agent ${item.label}, ${state.label}. Show details`} summary={
      <View style={styles.summary}>
        <ToolStateGlyph state={item.state} />
        <Text style={styles.title} numberOfLines={1}>{item.agentType ? `${item.agentType}: ${item.label}` : item.label}</Text>
        {children.length ? <Text style={styles.count}>{children.length} {children.length === 1 ? "step" : "steps"}</Text> : null}
      </View>
    }>
      {item.prompt ? <Text style={styles.muted} numberOfLines={6}>{item.prompt}</Text> : null}
      {item.progress && !item.result ? <Text style={styles.muted}>{item.progress}</Text> : null}
      {children.map((child) => <ToolCard key={child.id} item={child} />)}
      {item.result ? <Markdown text={item.result} /> : null}
    </Disclosure>
  );
}

const createStyles = (theme: Theme) => ({
  summary: { flexDirection: "row" as const, alignItems: "center" as const, gap: spacing.sm },
  title: { ...type.subheadline, fontWeight: "600" as const, flexShrink: 1, color: theme.colors.text },
  count: { ...type.footnote, color: theme.colors.textMuted },
  muted: { ...type.footnote, color: theme.colors.textMuted }
});
