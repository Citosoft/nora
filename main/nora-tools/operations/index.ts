import { createSettingsOperations } from "./settings";
import type { NoraToolDeps } from "@main/types/nora-tools/noraTools.types";
import type { NoraToolOperationOptions, NoraSettingsOptions } from "@main/types/nora-tools/operations.types";
import { createAppOperations } from "./app";
import { createAskOperations } from "./asks";
import { createMemoryOperations } from "./memory";
import { createBotOperations } from "./bots";
import { createTaskOperations } from "./tasks";
import { createThreadOperations } from "./threads";
import { createGroupOperations } from "./groups";

/**
 * Composes every tool domain. Nora and bot threads get different tool sets, and a bot answering in a group also reads that group;
 * group chats themselves get none (they run on Nora's coordinator).
 */
export function createNoraToolOperations(options: NoraToolOperationOptions & NoraSettingsOptions): NoraToolDeps {
  return {
    context(conversationId) {
      const conversation = options.host.header(conversationId)?.conversation;
      if (!conversation || conversation.group) return null;
      if (!conversation.bot) return { conversation, audience: "nora" };
      const parent = conversation.parentId ? options.host.header(conversation.parentId)?.conversation : undefined;
      return { conversation, audience: "bot", ...(parent?.group ? { group: parent } : {}) };
    },
    asks: createAskOperations(options),
    memory: createMemoryOperations(options),
    bots: createBotOperations(options),
    app: createAppOperations(options),
    settings: createSettingsOperations(options),
    threads: createThreadOperations(options),
    groups: createGroupOperations(options),
    tasks: createTaskOperations(options)
  };
}
