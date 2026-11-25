import type { BotBinding, BotDefinition, BotSnapshot } from "@shared/types/bots/bots.types";
import type { Conversation, ConversationRun, ProviderBinding, WorkspaceRef } from "@shared/types/conversation/contracts.types";
import type { BotAskInput, BotReply, BotRunnerDeps, BotThreadOptions, ConversationWatchInput } from "@main/types/bots/conversations.types";

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

/** A runnable binding: a saved permission policy, or the provider's default one for this workspace. `owner` names whose provider it is in errors. */
export async function runnableBinding(deps: BotRunnerDeps, binding: BotBinding, workspace: WorkspaceRef, owner: string): Promise<ProviderBinding> {
  if (binding.permissionPolicy) return { ...binding, permissionPolicy: binding.permissionPolicy };
  const catalog = await deps.host.catalog(binding.kind, binding.instanceId, workspace);
  const policy = catalog.status === "available" ? catalog.catalog.policies[0]?.id : undefined;
  if (!policy) throw new Error(`${owner} provider is unavailable${catalog.status === "unavailable" ? `: ${catalog.failure.message}` : "."}`);
  return { ...binding, permissionPolicy: policy };
}

/** Creates a child of `parent` (top-level when null); without `botId` it is an ordinary Nora thread. Callers that must survive a retry pass their own `ids`. */
async function createChildThread(deps: BotRunnerDeps, parent: Conversation | null, workspace: WorkspaceRef, title: string, provider: ProviderBinding,
  options: BotThreadOptions, botId?: string): Promise<string> {
  const receipt = await deps.host.execute({ kind: "create", commandId: options.ids?.commandId ?? deps.nextId(), conversationId: options.ids?.conversationId ?? deps.nextId(),
    ...(options.initialInstruction ? { initialInstruction: options.initialInstruction } : {}),
    title, workspace, provider, parentId: parent?.id ?? null, ...(botId ? { botId } : {}),
    ...(options.chatBranch ? { chatBranch: options.chatBranch } : {}), ...(options.done ? { done: options.done } : {}), ...(options.source ? { source: options.source } : {}) });
  return receipt.conversationId;
}

/**
 * Creates a thread that runs as the bot, with the bot's own model, in the given workspace; a child of `parent`, or top-level when null.
 * A `chatBranch` is a side chat the user started from `parent`.
 */
export async function createBotThread(deps: BotRunnerDeps, parent: Conversation | null, bot: BotDefinition, workspace: WorkspaceRef, title: string,
  options: BotThreadOptions = {}): Promise<string> {
  return createChildThread(deps, parent, workspace, title.slice(0, 100) || bot.name, await runnableBinding(deps, bot.binding, workspace, `${bot.name}'s`), options, bot.id);
}

/** Creates an ordinary Nora thread under `parent` on the given binding, for work Nora's direct chat takes on. */
export async function createNoraThread(deps: BotRunnerDeps, parent: Conversation, workspace: WorkspaceRef, title: string, provider: ProviderBinding,
  options: BotThreadOptions = {}): Promise<string> {
  return createChildThread(deps, parent, workspace, title.slice(0, 100) || "Nora", provider, options);
}

/** Finds the bot's unsettled child thread under `parent` (never a branch the user started), or creates one in the parent's workspace with the given access. */
export async function ensureBotThread(deps: BotRunnerDeps, parent: Conversation, bot: BotDefinition, access: "read" | "write", title: string): Promise<string> {
  const existing = deps.host.summaries().find(({ conversation }) => conversation.parentId === parent.id && conversation.bot?.botId === bot.id && !conversation.archivedAt && !conversation.chatBranch);
  if (existing) {
    // Reuse when access matches, or when we only need read (a write child already can inspect). Promote read→write by settling the old child.
    if (existing.conversation.workspace.access === access || access === "read") return existing.conversation.id;
    await deps.host.execute({ kind: "archive", commandId: deps.nextId(), conversationId: existing.conversation.id });
  }
  return createBotThread(deps, parent, bot, { ...parent.workspace, access }, title);
}

/** The last complete assistant message of one run, or of the whole thread when `runId` is null. */
export function finalAssistantText(deps: BotRunnerDeps, conversationId: string, runId: string | null): string | null {
  const page = deps.host.conversationHistory({ conversationId, scope: "timeline", limit: 200 });
  if (page.scope !== "timeline") return null;
  const message = page.items.filter((item) => item.kind === "message" && item.role === "assistant" && (runId === null || item.runId === runId) && item.complete && item.text.trim()).at(-1);
  return message?.kind === "message" ? message.text : null;
}

