import { askBotThreadMark, formatAskBotFinishedNotice } from "@shared/nora-tools/askBot";
import type { AskBotWait } from "@shared/nora-tools/askBot";
import { conversationChain, ensureBotThread, followBotAsk, startBotAsk } from "@main/bots/conversations/runner";
import { findBotTarget } from "./botTarget";
import type { NoraAskOperations } from "@main/types/nora-tools/noraTools.types";
import type { NoraToolOperationOptions } from "@main/types/nora-tools/operations.types";
import type { BotReply, BotRunnerDeps } from "@main/types/bots/conversations.types";

/** Bot threads an ask chain may pass through, counting the caller; keeps bots from bouncing work between each other. */
export const ASK_DEPTH_LIMIT = 4;
// Some runtimes cap MCP calls at 300 seconds even when Nora advertises a longer limit.
const ASK_TIMEOUT_MS = 270_000;
/** Background follow for notify-mode asks: long enough for real work, without interrupting the child if the watch ends. */
const NOTIFY_FOLLOW_MS = 60 * 60_000;

/** Posts the child's outcome into the asking thread so the parent can continue after a notify-mode ask. */
async function notifyParent(deps: BotRunnerDeps, parentId: string, botName: string, childId: string, reply: BotReply): Promise<void> {
  const parent = deps.host.header(parentId)?.conversation;
  if (!parent || parent.archivedAt) return;
  if (reply.status === "timed-out") return;
  await deps.host.execute({
    kind: "submit",
    commandId: deps.nextId(),
    conversationId: parentId,
    runId: deps.nextId(),
    instruction: formatAskBotFinishedNotice(botName, childId, reply)
  }).catch(() => undefined);
}

export function createAskOperations(options: NoraToolOperationOptions): NoraAskOperations {
  return {
    async ask(target, message, wait: AskBotWait, { conversation }, signal) {
      const startedAt = performance.now();
      signal.throwIfAborted();
      const bot = findBotTarget(options, conversation.workspace.projectId, target);
      if (conversation.bot?.botId === bot.id) throw new Error("A bot cannot ask itself. Answer directly instead.");
      const deps = { host: options.host, nextId: options.nextId };
      const chain = conversationChain(deps, conversation);
      if (chain.some((entry) => entry.bot?.botId === bot.id)) throw new Error(`${bot.name} is already waiting on this conversation, so asking it again would loop. Answer with what you have.`);
      if (chain.filter((entry) => entry.bot).length >= ASK_DEPTH_LIMIT) throw new Error(`This chain of bots asking bots has reached its limit of ${ASK_DEPTH_LIMIT}. Answer with what you have.`);
      const caller = conversation.bot?.name ?? "Nora, on the user's behalf";
      // Global bots are not workspace-scoped; they always get write. Workspace bots stay within the caller's access.
      const access = bot.scope.kind === "global" ? "write" : conversation.workspace.access;
      const threadId = await ensureBotThread(deps, conversation, bot, access, `${bot.name}: ${message.split("\n")[0]}`);
      // Keep the handoff to the brief alone — the child session must not re-pay the caller's chat history.
      const instruction = `${caller} asks you (in thread "${conversation.title}"):\n\n${message.trim()}`;
      const started = await startBotAsk(deps, { conversationId: threadId, instruction, signal });

      if (wait === "notify") {
        // Detached from the tool call's abort: the parent continues while the child works, then Nora posts the result.
        const background = new AbortController();
        void followBotAsk(deps, { conversationId: threadId, instruction, signal: background.signal, timeoutMs: NOTIFY_FOLLOW_MS,
          continueOnTimeout: true, ...started })
          .then((reply) => notifyParent(deps, conversation.id, bot.name, threadId, reply))
          .catch(() => undefined);
        return { status: "working", botName: bot.name, conversationId: threadId, reason: "notify" };
      }

      const timeoutMs = Math.max(0, ASK_TIMEOUT_MS - (performance.now() - startedAt));
      const reply = await followBotAsk(deps, { conversationId: threadId, instruction, signal, timeoutMs, continueOnTimeout: true, ...started });
      if (reply.status === "completed" && reply.text) return { status: "replied", botName: bot.name, conversationId: threadId, reply: reply.text };
      const where = `See its thread ${askBotThreadMark(threadId)}.`;
      if (reply.status === "timed-out") return { status: "working", botName: bot.name, conversationId: threadId, reason: "timeout" };
      if (reply.status === "interrupted") throw new Error(`${bot.name}'s reply was stopped before it finished. ${where}`);
      throw new Error(`${bot.name} could not answer${reply.failure ? `: ${reply.failure}` : "."} ${where}`);
    }
  };
}
