import { Text, View } from "react-native";
import type { ConversationView } from "@shared/types/conversation/conversationView.types";
import { TURN_ACTIVITY_ORBS } from "@shared/conversations/turnActivityOrbs";
import type { Theme } from "@/types/theme.types";
import { spacing, type } from "@/theme/tokens";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { useTheme } from "@/hooks/useTheme";
import { conversationTurnStatus } from "@/state/turnStatus";
import { Icon } from "@/components/common/Icon";
import { ThinkingOrb } from "@/components/visuals/ThinkingOrb";

export function TurnStatus({ view }: { view: ConversationView }) {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  const { activity, label } = conversationTurnStatus(view);
  if (!label) return null;
  return <View style={styles.row} accessibilityRole="status" accessibilityLiveRegion="polite">
    {activity ? <ThinkingOrb state={TURN_ACTIVITY_ORBS[activity.kind]} /> : <Icon name="time-outline" size={16} color={colors.textMuted} />}
    <Text style={styles.text}>{label}</Text>
  </View>;
}

const createStyles = (theme: Theme) => ({
  row: { flexDirection: "row" as const, alignItems: "center" as const, gap: spacing.sm },
  text: { ...type.subheadline, color: theme.colors.textMuted, flexShrink: 1 }
});
