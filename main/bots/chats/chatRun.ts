import type { BotAuthor } from "@shared/types/bots/bots.types";
import type { EmitProviderUpdate, ProviderExecution } from "@main/types/execution/provider.types";
import type { ChatRunOutput } from "@main/types/bots/chats.types";

/**
 * The run lifecycle every chat coordinator shares: binds and starts the run, then posts milestones and authored replies
 * (each linked to the work thread behind it) into the chat until it finishes.
 */
export function startChatRun({ snapshot, run }: ProviderExecution, emit: EmitProviderUpdate, now: () => string, label: string): ChatRunOutput {
  const base = { conversationId: snapshot.conversation.id, runId: run.id, attemptId: run.attemptId };
  let sequence = 0;
  const event = (name: string): string => `${name}:${++sequence}`;
  emit({ ...base, eventId: "bound", kind: "bound", nativeConversationId: snapshot.conversation.id });
  emit({ ...base, eventId: "started", kind: "started", nativeConversationId: snapshot.conversation.id, nativeTurnId: run.id });
  return {
    milestone: (text) => emit({ ...base, eventId: event("milestone"), kind: "item",
      item: { kind: "milestone", id: JSON.stringify([run.id, label, sequence]), runId: run.id, createdAt: now(), text } }),
    reply: (author: BotAuthor, text, workThreadId) => emit({ ...base, eventId: event("reply"), kind: "item",
      item: { kind: "message", id: JSON.stringify([run.id, "reply", sequence]), runId: run.id, createdAt: now(), role: "assistant", text, complete: true, author, workThreadId } }),
    finish: (status, message) => emit({ ...base, eventId: "finished", kind: "finished", status, usage: null,
      failure: status === "failed" ? { code: "provider", message: message ?? "The chat could not reply.", retryable: true } : null })
  };
}

/** Coordinator runs make no requests of their own and cannot resume mid-reply; work threads keep whatever they finished. */
export function reconcileChatRun({ snapshot, run }: ProviderExecution, emit: EmitProviderUpdate): void {
  emit({ conversationId: snapshot.conversation.id, runId: run.id, attemptId: run.attemptId, eventId: "reconciled", kind: "finished", status: "interrupted", usage: null, failure: null });
}
