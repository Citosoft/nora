import { describeAttention } from "@shared/conversations/attention";
import type { ConversationHeader, ConversationSummary } from "@shared/types/conversation/queries.types";
import type { RuntimeRequest } from "@shared/types/conversation/contracts.types";
import type { AttentionSource, AttentionToast, InlineQuestion } from "@/components/app/types/attentionToasts.types";

const INLINE_OPTIONS_MAX = 4;

/** Unsettled threads with waiting requests among those `include` picks. */
export function attentionSources(summaries: readonly ConversationSummary[], include: (summary: ConversationSummary) => boolean): AttentionSource[] {
  return summaries.filter((summary) => summary.pendingRequestCount > 0 && !summary.conversation.archivedAt && include(summary))
    .map(({ conversation, pendingRequestCount, latestRun }) => ({ conversationId: conversation.id, revision: `${pendingRequestCount}:${latestRun?.updatedAt ?? ""}` }));
}

/** One toast per waiting request, oldest first, worded like the desktop notification. */
export function buildAttentionToasts(sources: readonly AttentionSource[], headers: ReadonlyMap<string, ConversationHeader>,
  summaries: readonly ConversationSummary[], dismissed: ReadonlySet<string>): AttentionToast[] {
  const conversations = new Map(summaries.map(({ conversation }) => [conversation.id, conversation]));
  return sources.flatMap(({ conversationId }) => {
    const header = headers.get(conversationId);
    if (!header) return [];
    const parent = header.conversation.parentId ? conversations.get(header.conversation.parentId) ?? null : null;
    return header.pendingRequests.filter((request) => request.status === "pending" && !dismissed.has(request.id))
      .map((request) => ({ request, conversation: header.conversation, notice: describeAttention(header.conversation, parent, request) }));
  }).sort((a, b) => a.request.createdAt.localeCompare(b.request.createdAt));
}

export function inlineQuestion(request: RuntimeRequest): InlineQuestion | null {
  if (request.kind !== "question" || request.questions.length !== 1) return null;
  const [question] = request.questions;
  if (question.multiple || !question.options.length || question.options.length > INLINE_OPTIONS_MAX) return null;
  return { questionId: question.id, text: question.text, options: question.options };
}
