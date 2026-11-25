import type { Decision, DecisionContext } from "@main/types/execution/decisions.types";
import type { ConversationRun, EventPayload } from "@shared/types/conversation/contracts.types";
import type { ConversationState } from "@main/types/execution/store.types";

/** Ends a jammed turn locally when the provider never confirms a cooperative interrupt or reconcile. */
export function forceEndRun(
  run: ConversationRun,
  initial: ConversationState,
  context: DecisionContext,
  decision: Decision,
  add: (payload: EventPayload) => void,
  putRun: (next: ConversationRun) => void
): void {
  for (const effect of context.admission.unfinishedEffects()) {
    if (effect.conversationId !== initial.conversation.id || effect.attemptId !== run.attemptId) continue;
    if (effect.status !== "pending") continue;
    decision.effects.push({ ...effect, status: "done" });
  }
  for (const request of initial.requests.filter((entry) => entry.runId === run.id && ["pending", "responding"].includes(entry.status))) {
    add({ kind: "request", request: { ...request, status: "expired" } });
  }
  const items = context.admission.execution(initial.conversation.id, run.id)?.items ?? [];
  for (const item of items) {
    if ((item.kind === "tool" || item.kind === "subagent") && item.state === "running") {
      add({ kind: "item", item: { ...item, state: "interrupted" } });
    }
  }
  const review = run.nativeTurnId ? run.review : "unavailable";
  putRun({ ...run, state: "interrupted", failure: null, review, updatedAt: context.now });
  add({ kind: "conversation", conversation: { ...initial.conversation, queuePaused: true, updatedAt: context.now } });
  if (review === "pending") {
    decision.effects.push({
      id: JSON.stringify([run.attemptId, "review"]),
      conversationId: initial.conversation.id,
      runId: run.id,
      attemptId: run.attemptId,
      status: "pending",
      action: { kind: "review" }
    });
  }
}
