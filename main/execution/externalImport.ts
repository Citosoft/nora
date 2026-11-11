import { createHash } from "node:crypto";
import type { ExternalTranscript } from "@main/types/execution/externalSessions.types";
import type { Conversation, EventPayload } from "@shared/types/conversation/contracts.types";

/** Keep native identifiers intact on the binding; imported journal identities are bounded and namespaced. */
export function externalIdentity(...parts: string[]): string {
  return `external:${createHash("sha256").update(JSON.stringify(parts)).digest("hex")}`;
}

export function externalImportEvents(conversation: Conversation, transcript: ExternalTranscript): EventPayload[] {
  const { session } = transcript;
  const events: EventPayload[] = [{ kind: "conversation", conversation: { ...conversation, origin: session.origin,
    title: session.title, nativeConversationId: session.id, createdAt: session.createdAt, updatedAt: session.updatedAt } }];
  for (const turn of transcript.turns) {
    const runId = externalIdentity(conversation.id, "turn", turn.id);
    events.push({ kind: "run", run: { id: runId, conversationId: conversation.id, nativeTurnId: turn.id,
      instruction: turn.instruction, state: turn.state, attemptId: externalIdentity(runId, "attempt"),
      createdAt: session.createdAt, updatedAt: session.updatedAt, failure: null, usage: null, review: "unavailable" } });
    for (const item of turn.items) events.push({ kind: "item", item: { ...item, id: externalIdentity(runId, item.id), runId } });
  }
  return events;
}
