import type { NoraMemoryOperations, NoraToolContext } from "@main/types/nora-tools/noraTools.types";
import type { NoraToolOperationOptions } from "@main/types/nora-tools/operations.types";

const RECALL_LIMIT = 20;

function botIdOf({ conversation }: NoraToolContext): string {
  if (!conversation.bot) throw new Error("Only bots keep notes.");
  return conversation.bot.botId;
}

export function createMemoryOperations(options: NoraToolOperationOptions): NoraMemoryOperations {
  return {
    remember(text, scope, context) {
      return options.memory.add({ botId: botIdOf(context), workspaceId: scope === "workspace" ? context.conversation.workspace.projectId : null,
        text, source: { kind: "bot", conversationId: context.conversation.id } });
    },
    recall(query, context) {
      return options.memory.search(botIdOf(context), context.conversation.workspace.projectId, query, RECALL_LIMIT);
    }
  };
}
