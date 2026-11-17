import type { ConversationClient } from "@/components/app/types/conversationClient.types";
import type { ChatBranchBridge } from "@shared/ipc/types/chatBranchGateway.types";
import type { ChatBranchIds, ChatBranchTarget } from "@/components/app/types/chatPanels.types";

/** Fresh identities for one branch message. */
export function newBranchIds(): ChatBranchIds {
  return { createCommandId: crypto.randomUUID(), conversationId: crypto.randomUUID(), submitCommandId: crypto.randomUUID(), runId: crypto.randomUUID() };
}

/**
 * Sends a message in a branch tab and returns the branch thread's id. A draft's first message starts the branch in main;
 * later ones go straight to the thread, carrying the text as `chatText` so the branch shows it as the user's message.
 */
export async function sendBranchMessage(deps: { conversations: ConversationClient; branches: ChatBranchBridge }, target: ChatBranchTarget,
  chatId: string | null, text: string, ids: ChatBranchIds): Promise<string> {
  if (target.kind === "thread") {
    await deps.conversations.execute({ kind: "submit", commandId: ids.submitCommandId, conversationId: target.thread.id, runId: ids.runId,
      instruction: text, chatText: text });
    return target.thread.id;
  }
  if (!chatId) throw new Error("Send a message in the chat before branching from it.");
  return deps.branches.start({ chatId, botId: target.draft.botId, fromItemId: target.draft.from?.itemId ?? null, text, ids,
    ...(target.draft.title ? { title: target.draft.title } : {}) });
}
