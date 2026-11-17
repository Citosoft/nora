import { askBotThreadMark } from "@shared/nora-tools/askBot";
import { effectiveBots } from "@shared/bots/catalog";
import { askBotThread, conversationChain, ensureBotThread } from "@main/bots/conversations/runner";
import type { NoraAskOperations } from "@main/types/nora-tools/noraTools.types";
import type { NoraToolOperationOptions } from "@main/types/nora-tools/operations.types";

/** Bot threads an ask chain may pass through, counting the caller; keeps bots from bouncing work between each other. */
export const ASK_DEPTH_LIMIT = 4;
const ASK_TIMEOUT_MS = 15 * 60_000;

export function createAskOperations(options: NoraToolOperationOptions): NoraAskOperations {
  return {
    async ask(target, message, { conversation }, signal) {
      const boot = options.boot();
      const wanted = target.trim().toLocaleLowerCase();
      const bots = effectiveBots(boot.personalization.bots, conversation.workspace.projectId, boot.sharedBots).map((entry) => entry.bot);
      const bot = bots.find((entry) => entry.id === wanted) ?? bots.find((entry) => entry.name.toLocaleLowerCase() === wanted);
      if (!bot) throw new Error(`No bot called "${target}" here. Available: ${bots.map((entry) => entry.name).join(", ") || "none"}.`);
      if (conversation.bot?.botId === bot.id) throw new Error("A bot cannot ask itself. Answer directly instead.");
      const deps = { host: options.host, nextId: options.nextId };
      const chain = conversationChain(deps, conversation);
      if (chain.some((entry) => entry.bot?.botId === bot.id)) throw new Error(`${bot.name} is already waiting on this conversation, so asking it again would loop. Answer with what you have.`);
      if (chain.filter((entry) => entry.bot).length >= ASK_DEPTH_LIMIT) throw new Error(`This chain of bots asking bots has reached its limit of ${ASK_DEPTH_LIMIT}. Answer with what you have.`);
      const caller = conversation.bot?.name ?? "Nora, on the user's behalf";
      const threadId = await ensureBotThread(deps, conversation, bot, "read", `${bot.name}: ${message.split("\n")[0]}`);
      const reply = await askBotThread(deps, { conversationId: threadId, signal, timeoutMs: ASK_TIMEOUT_MS,
        instruction: `${caller} asks you (in thread "${conversation.title}"):\n\n${message}` });
      if (reply.status === "completed" && reply.text) return { botName: bot.name, conversationId: threadId, reply: reply.text };
      const where = `See its thread ${askBotThreadMark(threadId)}.`;
      if (reply.status === "timed-out") throw new Error(`${bot.name} did not answer within ${ASK_TIMEOUT_MS / 60_000} minutes, so the request was stopped. ${where}`);
      if (reply.status === "interrupted") throw new Error(`${bot.name}'s reply was stopped before it finished. ${where}`);
      throw new Error(`${bot.name} could not answer${reply.failure ? `: ${reply.failure}` : "."} ${where}`);
    }
  };
}
