import { describeAttention } from "@shared/conversations/attention";
import { isLoopRunStoppedByUser } from "@shared/loopRunLifecycle";
import { INBOX_PREVIEW_MAX } from "./contracts";
import type { Conversation } from "@shared/types/conversation/contracts.types";
import type { ConversationSummary } from "@shared/types/conversation/queries.types";
import type { InboxCounts, InboxItem, InboxLedger, InboxMark, InboxProjection, InboxSources, InboxTarget, InboxTier } from "@shared/types/inbox/inbox.types";

/** Updates older than this leave the inbox on their own; anything that needs the user stays however old it is. */
export const INBOX_UPDATE_RETENTION_MS = 14 * 24 * 60 * 60 * 1000;
const FINISHED_RUN_STATES: ReadonlySet<string> = new Set(["completed", "failed", "interrupted"]);

export const inboxItemId = Object.freeze({
  request: (requestId: string) => `request:${requestId}`,
  /** Keyed by run, so a later run of a thread the user marked done comes back as a new update. */
  outcome: (conversationId: string, runId: string) => `outcome:${conversationId}:${runId}`,
  /** Keyed by status and time, so a run that pauses again after being dealt with reappears. */
  workflow: (runId: string, status: string, updatedAt: string) => `workflow:${runId}:${status}:${updatedAt}`,
  connector: (connectorId: string) => `connector:${connectorId}`,
  /** Keyed by when it fired, so an alert that clears and fires again comes back as a new item. */
  alert: (appId: string, alertId: string, firedAt: string) => `alert:${appId}:${alertId}:${firedAt}`
});

export function inboxTier(item: InboxItem): InboxTier {
  switch (item.kind) {
    case "request": case "connector": return "needs-you";
    case "workflow": return item.status === "paused" ? "needs-you" : "update";
    case "outcome": return "update";
    case "alert": return item.tier;
  }
}

export function inboxTarget(item: InboxItem): InboxTarget {
  switch (item.kind) {
    case "request": case "outcome": return { kind: "thread", conversationId: item.conversation.id };
    case "workflow": return { kind: "workflow", projectId: item.projectId, runId: item.runId };
    case "connector": return { kind: "connectors" };
    case "alert": return { kind: "app", appId: item.appId };
  }
}

/** Snoozed items are left out: they wait in the inbox's Snoozed list, not in the badge. */
export function inboxCounts(items: readonly InboxItem[], now: string): InboxCounts {
  const awake = items.filter((item) => !isSnoozed(item, now));
  return { needsYou: awake.filter((item) => inboxTier(item) === "needs-you").length, unread: awake.filter((item) => inboxTier(item) === "update" && !item.readAt).length };
}

export function isSnoozed(item: Pick<InboxItem, "snoozedUntil">, now: string): boolean {
  return !!item.snoozedUntil && item.snoozedUntil > now;
}

/** Threads with an unread update, for the thread list's unread dots. */
export function unreadThreadIds(items: readonly InboxItem[]): string[] {
  return items.flatMap((item) => item.kind === "outcome" && !item.readAt ? [item.conversation.id] : []);
}

export function trimPreview(text: string): string | null {
  const flat = text.replace(/\s+/g, " ").trim();
  if (!flat) return null;
  return flat.length <= INBOX_PREVIEW_MAX ? flat : `${flat.slice(0, INBOX_PREVIEW_MAX - 1).trimEnd()}…`;
}

/** Pending requests in unsettled threads whose summaries say they are waiting, for reading their headers. */
export function conversationsWithRequests(summaries: readonly ConversationSummary[]): string[] {
  return summaries.filter(({ conversation, pendingRequestCount }) => pendingRequestCount > 0 && !conversation.archivedAt).map(({ conversation }) => conversation.id);
}

/** The latest finished run of each top-level, unsettled, non-workflow thread that finished after the inbox began. */
export function finishedRuns(summaries: readonly ConversationSummary[], baselineAt: string, now: string): ConversationSummary[] {
  const oldest = new Date(Date.parse(now) - INBOX_UPDATE_RETENTION_MS).toISOString();
  return summaries.filter(({ conversation, latestRun }) => !!latestRun && FINISHED_RUN_STATES.has(latestRun.state) && !conversation.parentId
    && !conversation.archivedAt && conversation.source?.kind !== "workflow" && latestRun.updatedAt >= baselineAt && latestRun.updatedAt >= oldest);
}

