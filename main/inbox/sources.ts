import { conversationsWithRequests, finishedRuns, trimPreview } from "@shared/inbox/projection";
import type { LoopRun } from "@shared/types/loop.types";
import type { ConversationSummary } from "@shared/types/conversation/queries.types";
import type { InboxRequestSource, InboxWorkflowSource } from "@shared/types/inbox/inbox.types";
import type { InboxHost } from "@main/types/inbox/inbox.types";

const PREVIEW_SCAN_LIMIT = 40;

/** Pending requests with their thread and, for a delegated or group thread, the thread it works for. */
export function readRequestSources(host: InboxHost, summaries: readonly ConversationSummary[]): InboxRequestSource[] {
  const conversations = new Map(summaries.map(({ conversation }) => [conversation.id, conversation]));
  return conversationsWithRequests(summaries).flatMap((conversationId) => {
    const header = host.header(conversationId);
    if (!header) return [];
    const parentId = header.conversation.parentId;
    const parent = parentId ? conversations.get(parentId) ?? host.header(parentId)?.conversation ?? null : null;
    return header.pendingRequests.map((request) => ({ conversation: header.conversation, parent, request }));
  });
}

/** The last thing the agent said in a run, read from the end of its thread's timeline. */
export function readRunPreview(host: InboxHost, conversationId: string, runId: string): string | null {
  const page = host.conversationHistory({ conversationId, scope: "timeline", limit: PREVIEW_SCAN_LIMIT });
  if (page.scope !== "timeline") return null;
  for (let index = page.items.length - 1; index >= 0; index--) {
    const item = page.items[index];
    if (item.kind === "message" && item.role === "assistant" && item.runId === runId && item.text.trim()) return trimPreview(item.text);
  }
  return null;
}

/**
 * Keeps one preview per finished run the inbox shows, reading each only once, and forgets runs that left the inbox.
 * Reading a timeline is cheap but not free, so this runs on summaries changes, never per streamed item.
 */
export function refreshPreviews(host: InboxHost, previews: Map<string, string | null>, summaries: readonly ConversationSummary[], baselineAt: string, now: string): void {
  const live = new Set<string>();
  for (const { conversation, latestRun } of finishedRuns(summaries, baselineAt, now)) {
    if (!latestRun) continue;
    live.add(latestRun.id);
    if (!previews.has(latestRun.id)) previews.set(latestRun.id, readRunPreview(host, conversation.id, latestRun.id));
  }
  for (const runId of previews.keys()) if (!live.has(runId)) previews.delete(runId);
}

export function toWorkflowSource(run: LoopRun, workspaceId: string | null): InboxWorkflowSource {
  return { projectId: run.projectId, workspaceId, runId: run.id, workflowName: run.definition.name || "Workflow", objective: run.objective,
    status: run.status, stopReason: run.stopReason, updatedAt: run.updatedAt };
}
