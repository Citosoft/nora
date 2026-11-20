import { useState } from "react";
import type { InboxEntryRowProps } from "@/types/inbox.types";
import { inboxTier } from "@shared/inbox/projection";
import { relativeTime } from "@/state/relativeTime";
import { describeInboxEntry, inboxEntryOptions } from "@/state/inbox";
import { useTheme } from "@/hooks/useTheme";
import { ActionSheet } from "@/components/common/ActionSheet";
import { BotAvatar } from "@/components/common/BotAvatar";
import { ListRow } from "@/components/common/ListRow";

/** A finished conversation, a workflow run or a connector. Finished conversations open; a long press offers read, done and snooze. */
export function InboxEntryRow({ item, now, onOpen, onCommand }: InboxEntryRowProps) {
  const { colors } = useTheme();
  const [menu, setMenu] = useState(false);
  const entry = describeInboxEntry(item);
  const opens = item.kind === "outcome";
  const options = onCommand ? inboxEntryOptions(item, now, onCommand) : [];
  const unread = inboxTier(item) === "update" && !item.readAt;
  const bot = item.kind === "outcome" ? item.conversation.bot : undefined;
  return (
    <>
      <ListRow title={unread ? `● ${entry.title}` : entry.title} subtitle={entry.detail} value={relativeTime(item.occurredAt, now)}
        accessibilityLabel={[entry.title, unread ? "unread" : null, entry.detail].filter(Boolean).join(", ")}
        leading={bot ? <BotAvatar avatar={bot.avatar} name={bot.name} size={29} /> : undefined}
        icon={bot ? undefined : { icon: entry.icon, color: entry.tone === "warning" ? colors.tones.attention.solid : entry.tone === "danger" ? colors.danger : colors.accent }}
        accessory={opens ? "chevron" : "none"} onPress={opens ? () => onOpen(item) : undefined}
        onLongPress={options.length ? () => setMenu(true) : undefined} accessibilityHint={options.length ? "Long press for more actions" : undefined} />
      <ActionSheet visible={menu} title={entry.title} options={options} onClose={() => setMenu(false)} />
    </>
  );
}
