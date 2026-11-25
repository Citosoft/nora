import type { Conversation, ConversationCommand, ConversationRun, RuntimeRequest, TimelineItem } from "@shared/types/conversation/contracts.types";
import type { ConversationEvent } from "@shared/types/conversation/contracts.types";
import type { ConversationHeader, ConversationSummary } from "@shared/types/conversation/queries.types";
import type { BotConversationHost } from "@main/types/bots/conversations.types";
import type { EventSubscription } from "@main/types/execution/engine.types";
import { snapshotBot } from "@shared/bots/snapshot";
import type { BotDefinition } from "@shared/types/bots/bots.types";
import { conversation } from "../nora-tools/fixture";

const terminal = new Set<ConversationRun["state"]>(["completed", "failed", "interrupted"]);

/** Answers each submitted instruction with `reply(botId, instruction)`; a null reply leaves the run pending until interrupted. */
export function fakeHost(bots: readonly BotDefinition[], reply: (botId: string, instruction: string) => string | null | Error | Promise<string | null | Error>) {
  const conversations = new Map<string, Conversation>();
  const items = new Map<string, TimelineItem[]>();
  const commands: ConversationCommand[] = [];
  const listeners = new Set<EventSubscription>();
  /** Every run per thread, oldest first, so headers and summaries reflect what is working; updated before the event goes out, as in the real store. */
  const runs = new Map<string, ConversationRun[]>();
  const pending = new Map<string, RuntimeRequest[]>();
  let cursor = 0;
  const emit = (conversationId: string, payload: ConversationEvent["payload"]): void => {
    if (payload.kind === "run") runs.set(conversationId, [...(runs.get(conversationId) ?? []).filter((entry) => entry.id !== payload.run.id), payload.run]);
    if (payload.kind === "request") pending.set(conversationId, [...(pending.get(conversationId) ?? []).filter((entry) => entry.id !== payload.request.id),
      ...(payload.request.status === "pending" ? [payload.request] : [])]);
    cursor += 1;
    const event = { schemaVersion: 1, id: `e${cursor}`, conversationId, cursor, at: "2026-11-13T00:00:00.000Z", payload } as ConversationEvent;
    for (const listener of [...listeners]) if (!listener.conversationId || listener.conversationId === conversationId) listener.onEvent(event);
  };
  const run = (conversationId: string, id: string, state: ConversationRun["state"], failure: string | null = null): ConversationRun =>
    ({ id, conversationId, instruction: "x", state, attemptId: id, nativeTurnId: null, createdAt: "", updatedAt: "",
      failure: failure ? { code: "provider", message: failure, retryable: true } : null, usage: null, review: "pending" }) as ConversationRun;
  const host: BotConversationHost = {
    async execute(command, frozenBot) {
      commands.push(command);
      if (command.kind === "create") {
        const bot = bots.find((entry) => entry.id === command.botId);
        conversations.set(command.conversationId, conversation(command.conversationId, { title: command.title, parentId: command.parentId,
          workspace: command.workspace, provider: command.provider, ...(frozenBot ? { bot: frozenBot } : bot ? { bot: snapshotBot(bot) } : {}), ...(command.chatBranch ? { chatBranch: command.chatBranch } : {}), ...(command.source ? { source: command.source } : {}) }));
      }
      if (command.kind === "create" && command.initialInstruction) await host.execute({ kind: "submit", commandId: `${command.commandId}:initial`,
        conversationId: command.conversationId, runId: command.initialInstruction.runId, instruction: command.initialInstruction.instruction });
      if (command.kind === "submit") {
        runs.set(command.conversationId, [...(runs.get(command.conversationId) ?? []), run(command.conversationId, command.runId, "running")]);
        const botId = conversations.get(command.conversationId)?.bot?.botId ?? "";
        void Promise.resolve(reply(botId, command.instruction)).then((answer) => {
        if (answer !== null) setTimeout(() => {
          if (answer instanceof Error) { emit(command.conversationId, { kind: "run", run: run(command.conversationId, command.runId, "failed", answer.message) }); return; }
          items.set(command.conversationId, [...(items.get(command.conversationId) ?? []),
            { kind: "message", id: `${command.runId}:a`, runId: command.runId, createdAt: "", role: "assistant", text: answer, complete: true }]);
          emit(command.conversationId, { kind: "run", run: run(command.conversationId, command.runId, "completed") });
        }, 1);
        });
      }
      if (command.kind === "interrupt") emit(command.conversationId, { kind: "run", run: run(command.conversationId, command.runId, "interrupted") });
      if (command.kind === "archive") {
        const found = conversations.get(command.conversationId);
        if (found) conversations.set(command.conversationId, { ...found, archivedAt: "2026-11-13T00:00:00.000Z" });
      }
      return { commandId: command.commandId, conversationId: command.conversationId, cursor, acceptedAt: "" };
    },
    header: (id) => { const found = conversations.get(id); return found ? ({ conversation: found, activeRuns: (runs.get(id) ?? []).filter((entry) => !terminal.has(entry.state)),
      queuedRuns: [], pendingRequests: pending.get(id) ?? [] } as unknown as ConversationHeader) : null; },
    summaries: () => [...conversations.values()].map((entry): ConversationSummary => ({ conversation: entry, latestRun: runs.get(entry.id)?.at(-1) ?? null, queuedCount: 0,
      pendingRequestCount: pending.get(entry.id)?.length ?? 0 })),
    conversationHistory: ({ conversationId }) => ({ schemaVersion: 1, conversationId, cursor, nextBefore: null, scope: "timeline", items: items.get(conversationId) ?? [] }),
    subscribe(subscription) { listeners.add(subscription); return () => { listeners.delete(subscription); }; },
    eventCursor: () => cursor,
    async catalog() { return { status: "available", catalog: { kind: "claude", instanceId: "claude", capabilities: {} as never, models: [], policies: [{ id: "default", label: "Default" }], authentication: "present" } }; }
  };
  return { host, commands, conversations, items, emit, run, add(entry: Conversation) { conversations.set(entry.id, entry); } };
}
