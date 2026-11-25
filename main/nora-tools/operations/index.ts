import { createSettingsOperations } from "./settings";
import type { NoraToolDeps } from "@main/types/nora-tools/noraTools.types";
import type { NoraToolOperationOptions, NoraSettingsOptions } from "@main/types/nora-tools/operations.types";
import { createAppOperations } from "./app";
import { createAppsOperations } from "./apps";
import { createAskOperations } from "./asks";
import { createMemoryOperations } from "./memory";
import { createSecretOperations } from "./secrets";
import { createBotOperations } from "./bots";
import { createRoutineOperations } from "./routines";
import { createTaskOperations } from "./tasks";
import { createTerminalOperations } from "./terminals";
import { createThreadOperations } from "./threads";
import { createChatOperations } from "./chats";
import { createWorkflowOperations } from "./workflows";
import { createWorkerOperations } from "./workers";

/**
 * Composes every tool domain. Nora, bot and plain-worker threads get different tool sets, and a bot answering in a group or
 * direct chat also reads that chat; the chats themselves get none (they run on Nora's coordinators).
 */
export function createNoraToolOperations(options: NoraToolOperationOptions & NoraSettingsOptions): NoraToolDeps {
  const tasks = createTaskOperations(options);
  return {
    context(conversationId) {
      const conversation = options.host.header(conversationId)?.conversation;
      if (!conversation || conversation.group || conversation.direct) return null;
      if (!conversation.bot) {
        // Bot-less workers stay usable for the brief without Nora admin/app/workflow catalogues.
        return { conversation, audience: conversation.source?.kind === "worker" ? "worker" : "nora" };
      }
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
    terminals: createTerminalOperations(options),
    routines: createRoutineOperations(options),
    workflows: createWorkflowOperations(options, tasks),
    workers: createWorkerOperations(options)
  };
}
