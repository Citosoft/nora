import { memo } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import type { ToolActivity, ToolState } from "@shared/types/conversation/contracts.types";
import type { IconName } from "@/types/icon.types";
import type { Theme } from "@/types/theme.types";
import { monospaceFont, radii, spacing, type } from "@/theme/tokens";
import { tailText, toolStatePresentation } from "@/state/toolPresentation";
import { useTheme } from "@/hooks/useTheme";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { Disclosure } from "@/components/common/Disclosure";
import { Icon } from "@/components/common/Icon";

const stateIcons: Record<Exclude<ToolState, "running">, IconName> = {
  completed: "checkmark-circle",
  failed: "close-circle",
  declined: "remove-circle",
  interrupted: "stop-circle",
  unconfirmed: "help-circle"
};

/** The glyph leading a tool or helper-agent row: a spinner while running, otherwise a coloured state symbol. */
export function ToolStateGlyph({ state }: { state: ToolState }) {
  const { colors } = useTheme();
  if (state === "running") return <ActivityIndicator size="small" color={colors.textMuted} style={{ width: 17, height: 17 }} />;
  return <Icon name={stateIcons[state]} size={17} color={colors.tones[toolStatePresentation[state].tone].solid} />;
}

/** One tool call as a quiet row ("Ran npm test ›"); input and output expand underneath. */
export const ToolCard = memo(function ToolCard({ item }: { item: ToolActivity }) {
  const styles = useThemedStyles(createStyles);
  const state = toolStatePresentation[item.state];
  const output = tailText(item.output);
  const input = item.details?.input ?? item.details?.detail;
  return (
    <Disclosure label={`${item.label}, ${state.label}. Show details`} summary={
      <View style={styles.summary}>
        <ToolStateGlyph state={item.state} />
        <Text style={styles.label} numberOfLines={1}>{item.details?.skill ? `${item.label} · ${item.details.skill.name}` : item.label}</Text>
      </View>
    }>
      {input ? <Text style={styles.code} selectable numberOfLines={20}>{input}</Text> : null}
      {output.text ? (
        <>
          {output.truncated ? <Text style={styles.note}>Showing the end of the output.</Text> : null}
          <Text style={styles.code} selectable>{output.text}</Text>
        </>
      ) : <Text style={styles.note}>{item.state === "running" ? "Waiting for output…" : "No output."}</Text>}
      {item.details?.exitCode !== undefined ? <Text style={styles.note}>Exit code {item.details.exitCode}</Text> : null}
    </Disclosure>
  );
});

const createStyles = (theme: Theme) => ({
  summary: { flexDirection: "row" as const, alignItems: "center" as const, gap: spacing.sm },
  label: { ...type.subheadline, flexShrink: 1, color: theme.colors.textMuted },
  code: { ...type.code, fontFamily: monospaceFont, color: theme.colors.text, backgroundColor: theme.colors.codeBackground,
    padding: spacing.md - 2, borderRadius: radii.sm },
  note: { ...type.footnote, color: theme.colors.textMuted }
});
