import { z } from "zod";
import type { Conversation, RuntimeRequest } from "@shared/types/conversation/contracts.types";
import type { AttentionNotice } from "@shared/types/conversation/attention.types";

/** Who is waiting on the user, worded for a notification, toast or inbox row. */
export const attentionNoticeSchema = z.object({ conversationId: z.string().min(1).max(512), who: z.string().min(1), title: z.string().min(1), body: z.string() }).strict();

/** Says who is waiting and, for a bot working for another thread, on whose behalf, so a hidden child thread is still recognisable. */
export function describeAttention(conversation: Conversation, parent: Conversation | null, request: RuntimeRequest): AttentionNotice {
  const who = conversation.bot?.name ?? conversation.title;
  const via = !parent ? "" : parent.group ? ` · in the group "${parent.title}"` : parent.direct ? ` · in your chat with ${parent.direct.name}` : ` · asked by ${parent.bot?.name ?? "Nora"}`;
  return { conversationId: conversation.id, who,
    title: request.kind === "approval" ? `${who} needs your approval` : `${who} has a question for you`,
    body: `${request.title}${via}` };
}
