import { createSettingsOperations } from "./settings";
import type { NoraToolDeps } from "@main/types/nora-tools/noraTools.types";
import type { NoraToolOperationOptions, NoraSettingsOptions } from "@main/types/nora-tools/operations.types";
import { createAppOperations } from "./app";
import { createAppsOperations } from "./apps";
import { createAskOperations } from "./asks";
import { createMemoryOperations } from "./memory";
import { createSecretOperations } from "./secrets";
import { createBotOperations } from "./bots";
import { createTaskOperations } from "./tasks";
import { createThreadOperations } from "./threads";
import { createChatOperations } from "./chats";
import { createWorkflowOperations } from "./workflows";
import { createWorkerOperations } from "./workers";

/**
 * Composes every tool domain. Nora and bot threads get different tool sets, and a bot answering in a group or direct chat also reads
 * that chat; the chats themselves get none (they run on Nora's coordinators).
 */
export function createNoraToolOperations(options: NoraToolOperationOptions & NoraSettingsOptions): NoraToolDeps {
  const tasks = createTaskOperations(options);
  return {
    context(conversationId) {
      const conversation = options.host.header(conversationId)?.conversation;
      if (!conversation || conversation.group || conversation.direct) return null;
      if (!conversation.bot) return { conversation, audience: "nora" };
      const parent = conversation.parentId ? options.host.header(conversation.parentId)?.conversation : undefined;
      return { conversation, audience: "bot", ...(parent?.group || parent?.direct ? { chat: parent } : {}) };
    },
    asks: createAskOperations(options),
    memory: createMemoryOperations(options),
    secrets: createSecretOperations(options),
    bots: createBotOperations(options),
    app: createAppOperations(options),
    apps: createAppsOperations(options),
    settings: createSettingsOperations(options),
    threads: createThreadOperations(options),
    chats: createChatOperations(options),
    tasks,
    workflows: createWorkflowOperations(options, tasks),
    workers: createWorkerOperations(options)
  };
}
