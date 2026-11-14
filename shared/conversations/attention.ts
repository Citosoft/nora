import type { Conversation, RuntimeRequest } from "@shared/types/conversation/contracts.types";
import type { AttentionNotice } from "@shared/types/conversation/attention.types";

/** Main → window: open a thread, e.g. after the user clicks a "needs your approval" notification. */
export const openThreadChannel = "native:open-thread";

/** Says who is waiting and, for a bot working for another thread, on whose behalf, so a hidden child thread is still recognisable. */
export function describeAttention(conversation: Conversation, parent: Conversation | null, request: RuntimeRequest): AttentionNotice {
  const who = conversation.bot?.name ?? conversation.title;
  const via = !parent ? "" : parent.group ? ` · in the group "${parent.title}"` : parent.direct ? ` · in your chat with ${parent.direct.name}` : ` · asked by ${parent.bot?.name ?? "Nora"}`;
  return { conversationId: conversation.id, who,
    title: request.kind === "approval" ? `${who} needs your approval` : `${who} has a question for you`,
    body: `${request.title}${via}` };
}
