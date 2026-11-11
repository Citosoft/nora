import type { StoreTransaction } from "@main/types/execution/store.types";
import type { EventPayload } from "@shared/types/conversation/contracts.types";
import { finalizeReview } from "./finalizeReview";
import { isActiveRun } from "./projection";
import { finalizeSteering } from "./finalizeSteering";

/** Recover durable intent only after acquiring sole environment ownership. */
export function recoverExecution(transaction: StoreTransaction, now: string, nextId: () => string): void {
  for (const effect of transaction.unfinishedEffects().filter((entry) => entry.action.kind === "steer")) {
    finalizeSteering(transaction, effect, { status: effect.status === "claimed" ? "unconfirmed" : "rejected",
      message: effect.status === "claimed" ? "Steering delivery was interrupted and is unconfirmed. This message will not run automatically."
        : "Steering was not sent before restart. The message remains queued." }, now, nextId);
  }
  // A later workspace observation cannot reconstruct evidence lost across host restart.
  for (const effect of transaction.unfinishedEffects().filter((entry) => entry.action.kind === "review")) {
    const checkpoint = transaction.checkpoint(effect.conversationId, effect.runId);
    if (checkpoint?.continuity === "intact" && checkpoint.baseline.status === "ready" && checkpoint.final?.status === "ready") {
      transaction.putEffect({ ...effect, status: "pending" });
    } else {
      if (checkpoint && !checkpoint.final) transaction.putCheckpoint({ ...checkpoint, continuity: "interrupted",
        final: { status: "unavailable", reason: "interrupted" } });
      finalizeReview(transaction, effect, { status: "unavailable", reason: "interrupted" }, now, nextId);
    }
  }
  for (const snapshot of transaction.activeStates()) {
    const events: EventPayload[] = [];
    for (const run of snapshot.runs.filter(isActiveRun)) {
      const effects = transaction.unfinishedEffects().filter((effect) => effect.attemptId === run.attemptId && effect.conversationId === snapshot.conversation.id);
      // Unclaimed starts are known not to have crossed the native boundary.
      if (run.state === "starting" && effects.some((effect) => effect.action.kind === "start" && effect.status === "pending")) continue;
      const checkpoint = transaction.checkpoint(snapshot.conversation.id, run.id);
      if (checkpoint && !checkpoint.final) transaction.putCheckpoint({ ...checkpoint, continuity: "interrupted" });
      for (const effect of effects.filter((entry) => entry.status !== "done")) transaction.putEffect({ ...effect, status: "done" });
      for (const request of snapshot.requests.filter((entry) => entry.runId === run.id && ["pending", "responding"].includes(entry.status))) {
        events.push({ kind: "request", request: { ...request, status: "expired" } });
      }
      events.push({ kind: "run", run: { ...run, state: "recovering", updatedAt: now,
        failure: { code: "uncertain", message: "Native execution must be reconciled before continuing", retryable: false } } });
      const id = JSON.stringify([run.attemptId, "reconcile", nextId()]);
      transaction.putEffect({ id, conversationId: snapshot.conversation.id, runId: run.id,
        attemptId: run.attemptId, status: "pending", action: { kind: "reconcile" } });
    }
    for (const payload of events) {
      const event = transaction.appendEvent(nextId(), snapshot.conversation.id, now, payload);
      transaction.project(event);
    }
  }
  for (const effect of transaction.unfinishedEffects()) {
    if (effect.action.kind === "review") continue;
    const owner = transaction.state(effect.conversationId, effect.runId)?.runs.find((run) => run.id === effect.runId && run.attemptId === effect.attemptId);
    if (effect.status !== "done" && (!owner || !isActiveRun(owner))) transaction.putEffect({ ...effect, status: "done" });
  }
}