/** Every item the sources describe, before the user's marks; marks start empty. */
function candidates(sources: InboxSources, ledger: InboxLedger, now: string): InboxItem[] {
  const unmarked = { readAt: null, snoozedUntil: null };
  const workspaceOf = (conversation: Conversation): string => conversation.workspace.projectId;
  const requests: InboxItem[] = sources.requests.filter(({ conversation, request }) => request.status === "pending" && !conversation.archivedAt)
    .map(({ conversation, parent, request }) => ({ ...unmarked, kind: "request", id: inboxItemId.request(request.id), workspaceId: workspaceOf(conversation),
      occurredAt: request.createdAt, conversation, request, notice: describeAttention(conversation, parent, request) }));
  const outcomes: InboxItem[] = finishedRuns(sources.summaries, ledger.baselineAt, now).flatMap(({ conversation, latestRun }) => latestRun ? [{
    ...unmarked, kind: "outcome" as const, id: inboxItemId.outcome(conversation.id, latestRun.id), workspaceId: workspaceOf(conversation), occurredAt: latestRun.updatedAt,
    conversation, run: latestRun, preview: sources.previews.get(latestRun.id) ?? null }] : []);
  const oldest = new Date(Date.parse(now) - INBOX_UPDATE_RETENTION_MS).toISOString();
  const workflows: InboxItem[] = sources.workflows.flatMap((run) => {
    const paused = run.status === "paused" && !isLoopRunStoppedByUser(run.stopReason);
    const completed = run.status === "completed" && run.updatedAt >= ledger.baselineAt && run.updatedAt >= oldest;
    if (!paused && !completed) return [];
    const status = paused ? "paused" as const : "completed" as const;
    return [{ ...unmarked, kind: "workflow" as const, id: inboxItemId.workflow(run.runId, status, run.updatedAt), workspaceId: run.workspaceId, occurredAt: run.updatedAt,
      projectId: run.projectId, runId: run.runId, workflowName: run.workflowName, objective: run.objective, status, stopReason: run.stopReason }];
  });
  const connectors: InboxItem[] = sources.connectors.filter((connector) => connector.enabled && connector.status === "needs-auth")
    .map((connector) => ({ ...unmarked, kind: "connector", id: inboxItemId.connector(connector.id), workspaceId: null, occurredAt: ledger.baselineAt, connectorId: connector.id, name: connector.name }));
  const alerts: InboxItem[] = sources.alerts.map((alert) => ({ ...unmarked, kind: "alert", id: inboxItemId.alert(alert.appId, alert.alertId, alert.firedAt), workspaceId: alert.workspaceId,
    occurredAt: alert.firedAt, appId: alert.appId, appName: alert.appName, alertId: alert.alertId, title: alert.title, detail: alert.detail, tier: alert.tier }));
  return [...requests, ...outcomes, ...workflows, ...connectors, ...alerts];
}

function applyMark(candidate: InboxItem, mark: InboxMark | undefined, now: string): InboxItem | null {
  const needsYou = inboxTier(candidate) === "needs-you";
  if (mark?.doneAt && !needsYou) return null;
  const snoozedUntil = mark?.snoozedUntil && mark.snoozedUntil > now ? mark.snoozedUntil : null;
  return { ...candidate, readAt: needsYou ? null : mark?.readAt ?? null, snoozedUntil };
}

/**
 * Builds the inbox from its sources and the user's marks: needs-you items first, oldest first so nothing waits longest unseen,
 * then updates, newest first. Marks of items that no longer exist are dropped so the ledger cannot grow without bound.
 */
export function projectInbox(sources: InboxSources, ledger: InboxLedger, now: string): InboxProjection {
  const all = candidates(sources, ledger, now);
  const items = all.flatMap((candidate) => applyMark(candidate, ledger.marks[candidate.id], now) ?? []);
  const live = new Set(all.map((candidate) => candidate.id));
  const marks = Object.fromEntries(Object.entries(ledger.marks).filter(([id]) => live.has(id)));
  items.sort((a, b) => {
    const tierOrder = Number(inboxTier(a) === "update") - Number(inboxTier(b) === "update");
    if (tierOrder) return tierOrder;
    return inboxTier(a) === "needs-you" ? a.occurredAt.localeCompare(b.occurredAt) || a.id.localeCompare(b.id)
      : b.occurredAt.localeCompare(a.occurredAt) || a.id.localeCompare(b.id);
  });
  return { snapshot: { items }, marks };
}
