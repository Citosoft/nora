import type { StoreTransaction, ExecutionEffect } from "@main/types/execution/store.types";
import type { ConversationReview } from "@shared/types/conversation/review.types";
import type { EventPayload } from "@shared/types/conversation/contracts.types";
import { isActiveRun } from "./projection";

/** Final evidence and outbox retirement share a transaction; provider outcome/recency stay intact. */
export function finalizeReview(transaction: StoreTransaction, effect: ExecutionEffect, result: ConversationReview,
  at: string, nextId: () => string): void {
  const state = transaction.state(effect.conversationId, effect.runId);
  const run = state?.runs.find((entry) => entry.id === effect.runId && entry.attemptId === effect.attemptId);
  if (run && !isActiveRun(run) && run.state !== "queued" && run.review === "pending") {
    const payloads: EventPayload[] = [
      { kind: "item", item: { kind: "review", id: JSON.stringify([run.attemptId, "review"]), runId: run.id, createdAt: at, result } },
      { kind: "run", run: { ...run, review: result.status } }
    ];
    for (const payload of payloads) {
      const event = transaction.appendEvent(nextId(), effect.conversationId, at, payload);
      transaction.project(event);
    }
  }
  transaction.putEffect({ ...effect, status: "done" });
}
