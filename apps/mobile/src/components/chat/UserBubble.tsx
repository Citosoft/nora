import type { ReactNode } from "react";
import { Text, View } from "react-native";
import type { Theme } from "@/types/theme.types";
import { radii, spacing, type } from "@/theme/tokens";
import { useThemedStyles } from "@/hooks/useThemedStyles";

interface UserBubbleProps {
  text: string;
  /** Sent messages are solid; unsent ones are faded until the computer confirms them, and outlined in red when delivery failed. */
  delivery?: "sent" | "pending" | "failed";
  /** Shown under the bubble, right-aligned (delivery status and actions). */
  children?: ReactNode;
}

/** The user's own message: a right-aligned bubble with room on the left so it never spans the full column. */
export function UserBubble({ text, delivery = "sent", children }: UserBubbleProps) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.row}>
      <View style={[styles.bubble, delivery === "pending" && styles.pending, delivery === "failed" && styles.failed]}
        accessibilityLabel={delivery === "sent" ? `You said: ${text}` : undefined}>
        <Text style={styles.text} selectable>{text}</Text>
      </View>
      {children}
    </View>
  );
}

const createStyles = (theme: Theme) => ({
  row: { alignItems: "flex-end" as const, gap: spacing.xs, paddingLeft: 48 },
  bubble: { backgroundColor: theme.colors.userBubble, borderRadius: radii.lg + 2, paddingHorizontal: spacing.md + 2, paddingVertical: spacing.sm + 2 },
  pending: { opacity: 0.6 },
  failed: { borderWidth: 1, borderColor: theme.colors.danger },
  text: { ...type.body, lineHeight: 23, color: theme.colors.userBubbleText }
});
