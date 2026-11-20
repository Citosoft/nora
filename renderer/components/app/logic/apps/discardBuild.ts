import type { ConversationSummary } from "@shared/types/conversation/queries.types";
import type { AppBuildCleanupStore } from "@/components/app/types/appBuildCleanup.types";

export function canDiscardBuild(summary: ConversationSummary): boolean {
  const state = summary.latestRun?.state;
  return summary.pendingRequestCount === 0
    && (!state || state === "completed" || state === "failed" || state === "interrupted" || state === "queued")
    && (summary.queuedCount === 0 || summary.conversation.queuePaused);
}

/** Remove paused, unsent work before settling; the existing settlement flow also closes open views. */
export async function discardBuild(store: AppBuildCleanupStore, conversationId: string): Promise<void> {
  const header = await store.client.header(conversationId);
  if (!header || header.conversation.source?.kind !== "app") throw new Error("This app build is no longer available.");
  if (header.activeRuns.length || header.pendingRequests.length || (header.queuedRuns.length && !header.conversation.queuePaused)) {
    throw new Error("Stop this build before discarding it.");
  }
  for (const run of header.queuedRuns) {
    await store.client.execute({ kind: "remove-queued", commandId: crypto.randomUUID(), conversationId, runId: run.id });
  }
  await store.setSettled({ kind: "thread", conversationId }, true);
}
