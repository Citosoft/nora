import type { Conversation } from "@shared/types/conversation/contracts.types";
import type { EffectiveBot } from "@shared/types/bots/bots.types";
import type { ThreadDocument } from "@/components/app/types/thread-workspace/state.types";
import type { ChatParticipants } from "@/components/app/types/chatPanels.types";

const face = ({ bot }: EffectiveBot) => ({ botId: bot.id, name: bot.name, role: bot.role, avatar: bot.avatar });

/** Who a chat is with: from the saved chat once it exists, otherwise from the draft and the workspace's bots. Null for ordinary threads. */
export function chatParticipants(conversation: Conversation | null, document: ThreadDocument, bots: readonly EffectiveBot[]): ChatParticipants | null {
  if (conversation?.direct) return { kind: "direct", bot: conversation.direct };
  if (conversation?.group) return { kind: "group", members: conversation.group.members, writer: conversation.group.writer, lead: conversation.group.lead };
  if (conversation) return null;
  const direct = document.direct;
  if (direct) { const bot = bots.find((entry) => entry.bot.id === direct.botId); return bot ? { kind: "direct", bot: face(bot) } : null; }
  const group = document.group;
  if (!group) return null;
  const members = group.botIds.flatMap((botId) => { const bot = bots.find((entry) => entry.bot.id === botId); return bot ? [face(bot)] : []; });
  return { kind: "group", members, writer: group.writer, lead: group.lead };
}
