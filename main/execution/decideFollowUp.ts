import type { Decision } from "@main/types/execution/decisions.types";
import type { ProviderFollowUp } from "@main/types/execution/followUp.types";
import type { ConversationState } from "@main/types/execution/store.types";
import { projectState } from "./projection";
import { advanceQueue } from "./advanceQueue";

/**
 * Queues a `background-task` run for a turn the runtime started by itself, then starts it if the conversation is free.
 * Returns null when the conversation can no longer take it: it is gone or settled, moved to another provider or native
 * session, or already has this follow-up.
 */
export function decideFollowUp(initial: ConversationState | null, followUp: ProviderFollowUp, now: string): Decision | null {
  if (!initial) return null;
  const { conversation } = initial;
  if (conversation.archivedAt || conversation.provider.kind !== followUp.provider.kind || conversation.provider.instanceId !== followUp.provider.instanceId
    || conversation.nativeConversationId !== followUp.nativeConversationId || initial.runs.some((run) => run.id === followUp.followUpId)) return null;
  const decision: Decision = { events: [], effects: [] };
  let state: ConversationState | null = initial;
  const add = (payload: Decision["events"][number]): void => { decision.events.push(payload); state = projectState(state, payload); };
  add({ kind: "conversation", conversation: { ...conversation, updatedAt: now } });
  add({ kind: "run", run: { id: followUp.followUpId, conversationId: conversation.id, instruction: followUp.summary, provider: conversation.provider,
    action: "background-task", attemptId: JSON.stringify([conversation.id, followUp.followUpId, 1]), nativeTurnId: null,
    state: "queued", createdAt: now, updatedAt: now, failure: null, usage: null, review: "pending" } });
  advanceQueue(state, now, decision, add);
  return decision;
}
