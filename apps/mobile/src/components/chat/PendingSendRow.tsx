import { Text, View } from "react-native";
import type { PendingSendMessage } from "@/types/pendingCommand.types";
import type { Theme } from "@/types/theme.types";
import { spacing, type } from "@/theme/tokens";
import { useTheme } from "@/hooks/useTheme";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { Button } from "@/components/common/Button";
import { Icon } from "@/components/common/Icon";
import { UserBubble } from "./UserBubble";

interface PendingSendRowProps {
  command: PendingSendMessage;
  sending: boolean;
  onRetry: () => void;
  onDiscard: () => void;
}

/** A message that has not been confirmed by the computer yet; Retry resends it with the same IDs (never twice). */
export function PendingSendRow({ command, sending, onRetry, onDiscard }: PendingSendRowProps) {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  const failed = !sending && Boolean(command.lastError);
  return (
    <UserBubble text={command.instruction} delivery={failed ? "failed" : "pending"}>
      <View style={styles.statusLine} accessibilityLiveRegion="polite">
        {failed ? <Icon name="alert-circle" size={14} color={colors.danger} /> : null}
        <Text style={[styles.status, failed && styles.failedText]}>{sending ? "Sending…" : command.lastError ? `Not delivered. ${command.lastError}` : "Waiting to send…"}</Text>
      </View>
      {!sending ? (
        <View style={styles.actions}>
          <Button label="Discard" variant="ghost" compact onPress={onDiscard} accessibilityLabel="Discard this unsent message" />
          <Button label="Retry" compact onPress={onRetry} accessibilityLabel="Retry sending this message" />
        </View>
      ) : null}
    </UserBubble>
  );
}

const createStyles = (theme: Theme) => ({
  statusLine: { flexDirection: "row" as const, alignItems: "center" as const, gap: spacing.xs },
  status: { ...type.footnote, color: theme.colors.textMuted, textAlign: "right" as const },
  failedText: { color: theme.colors.danger },
  actions: { flexDirection: "row" as const, gap: spacing.xs }
});
