import type { ConversationState } from "@main/types/execution/store.types";
import type { Decision } from "@main/types/execution/decisions.types";
import { isActiveRun } from "@shared/conversations/runActivity";

/**
 * Starts the next queued run when nothing in the conversation is running, paused or steering: a background task's
 * report first, because the runtime is already producing that turn, otherwise the oldest. The run's opening timeline
 * item is the user's message, or a milestone for a run that carries something else (compaction, a background report).
 */
export function advanceQueue(state: ConversationState | null, now: string, decision: Decision, add: (payload: Decision["events"][number]) => void): void {
  if (!state || state.conversation.queuePaused || state.runs.some(isActiveRun) || state.runs.some((entry) => entry.steering)) return;
  const queued = state.runs.filter((entry) => entry.state === "queued");
  const next = queued.find((entry) => entry.action === "background-task") ?? queued[0];
  if (!next) return;
  add({ kind: "run", run: { ...next, state: "starting", startedAt: now, updatedAt: now } });
  const instructionId = JSON.stringify([next.id, "instruction"]);
  add({ kind: "item", item: next.action
    ? { id: instructionId, runId: next.id, createdAt: now, kind: "milestone", text: next.instruction }
    : { id: instructionId, runId: next.id, createdAt: now, kind: "message", role: "user", text: next.instruction, complete: true,
      ...(next.chatText ? { chatText: next.chatText } : {}) } });
  decision.effects.push({ id: JSON.stringify([next.attemptId, "start"]), conversationId: next.conversationId,
    runId: next.id, attemptId: next.attemptId, status: "pending", action: { kind: "start" } });
}
