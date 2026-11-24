import { Text, View } from "react-native";
import type { TimelineItemOf as ItemOf } from "@/types/conversationState.types";
import type { IconName } from "@/types/icon.types";
import type { Theme } from "@/types/theme.types";
import { monospaceFont, radii, spacing, type } from "@/theme/tokens";
import { useTheme } from "@/hooks/useTheme";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { Banner } from "@/components/common/Banner";
import { Disclosure } from "@/components/common/Disclosure";
import { Icon } from "@/components/common/Icon";

/** Icon + muted label used as the summary line of quiet transcript rows. */
function QuietLabel({ icon, text }: { icon: IconName; text: string }) {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  return (
    <View style={styles.quiet}>
      <Icon name={icon} size={16} color={colors.textMuted} />
      <Text style={styles.muted} numberOfLines={1}>{text}</Text>
    </View>
  );
}

export function ReasoningItem({ items }: { items: readonly ItemOf<"reasoning">[] }) {
  const styles = useThemedStyles(createStyles);
  const visible = items.filter((item) => item.text.trim());
  if (!visible.length) return null;
  return (
    <Disclosure label="Show the agent's thinking" summary={<QuietLabel icon="sparkles-outline" text={visible.every((item) => item.complete) ? "Thought it through" : "Thinking…"} />}>
      {visible.map((item) => <Text key={item.id} style={styles.muted} selectable>{item.text}</Text>)}
    </Disclosure>
  );
}

export function MilestoneItem({ item }: { item: ItemOf<"milestone"> }) {
  const styles = useThemedStyles(createStyles);
  return <Text style={[styles.caption, styles.center]}>{item.text}</Text>;
}

const stepIcons = { pending: "ellipse-outline", running: "ellipse", completed: "checkmark-circle" } as const;

export function PlanItem({ item }: { item: ItemOf<"plan"> }) {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  const done = item.steps.filter((step) => step.state === "completed").length;
  const stepColors = { pending: colors.textTertiary, running: colors.tones.active.solid, completed: colors.tones.success.solid };
  return (
    <View style={styles.plan} accessibilityLabel={`Plan, ${done} of ${item.steps.length} steps done`}>
      <View style={styles.planHeader}>
        <Icon name="list" size={17} color={colors.text} />
        <Text style={styles.planTitle}>Plan</Text>
        <Text style={styles.caption}>{done} of {item.steps.length}</Text>
      </View>
      {item.steps.map((step, index) => (
        <View key={index} style={styles.step} accessibilityLabel={`${step.state}: ${step.text}`}>
          <Icon name={stepIcons[step.state]} size={18} color={stepColors[step.state]} />
          <Text style={[styles.stepText, step.state === "completed" && styles.stepDone]}>{step.text}</Text>
        </View>
      ))}
    </View>
  );
}

export function ChangesItem({ item }: { item: ItemOf<"changes"> }) {
  const styles = useThemedStyles(createStyles);
  const count = item.paths.length;
  return (
    <Disclosure label="Show changed files" summary={<QuietLabel icon="document-text-outline" text={`Changed ${count} ${count === 1 ? "file" : "files"}`} />}>
      {item.paths.map((path) => <Text key={path} style={styles.path} selectable numberOfLines={1}>{path}</Text>)}
      <Text style={styles.caption}>Review the full changes in Nora Desktop.</Text>
    </Disclosure>
  );
}

export function ReviewItem({ item }: { item: ItemOf<"review"> }) {
  const result = item.result;
  const text = result.status === "unavailable" ? "Changes couldn't be reviewed for this task."
    : result.scope === "turn" ? `Review ready: ${result.changes.length} ${result.changes.length === 1 ? "file" : "files"} changed`
    : `Review ready: ${result.paths.length} files in the workspace`;
  return <QuietLabel icon="git-compare-outline" text={text} />;
}

export function ConnectorSignInItem({ item }: { item: ItemOf<"connector-sign-in"> }) {
  return <Banner tone="attention" title={`${item.server} needs you to sign in`} message={item.reason ?? "Finish signing in to this connector in Nora Desktop on your computer."} />;
}

const createStyles = (theme: Theme) => ({
  quiet: { flexDirection: "row" as const, alignItems: "center" as const, gap: spacing.sm },
  muted: { ...type.subheadline, color: theme.colors.textMuted, flexShrink: 1 },
  caption: { ...type.footnote, color: theme.colors.textMuted },
  center: { textAlign: "center" as const },
  plan: { backgroundColor: theme.colors.codeBackground, borderRadius: radii.md, padding: spacing.md + 2, gap: spacing.sm + 2 },
  planHeader: { flexDirection: "row" as const, alignItems: "center" as const, gap: spacing.sm },
  planTitle: { ...type.subheadline, fontWeight: "600" as const, color: theme.colors.text, flex: 1 },
  step: { flexDirection: "row" as const, alignItems: "flex-start" as const, gap: spacing.sm + 2 },
  stepText: { ...type.subheadline, flex: 1, color: theme.colors.text },
  stepDone: { color: theme.colors.textMuted },
  path: { ...type.code, fontFamily: monospaceFont, color: theme.colors.text }
});
