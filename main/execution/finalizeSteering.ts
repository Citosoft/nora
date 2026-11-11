import type { StoreTransaction, ExecutionEffect } from "@main/types/execution/store.types";
import type { SteeringResult } from "@main/types/execution/steering.types";
import type { EventPayload } from "@shared/types/conversation/contracts.types";
import { decideCommand } from "./decideCommand";

/** Retire delivery and consume the queue entry together; uncertain input never auto-runs again. */
export function finalizeSteering(transaction: StoreTransaction, effect: ExecutionEffect, result: SteeringResult, now: string, nextId: () => string): void {
  if (effect.action.kind !== "steer" || effect.status === "done") return;
  const action = effect.action;
  const state = transaction.state(effect.conversationId, action.queuedRunId);
  const queued = state?.runs.find((entry) => entry.id === action.queuedRunId);
  const append = (payload: EventPayload): void => { transaction.project(transaction.appendEvent(nextId(), effect.conversationId, now, payload)); };
  transaction.putEffect({ ...effect, status: "done" });
  if (!state || !queued || queued.steering !== "pending") return;
  if (result.status === "accepted") {
    append({ kind: "remove-run", runId: queued.id });
    append({ kind: "item", item: { id: JSON.stringify([effect.id, "instruction"]), runId: effect.runId, kind: "message", role: "user", text: effect.action.instruction, createdAt: now, complete: true } });
  } else {
    append({ kind: "run", run: { ...queued, steering: result.status === "unconfirmed" ? "unconfirmed" : undefined,
      failure: { code: result.status === "unconfirmed" ? "uncertain" : "provider", message: result.message, retryable: false }, updatedAt: now } });
  }
  append({ kind: "conversation", conversation: { ...state.conversation, updatedAt: now, queuePaused: state.conversation.queuePaused || result.status !== "accepted" } });
  const latest = transaction.state(effect.conversationId);
  if (latest && !latest.conversation.queuePaused) {
    const next = decideCommand({ kind: "continue-queue", commandId: effect.id, conversationId: effect.conversationId }, { now,
      state: latest, environmentId: latest.conversation.workspace.environmentId, writers: transaction.writers(latest.conversation.workspace), effects: transaction.unfinishedEffects() });
    for (const payload of next.events) append(payload);
    for (const operation of next.effects) transaction.putEffect(operation);
  }
}
