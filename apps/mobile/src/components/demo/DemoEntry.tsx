import { Text, View } from "react-native";
import type { Theme } from "@/types/theme.types";
import { spacing, type } from "@/theme/tokens";
import { Button } from "@/components/common/Button";
import { useDemoMode } from "@/hooks/useDemoMode";
import { useThemedStyles } from "@/hooks/useThemedStyles";

const hint = "Try sample chats, bots and approvals without signing in or connecting a computer. Everything in the demo is simulated.";

/** A public, documented preview; never pretends to authenticate a real account. `compact` is a single quiet link for tight screens. */
export function DemoEntry({ compact = false }: { compact?: boolean }) {
  const styles = useThemedStyles(createStyles);
  const { enter } = useDemoMode();
  if (compact) return <Button label="Or explore the demo, no account needed" variant="ghost" compact onPress={enter} accessibilityHint={hint} />;
  return (
    <View style={styles.entry}>
      <Button label="Explore the demo" icon="play-circle-outline" onPress={enter} accessibilityHint={hint} />
      <Text style={styles.note}>No account or computer needed. Everything in the demo is simulated.</Text>
    </View>
  );
}

const createStyles = (theme: Theme) => ({
  entry: { gap: spacing.sm },
  note: { ...type.footnote, color: theme.colors.textMuted, textAlign: "center" as const }
});
