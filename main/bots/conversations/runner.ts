import type { BotDefinition, BotSnapshot } from "@shared/types/bots/bots.types";
import type { Conversation, ConversationRun, ProviderBinding, WorkspaceRef } from "@shared/types/conversation/contracts.types";
import type { BotAskInput, BotReply, BotRunnerDeps } from "@main/types/bots/conversations.types";

const TERMINAL = new Set<ConversationRun["state"]>(["completed", "failed", "interrupted"]);
const CHAIN_LIMIT = 32;

/** The thread and every ancestor, nearest first; used to bound and de-cycle bot-to-bot chains. */
export function conversationChain(deps: BotRunnerDeps, conversation: Conversation): Conversation[] {
  const chain = [conversation];
  for (let current = conversation; current.parentId && chain.length < CHAIN_LIMIT;) {
    const parent = deps.host.header(current.parentId)?.conversation;
    if (!parent) break;
    chain.push(parent); current = parent;
  }
  return chain;
}

async function bindingFor(deps: BotRunnerDeps, bot: BotDefinition, workspace: WorkspaceRef): Promise<ProviderBinding> {
  if (bot.binding.permissionPolicy) return { ...bot.binding, permissionPolicy: bot.binding.permissionPolicy };
  const catalog = await deps.host.catalog(bot.binding.kind, bot.binding.instanceId, workspace);
  const policy = catalog.status === "available" ? catalog.catalog.policies[0]?.id : undefined;
  if (!policy) throw new Error(`${bot.name}'s provider is unavailable${catalog.status === "unavailable" ? `: ${catalog.failure.message}` : "."}`);
  return { ...bot.binding, permissionPolicy: policy };
}

/** Creates a child thread of `parent` that runs as the bot, with the bot's own model, in the given workspace. */
export async function createBotThread(deps: BotRunnerDeps, parent: Conversation, bot: BotDefinition, workspace: WorkspaceRef, title: string): Promise<string> {
  const receipt = await deps.host.execute({ kind: "create", commandId: deps.nextId(), conversationId: deps.nextId(), title: title.slice(0, 100) || bot.name,
    workspace, provider: await bindingFor(deps, bot, workspace), parentId: parent.id, botId: bot.id });
  return receipt.conversationId;
}

/** Finds the bot's unsettled child thread under `parent`, or creates one in the parent's workspace with the given access. */
export async function ensureBotThread(deps: BotRunnerDeps, parent: Conversation, bot: BotDefinition, access: "read" | "write", title: string): Promise<string> {
  const existing = deps.host.summaries().find(({ conversation }) => conversation.parentId === parent.id && conversation.bot?.botId === bot.id && !conversation.archivedAt);
  return existing ? existing.conversation.id : createBotThread(deps, parent, bot, { ...parent.workspace, access }, title);
}

function finalAssistantText(deps: BotRunnerDeps, conversationId: string, runId: string): string | null {
  const page = deps.host.conversationHistory({ conversationId, scope: "timeline", limit: 200 });
  if (page.scope !== "timeline") return null;
  const message = page.items.filter((item) => item.kind === "message" && item.role === "assistant" && item.runId === runId && item.complete && item.text.trim()).at(-1);
  return message?.kind === "message" ? message.text : null;
}

/** Sends one instruction to a bot thread and waits for that run to finish, interrupting it if the caller gives up. */
export async function askBotThread(deps: BotRunnerDeps, input: BotAskInput): Promise<BotReply> {
  const runId = deps.nextId();
  const after = deps.host.eventCursor();
  await deps.host.execute({ kind: "submit", commandId: deps.nextId(), conversationId: input.conversationId, runId, instruction: input.instruction });
  const run = await new Promise<ConversationRun | "timed-out" | "aborted">((resolve) => {
    let waitingReported = false;
    const settle = (value: ConversationRun | "timed-out" | "aborted"): void => { clearTimeout(timer); input.signal.removeEventListener("abort", abort); unsubscribe(); resolve(value); };
    const abort = (): void => settle("aborted");
    const timer = setTimeout(() => settle("timed-out"), input.timeoutMs);
    input.signal.addEventListener("abort", abort, { once: true });
    const unsubscribe = deps.host.subscribe({ after, conversationId: input.conversationId, onError: () => {},
      onEvent(event) {
        if (event.payload.kind === "request" && event.payload.request.runId === runId && event.payload.request.status === "pending" && !waitingReported) {
          waitingReported = true; input.onWaiting?.();
        }
        if (event.payload.kind === "run" && event.payload.run.id === runId && TERMINAL.has(event.payload.run.state)) settle(event.payload.run);
      } });
    if (input.signal.aborted) abort();
  });
  if (run === "aborted" || run === "timed-out") {
    await deps.host.execute({ kind: "interrupt", commandId: deps.nextId(), conversationId: input.conversationId, runId }).catch(() => undefined);
    return { conversationId: input.conversationId, status: run === "aborted" ? "interrupted" : "timed-out", text: finalAssistantText(deps, input.conversationId, runId), failure: null };
  }
  const status = run.state === "completed" ? "completed" : run.state === "failed" ? "failed" : "interrupted";
  return { conversationId: input.conversationId, status, text: finalAssistantText(deps, input.conversationId, runId), failure: run.failure?.message ?? null };
}

export function authorOf(bot: Pick<BotSnapshot, "botId" | "name" | "avatar"> | BotDefinition): { kind: "bot"; botId: string; name: string; avatar: BotDefinition["avatar"] } {
  return { kind: "bot", botId: "botId" in bot ? bot.botId : bot.id, name: bot.name, avatar: bot.avatar };
}
