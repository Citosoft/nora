import { createBotThread, finalAssistantText, runnableBinding, watchConversation } from "@main/bots/conversations/runner";
import type { Conversation, ConversationSource, WorkspaceRef } from "@shared/types/conversation/contracts.types";
import type { ConversationHeader, ConversationSummary } from "@shared/types/conversation/queries.types";
import type { NoraWorkerOperations, NoraWorkerReport, NoraWorkerStatus, StartWorkerToolInput } from "@main/types/nora-tools/noraTools.types";
import type { NoraToolOperationOptions } from "@main/types/nora-tools/operations.types";
import { resolveBotBinding } from "./botBinding";
import { ownsWorker } from "./workerOwnership";
import { workerWorkspace } from "./workerWorkspace";
import { withDoneCriteria } from "@main/bots/conversations/doneCriteria";
import { findBotTarget } from "./botTarget";

/** Workers one thread may have working at once; keeps a runaway plan from flooding the machine with agents. */
export const WORKER_LIMIT = 8;
const WORKER: ConversationSource = { kind: "worker" };
const REPORT_MAX_CHARS = 12_000;

/** Pending requests come first: a worker stopped on the user is not "running", whatever its run says. */
function workerStatus(header: ConversationHeader, latest: ConversationSummary["latestRun"]): NoraWorkerStatus {
  const request = header.pendingRequests.find((entry) => entry.status === "pending");
  if (request) return request.kind === "approval" ? "needs-approval" : "needs-input";
  if (header.activeRuns.length) return "running";
  if (header.queuedRuns.length) return header.conversation.queuePaused ? "paused" : "running";
  if (!latest) return "ready";
  return latest.state === "completed" ? "completed" : latest.state === "failed" ? "failed" : "interrupted";
}

const shortened = (text: string): string => text.length > REPORT_MAX_CHARS
  ? `${text.slice(0, REPORT_MAX_CHARS)}\n[…report shortened; read_thread has the rest]` : text;

