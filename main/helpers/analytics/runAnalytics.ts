import type { Conversation, ConversationEvent, ConversationRun, ProviderBinding } from "@shared/types/conversation/contracts.types";
import type { TurnOutcome } from "@shared/types/analytics.types";
import type { RunAnalyticsDeps, RunTally } from "@main/types/analytics/analytics.types";
import { toAnalyticsIdentifier } from "./identifier";

function outcomeOf(state: ConversationRun["state"]): TurnOutcome | null {
  return state === "completed" || state === "failed" || state === "interrupted" ? state : null;
}
// A conversation event this close to its creation time is the create itself rather than a later rename or pin.
const NEW_THREAD_WINDOW_MS = 10_000;

/** What kind of thread a run belongs to, from the conversation's own markers. */
export function conversationOrigin(conversation: Conversation | null): string {
  if (!conversation) return "unknown";
  if (conversation.source) return conversation.source.kind;
  if (conversation.direct) return "bot-direct";
  if (conversation.group) return "group";
  if (conversation.chatBranch) return "branch";
  if (conversation.bot) return "bot";
  if (conversation.origin) return "imported";
  return conversation.parentId ? "child" : "thread";
}

function providerProperties(binding: ProviderBinding | undefined) {
  return {
    provider: binding?.kind ?? "unknown",
    model: toAnalyticsIdentifier(binding?.model),
    effort: toAnalyticsIdentifier(binding?.reasoning),
    connection: binding?.connection ?? "unknown"
  };
}

/**
 * Turns the execution engine's event stream into turn analytics: one `turn.started` when a run first runs and one
 * `turn.finished` when it settles, with counts of what happened in between. Instructions and outputs are never read.
 */
export function createRunAnalytics(deps: RunAnalyticsDeps): { onEvent(event: ConversationEvent): void } {
  const tallies = new Map<string, RunTally>();
  const knownConversations = new Set<string>();
  const tally = (runId: string): RunTally => {
    let current = tallies.get(runId);
    if (!current) {
      current = { started: false, tools: new Set(), failedTools: new Set(), subagents: new Set(), questions: new Set(), approvals: new Set() };
      tallies.set(runId, current);
    }
    return current;
  };

  const onRun = (run: ConversationRun): void => {
    const conversation = deps.conversation(run.conversationId);
    const binding = run.provider ?? conversation?.provider;
    const base = { ...providerProperties(binding), origin: conversationOrigin(conversation), action: run.action ?? "turn" };
    const current = tally(run.id);
    const outcome = outcomeOf(run.state);
    if (!current.started && (run.state === "running" || outcome)) {
      current.started = true;
      deps.record({ name: "turn.started", properties: base });
    }
    if (!outcome) return;
    tallies.delete(run.id);
    const durationMs = run.startedAt ? Math.max(0, Date.parse(run.updatedAt) - Date.parse(run.startedAt)) : null;
    deps.record({
      name: "turn.finished",
      properties: {
        ...base,
        outcome,
        durationMs: Number.isFinite(durationMs) ? durationMs : null,
        failureCode: run.failure?.code ?? null,
        retryable: run.failure?.retryable ?? null,
        inputTokens: run.usage?.inputTokens ?? null,
        cachedInputTokens: run.usage?.cachedInputTokens ?? null,
        outputTokens: run.usage?.outputTokens ?? null,
        toolCalls: current.tools.size,
        toolFailures: current.failedTools.size,
        subagents: current.subagents.size,
        questions: current.questions.size,
        approvals: current.approvals.size
      }
    });
    if (run.failure) {
      deps.record({ name: "error.occurred", properties: { source: "turn", errorName: "RunFailure", errorCode: run.failure.code, context: base.provider, message: run.failure.message } });
    }
  };

  const onConversation = (conversation: Conversation, at: string): void => {
    if (knownConversations.has(conversation.id)) return;
    knownConversations.add(conversation.id);
    if (Math.abs(Date.parse(at) - Date.parse(conversation.createdAt)) > NEW_THREAD_WINDOW_MS) return;
    const { provider, model } = providerProperties(conversation.provider);
    deps.record({ name: "thread.created", properties: { origin: conversationOrigin(conversation), provider, model } });
  };

  return {
    onEvent(event) {
      const { payload } = event;
      switch (payload.kind) {
        case "conversation": onConversation(payload.conversation, event.at); return;
        case "run": onRun(payload.run); return;
        case "remove-run": tallies.delete(payload.runId); return;
        case "item": {
          const { item } = payload;
          if (item.kind === "tool") {
            tally(item.runId).tools.add(item.id);
            if (item.state === "failed") tally(item.runId).failedTools.add(item.id);
          } else if (item.kind === "subagent") tally(item.runId).subagents.add(item.id);
          return;
        }
        case "request": {
          const { request } = payload;
          (request.kind === "question" ? tally(request.runId).questions : tally(request.runId).approvals).add(request.id);
          return;
        }
        case "background-tasks": return;
      }
    }
  };
}
