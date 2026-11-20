import type { ConversationSummary } from "@shared/types/conversation/queries.types";
import type { Conversation } from "@shared/types/conversation/contracts.types";
import type { NoraThreadOperations, NoraThreadMessage, NoraToolContext } from "@main/types/nora-tools/noraTools.types";
import type { NoraToolOperationOptions } from "@main/types/nora-tools/operations.types";
import { ownsWorker } from "./workerOwnership";

const MESSAGE_MAX_CHARS = 6000;
const HISTORY_PAGE = 200;

function threadStatus({ conversation, latestRun, pendingRequestCount, queuedCount }: ConversationSummary): string {
  if (conversation.archivedAt) return "settled";
  if (pendingRequestCount) return latestRun?.state === "awaiting-approval" ? "needs approval" : "needs input";
  if (conversation.queuePaused && queuedCount) return "queue paused";
  return latestRun ? latestRun.state.replace("-", " ") : "ready";
}

/** Bots can revisit their own threads and workers they started; Nora sees every thread on its host. */
function visibleTo(conversation: Conversation, { conversation: current, audience }: NoraToolContext, owner: Conversation | null): boolean {
  if (conversation.workspace.environmentId !== current.workspace.environmentId) return false;
  return audience === "nora" || (!!current.bot && (conversation.bot?.botId === current.bot.botId || ownsWorker(conversation, current, owner)));
}

export function createThreadOperations(options: NoraToolOperationOptions): NoraThreadOperations {
  const visible = (conversation: Conversation, context: NoraToolContext): boolean =>
    visibleTo(conversation, context, conversation.parentId ? options.host.header(conversation.parentId)?.conversation ?? null : null);
  return {
    list(query, context) {
      const current = context.conversation;
      const workspaces = new Map(options.boot().workspaces.map((entry) => [entry.id, entry.name]));
      return options.host.summaries()
        .filter(({ conversation }) => visible(conversation, context)
          && (query.allWorkspaces || conversation.workspace.projectId === current.workspace.projectId)
          && (query.includeSettled || !conversation.archivedAt))
        .sort((a, b) => b.conversation.updatedAt.localeCompare(a.conversation.updatedAt))
        .slice(0, query.limit)
        .map((summary) => ({ id: summary.conversation.id, title: summary.conversation.title,
          workspace: workspaces.get(summary.conversation.workspace.projectId) ?? summary.conversation.workspace.path,
          bot: summary.conversation.bot?.name ?? null, status: threadStatus(summary), updatedAt: summary.conversation.updatedAt,
          current: summary.conversation.id === current.id }));
    },
    read(conversationId, limit, context) {
      const header = options.host.header(conversationId);
      if (!header || !visible(header.conversation, context)) throw new Error(`No thread with id "${conversationId}". Call list_threads for the ids.`);
      const page = options.host.conversationHistory({ conversationId, scope: "timeline", limit: HISTORY_PAGE });
      if (page.scope !== "timeline") throw new Error("This thread's history could not be read.");
      const messages = page.items.flatMap((item): NoraThreadMessage[] => item.kind === "message" && item.complete && item.text.trim()
        ? [{ role: item.role, createdAt: item.createdAt,
          text: item.text.length > MESSAGE_MAX_CHARS ? `${item.text.slice(0, MESSAGE_MAX_CHARS)}\n[…message shortened]` : item.text }] : []);
      return { title: header.conversation.title, messages: messages.slice(-limit), truncated: messages.length > limit || page.nextBefore !== null };
    }
  };
}
