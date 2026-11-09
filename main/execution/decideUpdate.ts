import type { Decision, DecisionContext } from "@main/types/execution/decisions.types";
import type { ProviderUpdate } from "@main/types/execution/provider.types";
import type { EventPayload } from "@shared/types/conversation/contracts.types";
import type { ConversationState } from "@main/types/execution/store.types";
import { ExecutionCommandError } from "./errors";
import { isActiveRun, projectState } from "./projection";
import { decideCommand } from "./decideCommand";

export function decideUpdate(snapshot: ConversationState, update: ProviderUpdate, context: DecisionContext): Decision {
  const decision: Decision = { events: [], effects: [] };
  const run = snapshot.runs.find((entry) => entry.id === update.runId);
  if (!run || run.attemptId !== update.attemptId || !isActiveRun(run)) return decision;
  const add = (payload: EventPayload): void => { decision.events.push(payload); };
  const expireRequests = (): void => {
    for (const request of snapshot.requests.filter((entry) => entry.runId === run.id && ["pending", "responding"].includes(entry.status))) {
      add({ kind: "request", request: { ...request, status: "expired" } });
    }
  };
  switch (update.kind) {
    case "bound":
      if (snapshot.conversation.nativeConversationId && snapshot.conversation.nativeConversationId !== update.nativeConversationId) {
        throw new ExecutionCommandError("conflict", "Native conversation binding cannot change");
      }
      add({ kind: "conversation", conversation: { ...snapshot.conversation, nativeConversationId: update.nativeConversationId, updatedAt: context.now } });
      break;
    case "started":
      if (run.nativeTurnId && run.nativeTurnId !== update.nativeTurnId) throw new ExecutionCommandError("conflict", "Native turn identity changed during execution");
      if (snapshot.conversation.nativeConversationId && snapshot.conversation.nativeConversationId !== update.nativeConversationId) {
        throw new ExecutionCommandError("conflict", "Native conversation identity changed during execution");
      }
      add({ kind: "conversation", conversation: { ...snapshot.conversation, nativeConversationId: update.nativeConversationId, updatedAt: context.now } });
      add({ kind: "run", run: { ...run, nativeTurnId: update.nativeTurnId,
        state: run.state === "stopping" ? "stopping" : "running", failure: null, updatedAt: context.now } });
      break;
    case "item": {
      if (update.item.runId !== run.id) throw new ExecutionCommandError("invalid", "Timeline item belongs to another run");
      const previous = context.previousItem;
      if (previous && (previous.runId !== run.id || previous.kind !== update.item.kind)) {
        throw new ExecutionCommandError("conflict", "Timeline identity cannot be reused for another item");
      }
      // A delayed stream chunk cannot replace the authoritative final message.
      if (previous && "complete" in previous && previous.complete && "complete" in update.item && !update.item.complete) break;
      if (update.item.kind === "message" && update.item.role === "user") throw new ExecutionCommandError("invalid", "Provider cannot rewrite user instructions");
      add({ kind: "item", item: update.item });
      break;
    }
    case "request": {
      if (run.state === "stopping") break;
      if (update.request.runId !== run.id || update.request.attemptId !== run.attemptId || update.request.status !== "pending") {
        throw new ExecutionCommandError("invalid", "Request does not belong to the active attempt");
      }
      const previous = context.previousRequest;
      if (previous && (previous.runId !== run.id || previous.attemptId !== run.attemptId)) {
        throw new ExecutionCommandError("conflict", "Native request identity cannot be reused for another turn");
      }
      if (previous && previous.status !== "pending") break;
      add({ kind: "conversation", conversation: { ...snapshot.conversation, updatedAt: context.now } });
      if (Date.parse(update.request.expiresAt) <= Date.parse(context.now)) {
        expireRequests();
        add({ kind: "request", request: { ...update.request, status: "expired" } });
        add({ kind: "run", run: { ...run, state: "recovering", updatedAt: context.now,
          failure: { code: "uncertain", message: "Native request expired before delivery; reconcile before continuing", retryable: false } } });
        break;
      }
      add({ kind: "request", request: update.request });
      add({ kind: "run", run: { ...run, state: update.request.kind === "approval" ? "awaiting-approval" : "awaiting-input", updatedAt: context.now } });
      break;
    }
    case "request-resolved": {
      const request = snapshot.requests.find((entry) => entry.id === update.requestId);
      if (!request || request.runId !== run.id || request.status === "expired") break;
      add({ kind: "request", request: { ...request, status: "resolved" } });
      const pending = snapshot.requests.find((entry) => entry.id !== request.id && entry.runId === run.id && ["pending", "responding"].includes(entry.status));
      add({ kind: "run", run: { ...run, state: run.state === "stopping" ? "stopping" : pending
        ? pending.kind === "approval" ? "awaiting-approval" : "awaiting-input" : "running", updatedAt: context.now } });
      break;
    }
    case "request-expired": {
      const request = snapshot.requests.find((entry) => entry.id === update.requestId && entry.runId === run.id);
      if (!request || !["pending", "responding"].includes(request.status)) break;
      add({ kind: "request", request: { ...request, status: "expired" } });
      add({ kind: "run", run: { ...run, state: "recovering", updatedAt: context.now,
        failure: { code: "uncertain", message: "Native request expired; reconcile before continuing", retryable: false } } });
      break;
    }
    case "disconnected":
      expireRequests();
      add({ kind: "run", run: { ...run, state: "recovering", failure: update.failure, updatedAt: context.now } });
      break;
    case "finished": {
      expireRequests();
      add({ kind: "run", run: { ...run, state: update.status, failure: update.failure, usage: update.usage, updatedAt: context.now } });
      add({ kind: "conversation", conversation: { ...snapshot.conversation,
        queuePaused: snapshot.conversation.queuePaused || update.status !== "completed", updatedAt: context.now } });
      if (update.status === "completed" && !snapshot.conversation.queuePaused) {
        const nextSnapshot = decision.events.reduce(projectState, snapshot);
        const nextContext = { ...context, state: nextSnapshot };
        const next = decideCommand({ commandId: update.eventId, conversationId: snapshot.conversation.id, kind: "continue-queue" }, nextContext);
        decision.events.push(...next.events);
        decision.effects.push(...next.effects);
      }
      break;
    }
  }
  return decision;
}
