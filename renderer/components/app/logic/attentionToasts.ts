import type { Conversation, RuntimeRequest } from "@shared/types/conversation/contracts.types";
import type { InboxItem } from "@shared/types/inbox/inbox.types";
import type { AttentionToast, InlineQuestion } from "@/components/app/types/attentionToasts.types";

const INLINE_OPTIONS_MAX = 4;

/**
 * One toast per waiting request in the threads `include` picks, oldest first, worded like the desktop notification. Workflow
 * stages are left to the workflow monitor and the inbox, which show them with their run.
 */
export function buildAttentionToasts(items: readonly InboxItem[], include: (conversation: Conversation) => boolean, dismissed: ReadonlySet<string>): AttentionToast[] {
  return items.flatMap((item) => item.kind === "request" && item.conversation.source?.kind !== "workflow" && !dismissed.has(item.request.id) && include(item.conversation)
    ? [{ request: item.request, conversation: item.conversation, notice: item.notice }] : [])
    .sort((a, b) => a.request.createdAt.localeCompare(b.request.createdAt));
}

export function inlineQuestion(request: RuntimeRequest): InlineQuestion | null {
  if (request.kind !== "question" || request.questions.length !== 1) return null;
  const [question] = request.questions;
  if (question.multiple || !question.options.length || question.options.length > INLINE_OPTIONS_MAX) return null;
  return { questionId: question.id, text: question.text, options: question.options };
}
