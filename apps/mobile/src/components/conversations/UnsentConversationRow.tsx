import { Text, View } from "react-native";
import type { PendingCreateBotChat, PendingCreateConversation } from "@/types/pendingCommand.types";
import type { Theme } from "@/types/theme.types";
import { layout, spacing, type } from "@/theme/tokens";
import { useTheme } from "@/hooks/useTheme";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { Button } from "@/components/common/Button";
import { Icon } from "@/components/common/Icon";

interface UnsentConversationRowProps {
  command: PendingCreateConversation | PendingCreateBotChat;
  sending: boolean;
  onRetry: () => void;
  onDiscard: () => void;
}

/** A new conversation whose start was not confirmed, shown above the composer; retrying reuses its IDs so it is never created twice. */
export function UnsentConversationRow({ command, sending, onRetry, onDiscard }: UnsentConversationRowProps) {
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();
  return (
    <View style={styles.row}>
      <Icon name="cloud-offline-outline" size={22} color={colors.tones.attention.solid} />
      <View style={styles.texts}>
        <Text style={styles.title} numberOfLines={1}>{command.title}</Text>
        <Text style={styles.detail} numberOfLines={2}>
          {command.created ? "Created, but the first message wasn't confirmed." : "Not started yet."}{command.lastError ? ` ${command.lastError}` : ""}
        </Text>
      </View>
      <Button label="Discard" variant="ghost" compact disabled={sending} onPress={onDiscard} accessibilityLabel={`Discard ${command.title}`} />
      <Button label="Retry" compact busy={sending} onPress={onRetry} accessibilityLabel={`Retry starting ${command.title}`} />
    </View>
  );
}

const createStyles = (theme: Theme) => ({
  row: { flexDirection: "row" as const, alignItems: "center" as const, gap: spacing.md, paddingHorizontal: layout.gutter + spacing.md },
  texts: { flex: 1, minWidth: 0 },
  title: { ...type.body, color: theme.colors.text },
  detail: { ...type.footnote, color: theme.colors.textMuted }
});
