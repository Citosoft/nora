import { effectiveBots } from "@shared/bots/catalog";
import { chatParticipants } from "@/components/app/logic/chatParticipants";
import { threadDocumentTitle } from "@/components/app/logic/thread-workspace/changes";
import type { ThreadDocument, ThreadWorkspaceSnapshot } from "@/components/app/types/thread-workspace/state.types";
import type { WorkspaceSessionTab } from "@/components/app/types/workflow.types";

/** Open thread documents as primary workspace tabs; bot chats carry their participants so the tab can show the bot's face. */
export function buildThreadSessionTabs(state: ThreadWorkspaceSnapshot, documents: readonly ThreadDocument[], workspaceId: string | null): WorkspaceSessionTab[] {
  if (!documents.length) return [];
  const bots = effectiveBots(state.boot.personalization.bots, workspaceId, state.boot.sharedBots);
  return documents.map((document) => {
    const conversationId = document.target.kind === "thread" ? document.target.conversationId : null;
    const conversation = state.summaries.find((entry) => entry.conversation.id === conversationId)?.conversation ?? null;
    return { kind: "thread", id: document.id, name: threadDocumentTitle(document, state.summaries),
      status: state.runtime[document.id]?.error ? "error" : "idle", participants: chatParticipants(conversation, document, bots) };
  });
}
