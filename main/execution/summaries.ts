import type { ConversationSnapshot } from "@shared/types/conversation/contracts.types";
import type { ConversationSummary } from "@shared/types/conversation/queries.types";
import { isActiveRun } from "./projection";

export function summarizeConversation(snapshot: Pick<ConversationSnapshot, "conversation" | "runs" | "requests">): ConversationSummary {
  let latest = snapshot.runs.find(isActiveRun);
  if (!latest) {
    for (let index = snapshot.runs.length - 1; index >= 0; index--) {
      if (snapshot.runs[index].state !== "queued") { latest = snapshot.runs[index]; break; }
    }
  }
  latest ??= snapshot.runs.at(-1);
  return {
    conversation: snapshot.conversation,
    latestRun: latest ? { id: latest.id, state: latest.state, createdAt: latest.createdAt, updatedAt: latest.updatedAt, failure: latest.failure } : null,
    queuedCount: snapshot.runs.filter((run) => run.state === "queued").length,
    pendingRequestCount: snapshot.requests.filter((request) => request.status === "pending").length
  };
}
