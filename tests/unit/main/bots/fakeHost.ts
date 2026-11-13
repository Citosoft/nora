import type { Conversation, ConversationCommand, ConversationRun, TimelineItem } from "@shared/types/conversation/contracts.types";
import type { ConversationEvent } from "@shared/types/conversation/contracts.types";
import type { ConversationHeader, ConversationSummary } from "@shared/types/conversation/queries.types";
import type { BotConversationHost } from "@main/types/bots/conversations.types";
import type { EventSubscription } from "@main/types/execution/engine.types";
import { snapshotBot } from "@shared/bots/snapshot";
import type { BotDefinition } from "@shared/types/bots/bots.types";
import { conversation } from "../nora-tools/fixture";

/** Answers each submitted instruction with `reply(botId, instruction)`; a null reply leaves the run pending until interrupted. */
export function fakeHost(bots: readonly BotDefinition[], reply: (botId: string, instruction: string) => string | null | Error) {
  const conversations = new Map<string, Conversation>();
  const items = new Map<string, TimelineItem[]>();
  const commands: ConversationCommand[] = [];
  const listeners = new Set<EventSubscription>();
  let cursor = 0;
  const emit = (conversationId: string, payload: ConversationEvent["payload"]): void => {
    cursor += 1;
    const event = { schemaVersion: 1, id: `e${cursor}`, conversationId, cursor, at: "2026-11-13T00:00:00.000Z", payload } as ConversationEvent;
    for (const listener of [...listeners]) if (!listener.conversationId || listener.conversationId === conversationId) listener.onEvent(event);
  };
  const run = (conversationId: string, id: string, state: ConversationRun["state"], failure: string | null = null): ConversationRun =>
    ({ id, conversationId, instruction: "x", state, attemptId: id, nativeTurnId: null, createdAt: "", updatedAt: "",
      failure: failure ? { code: "provider", message: failure, retryable: true } : null, usage: null, review: "pending" }) as ConversationRun;
  const host: BotConversationHost = {
    async execute(command) {
      commands.push(command);
      if (command.kind === "create") {
        const bot = bots.find((entry) => entry.id === command.botId);
        conversations.set(command.conversationId, conversation(command.conversationId, { title: command.title, parentId: command.parentId,
          workspace: command.workspace, provider: command.provider, ...(bot ? { bot: snapshotBot(bot) } : {}) }));
      }
      if (command.kind === "submit") {
        const botId = conversations.get(command.conversationId)?.bot?.botId ?? "";
        const answer = reply(botId, command.instruction);
        if (answer !== null) setTimeout(() => {
          if (answer instanceof Error) { emit(command.conversationId, { kind: "run", run: run(command.conversationId, command.runId, "failed", answer.message) }); return; }
          items.set(command.conversationId, [...(items.get(command.conversationId) ?? []),
            { kind: "message", id: `${command.runId}:a`, runId: command.runId, createdAt: "", role: "assistant", text: answer, complete: true }]);
          emit(command.conversationId, { kind: "run", run: run(command.conversationId, command.runId, "completed") });
        }, 1);
      }
      if (command.kind === "interrupt") emit(command.conversationId, { kind: "run", run: run(command.conversationId, command.runId, "interrupted") });
      return { commandId: command.commandId, conversationId: command.conversationId, cursor, acceptedAt: "" };
    },
    header: (id) => { const found = conversations.get(id); return found ? ({ conversation: found, activeRuns: [], queuedRuns: [], pendingRequests: [] } as unknown as ConversationHeader) : null; },
    summaries: () => [...conversations.values()].map((entry): ConversationSummary => ({ conversation: entry, latestRun: null, queuedCount: 0, pendingRequestCount: 0 })),
    conversationHistory: ({ conversationId }) => ({ schemaVersion: 1, conversationId, cursor, nextBefore: null, scope: "timeline", items: items.get(conversationId) ?? [] }),
    subscribe(subscription) { listeners.add(subscription); return () => { listeners.delete(subscription); }; },
    eventCursor: () => cursor,
    async catalog() { return { status: "available", catalog: { kind: "claude", instanceId: "claude", capabilities: {} as never, models: [], policies: [{ id: "default", label: "Default" }], authentication: "present" } }; }
  };
  return { host, commands, conversations, items, add(entry: Conversation) { conversations.set(entry.id, entry); } };
}