/**
 * Watches one conversation's events after `after` until `settle` returns a value, the timeout passes or the caller aborts.
 * The shared primitive behind waiting on a bot's reply and on worker threads.
 */
export function watchConversation<T>(deps: BotRunnerDeps, input: ConversationWatchInput<T>): Promise<T | "timed-out" | "aborted"> {
  return new Promise((resolve) => {
    let settled = false;
    let unsubscribe = () => {};
    const settle = (value: T | "timed-out" | "aborted"): void => {
      if (settled) return;
      settled = true; clearTimeout(timer); input.signal.removeEventListener("abort", abort); unsubscribe(); resolve(value);
    };
    const abort = (): void => settle("aborted");
    const timer = setTimeout(() => settle("timed-out"), input.timeoutMs);
    input.signal.addEventListener("abort", abort, { once: true });
    unsubscribe = deps.host.subscribe({ after: input.after, conversationId: input.conversationId, onError: () => settle("aborted"),
      onEvent(event) {
        const value = input.settle(event);
        if (value !== undefined) settle(value);
      } });
    if (settled) unsubscribe();
    if (input.signal.aborted) abort();
  });
}

/** Starts one instruction on a bot thread and returns the run id and event cursor to watch from. */
export async function startBotAsk(deps: BotRunnerDeps, input: Pick<BotAskInput, "conversationId" | "instruction" | "workspaceId" | "chatText" | "signal">): Promise<{ runId: string; after: number }> {
  input.signal.throwIfAborted();
  const runId = deps.nextId();
  const after = deps.host.eventCursor();
  await deps.host.execute({ kind: "submit", commandId: deps.nextId(), conversationId: input.conversationId, runId, instruction: input.instruction,
    ...(input.workspaceId ? { workspaceId: input.workspaceId } : {}), ...(input.chatText ? { chatText: input.chatText } : {}) });
  return { runId, after };
}

/** Watches a started ask until that run finishes, interrupting it if the caller gives up (unless continueOnTimeout). */
export async function followBotAsk(deps: BotRunnerDeps, input: BotAskInput & { runId: string; after: number }): Promise<BotReply> {
  let waitingReported = false;
  const run = await watchConversation<ConversationRun>(deps, { conversationId: input.conversationId, after: input.after, signal: input.signal, timeoutMs: input.timeoutMs,
    settle(event) {
      if (event.payload.kind === "request" && event.payload.request.runId === input.runId && event.payload.request.status === "pending" && !waitingReported) {
        waitingReported = true; input.onWaiting?.();
      }
      return event.payload.kind === "run" && event.payload.run.id === input.runId && (TERMINAL.has(event.payload.run.state) || event.payload.run.state === "recovering") ? event.payload.run : undefined;
    } });
  if (run === "aborted" || run === "timed-out") {
    if (run === "aborted" || !input.continueOnTimeout) {
      await deps.host.execute({ kind: "interrupt", commandId: deps.nextId(), conversationId: input.conversationId, runId: input.runId }).catch(() => undefined);
    }
    return { conversationId: input.conversationId, status: run === "aborted" ? "interrupted" : "timed-out", text: finalAssistantText(deps, input.conversationId, input.runId), failure: null };
  }
  const status = run.state === "completed" ? "completed" : run.state === "failed" ? "failed" : "interrupted";
  return { conversationId: input.conversationId, status, text: finalAssistantText(deps, input.conversationId, input.runId), failure: run.failure?.message ?? null };
}

/** Sends one instruction to a bot thread and waits for that run to finish, interrupting it if the caller gives up. */
export async function askBotThread(deps: BotRunnerDeps, input: BotAskInput): Promise<BotReply> {
  const started = await startBotAsk(deps, input);
  return followBotAsk(deps, { ...input, ...started });
}

export function authorOf(bot: Pick<BotSnapshot, "botId" | "name" | "avatar"> | BotDefinition): { kind: "bot"; botId: string; name: string; avatar: BotDefinition["avatar"] } {
  return { kind: "bot", botId: "botId" in bot ? bot.botId : bot.id, name: bot.name, avatar: bot.avatar };
}
