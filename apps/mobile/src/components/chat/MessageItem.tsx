import { memo } from "react";
import { Text, View } from "react-native";
import type { TimelineItemOf } from "@/types/conversationState.types";
import type { Theme } from "@/types/theme.types";
import { spacing, type } from "@/theme/tokens";
import { messageText } from "@/state/timelineEntries";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { BotAvatar } from "@/components/common/BotAvatar";
import { Markdown } from "@/components/markdown/Markdown";
import { UserBubble } from "./UserBubble";

/** User messages as right-aligned bubbles; assistant replies as full-width Markdown that updates in place while streaming. */
export const MessageItem = memo(function MessageItem({ item }: { item: TimelineItemOf<"message"> }) {
  const styles = useThemedStyles(createStyles);
  const text = messageText(item);
  if (item.role === "user") {
    return <UserBubble text={text} />;
  }
  return (
    <View style={styles.assistant} accessibilityLiveRegion={item.complete ? "none" : "polite"}>
      {item.author ? (
        <View style={styles.author}>
          <BotAvatar avatar={item.author.avatar} name={item.author.name} size={22} />
          <Text style={styles.authorName}>{item.author.name}</Text>
        </View>
      ) : null}
      {text ? <Markdown text={text} /> : null}
      {!item.complete ? <View style={styles.cursor} accessibilityLabel="Writing" /> : null}
    </View>
  );
});

const createStyles = (theme: Theme) => ({
  assistant: { gap: spacing.sm },
  author: { flexDirection: "row" as const, alignItems: "center" as const, gap: spacing.sm },
  authorName: { ...type.subheadline, fontWeight: "600" as const, color: theme.colors.text },
  cursor: { width: 10, height: 10, borderRadius: 5, backgroundColor: theme.colors.text, opacity: 0.6 }
});
