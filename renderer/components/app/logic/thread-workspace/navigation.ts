import type { ThreadWorkspaceSnapshot } from "@/components/app/types/thread-workspace/state.types";
import type { ThreadNavigationFilter, ThreadNavigationRow, ThreadNavigationStatus, ThreadRunState } from "@/components/app/types/thread-workspace/ports.types";
import type { MemberThreadVisibility } from "@/components/app/types/thread-workspace/navigation.types";
import { threadDocumentTitle } from "./changes";
import { waitingDescendants } from "./attention";
import { findEffectiveBot } from "@shared/bots/catalog";

const statusLabels: Readonly<Record<ThreadRunState, ThreadNavigationStatus>> = {
  queued: "Queued", starting: "Starting", running: "Working", "awaiting-approval": "Needs approval", "awaiting-input": "Needs input",
  stopping: "Stopping", completed: "Completed", failed: "Failed", interrupted: "Interrupted", recovering: "Outcome unconfirmed"
};
const terminal = new Set<ThreadRunState>(["completed", "failed", "interrupted"]);
const working = new Set<ThreadRunState>(["starting", "running", "stopping"]);

function draftBot(state: ThreadWorkspaceSnapshot, workspaceId: string, botId: string | null | undefined): ThreadNavigationRow["bot"] {
  const bot = botId ? findEffectiveBot(state.boot.personalization.bots, workspaceId, state.boot.sharedBots, botId) : null;
  return bot ? { botId: bot.id, name: bot.name, avatar: bot.avatar } : null;
}

function draftGroup(state: ThreadWorkspaceSnapshot, workspaceId: string, botIds: readonly string[] | undefined): ThreadNavigationRow["group"] {
  if (!botIds) return null;
  return botIds.flatMap((botId) => { const member = draftBot(state, workspaceId, botId); return member ? [member] : []; });
}

/** Project native summaries directly; no terminal-agent records or token-based activity inference. */
export function buildThreadNavigation(state: ThreadWorkspaceSnapshot, workspaceId: string | null, filter: ThreadNavigationFilter): ThreadNavigationRow[] {
  const pins = new Set(state.layout.pinnedThreadIds);
  const activeDocument = state.layout.documents.find((entry) => entry.id === state.layout.activeId);
  const rows: ThreadNavigationRow[] = [];
  const groupIds = new Set(state.summaries.flatMap(({ conversation }) => conversation.group ? [conversation.id] : []));
  if (filter !== "settled") for (const document of state.layout.documents) {
    if (document.target.kind !== "draft" || (workspaceId && document.workspaceId !== workspaceId)) continue;
    rows.push({ id: document.id, target: { kind: "draft", documentId: document.id }, title: threadDocumentTitle(document, state.summaries),
      workspaceId: document.workspaceId, providerKind: document.provider?.kind ?? null,
      bot: draftBot(state, document.workspaceId, document.botId), group: draftGroup(state, document.workspaceId, document.group?.botIds), status: document.pending ? "Delivery unconfirmed" : "Draft",
      active: !!document.pending, working: false, unread: false, attention: !!document.pending, pinned: false, selected: document.id === state.layout.activeId,
      hasDraft: true, queuedCount: 0, updatedAt: document.updatedAt });
  }
  const waiting = waitingDescendants(state.summaries);
  for (const summary of state.summaries) {
    const { conversation, latestRun, queuedCount, pendingRequestCount } = summary;
    if (conversation.workspace.environmentId !== state.boot.environmentId || (workspaceId && conversation.workspace.projectId !== workspaceId)
      || (!!conversation.archivedAt !== (filter === "settled"))) continue;
    // A create accepted before a lost submit reply is represented by its recoverable draft, once.
    if (state.layout.documents.some((entry) => entry.target.kind === "draft" && entry.pending?.submit.conversationId === conversation.id)) continue;
    const active = !!latestRun && !terminal.has(latestRun.state);
    const document = state.layout.documents.find((entry) => entry.target.kind === "thread" && entry.target.conversationId === conversation.id);
    rows.push({ id: conversation.id, target: { kind: "thread", conversationId: conversation.id }, title: conversation.title,
      workspaceId: conversation.workspace.projectId, providerKind: conversation.provider.kind, origin: conversation.origin,
      bot: conversation.bot ? { botId: conversation.bot.botId, name: conversation.bot.name, avatar: conversation.bot.avatar } : null,
      group: conversation.group?.members ?? null,
      waitingOn: conversation.archivedAt ? null : waiting.get(conversation.id) ?? null,
      groupMember: !!conversation.parentId && groupIds.has(conversation.parentId),
      settled: !!conversation.archivedAt,
      status: conversation.archivedAt ? "Settled" : pendingRequestCount ? (latestRun?.state === "awaiting-approval" ? "Needs approval" : "Needs input")
        : conversation.queuePaused && queuedCount ? "Queue paused" : latestRun ? statusLabels[latestRun.state] : "Ready",
      unread: state.unreadThreadIds.includes(conversation.id),
      active: active || queuedCount > 0, working: pendingRequestCount === 0 && !!latestRun && working.has(latestRun.state),
      attention: pendingRequestCount > 0 || (!conversation.archivedAt && waiting.has(conversation.id)) || (conversation.queuePaused && queuedCount > 0)
        || latestRun?.state === "failed" || latestRun?.state === "recovering" || !!document?.pending,
      pinned: pins.has(conversation.id), selected: activeDocument?.target.kind === "thread" && activeDocument.target.conversationId === conversation.id,
      hasDraft: !!document?.text || !!document?.attachments?.length || !!document?.threadReferences?.length || !!document?.pending, queuedCount, updatedAt: conversation.updatedAt });
  }
  return rows.filter((entry) => filter !== "active" || entry.active).filter((entry) => filter !== "attention" || entry.attention || entry.unread)
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt.localeCompare(a.updatedAt) || a.id.localeCompare(b.id));
}

/** Hidden member threads still surface while they need the user, since an approval or question there blocks the group's reply. */
export function applyMemberThreadVisibility<Row extends Pick<ThreadNavigationRow, "groupMember" | "attention">>(rows: readonly Row[], visibility: MemberThreadVisibility): Row[] {
  return visibility === "visible" ? [...rows] : rows.filter((row) => !row.groupMember || row.attention);
}
