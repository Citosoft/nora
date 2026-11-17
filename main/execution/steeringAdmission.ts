import type { ConversationState } from "@main/types/execution/store.types";

/** Both manual steering and preferred follow-ups use the same native ownership and pending-request checks. */
export function steeringTarget(state: ConversationState) {
  if (state.conversation.queuePaused || state.runs.some((run) => run.steering !== undefined)) return null;
  return state.runs.find((run) => run.state === "running" && !!run.nativeTurnId && !run.action
    && !state.requests.some((request) => request.runId === run.id && ["pending", "responding"].includes(request.status))) ?? null;
}
