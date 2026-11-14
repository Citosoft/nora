import { editableNote } from "@main/bots/memory/editable";
import { memoryOwnerOf } from "@main/bots/memory/owner";
import type { BotMemoryEntry } from "@shared/types/bots/bots.types";
import type { NoraMemoryOperations, NoraToolContext } from "@main/types/nora-tools/noraTools.types";
import type { NoraToolOperationOptions } from "@main/types/nora-tools/operations.types";

const RECALL_LIMIT = 20;

/** Nora and every bot keep their own notes; group chats never reach here because they get no tools. */
export function createMemoryOperations(options: NoraToolOperationOptions): NoraMemoryOperations {
  const ownNote = (memoryId: string, { conversation }: NoraToolContext): BotMemoryEntry =>
    editableNote(options.memory, memoryId, memoryOwnerOf(conversation), conversation.workspace.projectId);
  return {
    remember(input, context) {
      const { conversation } = context;
      if (input.kind === "update") {
        ownNote(input.memoryId, context);
        return { note: options.memory.update(input.memoryId, input.text), updated: true };
      }
      return { note: options.memory.add({ botId: memoryOwnerOf(conversation), workspaceId: input.scope === "workspace" ? conversation.workspace.projectId : null,
        text: input.text, source: { kind: "bot", conversationId: conversation.id } }), updated: false };
    },
    recall(query, { conversation }) {
      return options.memory.search(memoryOwnerOf(conversation), conversation.workspace.projectId, query, RECALL_LIMIT);
    },
    forget(memoryId, context) {
      const note = ownNote(memoryId, context);
      options.memory.remove(memoryId);
      return note;
    }
  };
}