export function createWorkerOperations(options: NoraToolOperationOptions): NoraWorkerOperations {
  const deps = { host: options.host, nextId: options.nextId };
  const isWorkerOf = (conversation: Conversation, parent: Conversation): boolean =>
    ownsWorker(conversation, parent, conversation.parentId ? options.host.header(conversation.parentId)?.conversation ?? null : null);
  const latestRun = (id: string): ConversationSummary["latestRun"] =>
    options.host.summaries().find((summary) => summary.conversation.id === id)?.latestRun ?? null;
  const workerOf = (id: string, parent: Conversation): ConversationHeader => {
    const header = options.host.header(id);
    if (!header || !isWorkerOf(header.conversation, parent)) throw new Error(`No worker thread with id "${id}" belongs to this thread. Use the ids start_thread returned.`);
    return header;
  };
  const busy = (id: string): boolean => {
    const header = options.host.header(id);
    return !!header && workerStatus(header, null) === "running";
  };
  const report = (id: string, parent: Conversation): NoraWorkerReport => {
    const header = workerOf(id, parent);
    const latest = latestRun(id);
    const status = workerStatus(header, latest);
    const finished = status === "completed" || status === "failed" || status === "interrupted";
    const text = finished && latest ? finalAssistantText(deps, id, latest.id) : null;
    return { id, title: header.conversation.title, status, report: text ? shortened(text) : null, failure: latest?.failure?.message ?? null };
  };
  /** Resolves once the worker stops being busy; re-checks only on run and request events, which are what change that. */
  const settle = async (id: string, signal: AbortSignal, timeoutMs: number): Promise<void> => {
    const after = options.host.eventCursor();
    if (!busy(id)) return;
    await watchConversation(deps, { conversationId: id, after, signal, timeoutMs,
      settle: (event) => (event.payload.kind === "run" || event.payload.kind === "request") && !busy(id) ? true : undefined });
  };

  const create = async (input: StartWorkerToolInput, parent: Conversation, access: WorkspaceRef["access"]): Promise<{ id: string; runsAs: string; workspace: WorkspaceRef }> => {
    const target = input.bot ?? (parent.bot && !input.provider && !input.model ? parent.bot.botId : undefined);
    if (target && (input.provider || input.model)) throw new Error("Pass either a bot or a provider and model, not both: a bot runs on its own model.");
    const bot = target ? findBotTarget(options, parent.workspace.projectId, target) : null;
    const binding = bot?.binding ?? await resolveBotBinding(input, parent.provider, { ...parent.workspace, access }, options);
    if (access === "read") {
      const catalog = await options.host.catalog(binding.kind, binding.instanceId, { ...parent.workspace, access });
      if (catalog.status !== "available") throw new Error(`The worker's provider is unavailable: ${catalog.failure.message}`);
      if (!catalog.catalog.capabilities.readOnlyCommands) {
        throw new Error(`${binding.kind} cannot enforce read-only command execution. Choose a provider with read-only command support from list_models, or use write access in an isolated worktree.`);
      }
    }
    const workspace = await workerWorkspace(input, parent, access, options.workerWorkspaces);
    const initialInstruction = { runId: options.nextId(), instruction: withDoneCriteria(input.prompt, input.done) };
    const done = input.done ? { done: input.done } : {};
    if (bot) {
      const id = await createBotThread(deps, parent, bot, workspace, input.title, { source: WORKER, initialInstruction, ...done });
      return { id, runsAs: `${bot.name} (${bot.binding.kind} / ${bot.binding.model})`, workspace };
    }
    const own = parent.provider;
    // Permission policies belong to a provider, not a model, so a worker on the caller's provider keeps the trust the user gave the caller.
    const sameProvider = binding.kind === own.kind && binding.instanceId === own.instanceId;
    const provider = await runnableBinding(deps, sameProvider ? { ...binding, permissionPolicy: binding.permissionPolicy ?? own.permissionPolicy } : binding, workspace, "The worker's");
    const receipt = await options.host.execute({ kind: "create", commandId: options.nextId(), conversationId: options.nextId(), title: input.title.slice(0, 100),
      workspace, provider, parentId: parent.id, source: WORKER, initialInstruction, ...done });
    return { id: receipt.conversationId, runsAs: `${provider.kind} / ${provider.model}`, workspace };
  };
  const submit = (id: string, prompt: string) =>
    options.host.execute({ kind: "submit", commandId: options.nextId(), conversationId: id, runId: options.nextId(), instruction: prompt });

  return {
    async start(input, { conversation: parent }) {
      if (parent.source?.kind === "worker") throw new Error("A worker thread cannot start workers of its own. Do this part here instead.");
      const working = options.host.summaries().filter(({ conversation }) => isWorkerOf(conversation, parent) && busy(conversation.id)).length;
      if (working >= WORKER_LIMIT) throw new Error(`This thread already has ${WORKER_LIMIT} workers running. Wait for some with wait_for_threads before starting more.`);
      const access = input.access ?? "write";
      if (access === "write" && parent.workspace.access !== "write") throw new Error("This thread only reads its workspace, so its workers can only read it too. Pass access read.");
      const { id, runsAs, workspace } = await create(input, parent, access);
      return { id, title: input.title, runsAs, access, workspace };
    },
    async message(id, prompt, { conversation: parent }) {
      const header = workerOf(id, parent);
      if (parent.workspace.access === "read" && header.conversation.workspace.access === "write") {
        throw new Error("This thread only reads its workspace, so it cannot send instructions to a worker with write access.");
      }
      await submit(id, prompt);
      return { id, title: header.conversation.title };
    },
    async wait(input, { conversation: parent }, signal) {
      const ids = input.ids?.length ? [...new Set(input.ids)]
        : options.host.summaries().filter(({ conversation }) => isWorkerOf(conversation, parent) && !conversation.archivedAt).map(({ conversation }) => conversation.id);
      if (!ids.length) throw new Error("This thread has no workers to wait for. Start one with start_thread.");
      for (const id of ids) workerOf(id, parent);
      // One controller ends every watch: the caller giving up, or the first worker to finish in "any" mode.
      const done = new AbortController();
      const forward = (): void => done.abort();
      signal.addEventListener("abort", forward, { once: true });
      try {
        await Promise.all(ids.map((id) => settle(id, done.signal, input.timeoutMs).then(() => { if (input.mode === "any" && !busy(id)) done.abort(); })));
      } finally { signal.removeEventListener("abort", forward); }
      return ids.map((id) => report(id, parent));
    }
  };
}
