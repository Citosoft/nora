import type { ConversationCommand } from "@shared/types/conversation/contracts.types";
import type { ThreadWorkspaceInternals } from "@/components/app/types/thread-workspace/internals.types";
import type { ThreadSettlementTarget } from "@/components/app/types/thread-workspace/settlement.types";
import type { ThreadListRow } from "@/components/app/types/thread-workspace/list.types";
import { adoptExternalSession } from "./externalSessions";
import { closeThreadDocument } from "./changes";

export function canSettleThread(row: Pick<ThreadListRow, "target" | "active" | "queuedCount">): boolean {
  return row.target.kind !== "draft" && !row.active && row.queuedCount === 0
    && (row.target.kind !== "external" || !row.target.disabled);
}

/** Hiding a thread (settling it, or resetting a direct chat) closes its views but keeps drafts, transcript, pins and provider identity intact. */
export async function applyThreadSettlement(internal: ThreadWorkspaceInternals,
  command: Extract<ConversationCommand, { kind: "archive" | "unarchive" | "reset-direct" }>): Promise<void> {
  const hides = command.kind !== "unarchive";
  const documents = internal.snapshot().layout.documents.filter((document) => (document.target.kind === "thread" && document.target.conversationId === command.conversationId)
    || document.pending?.submit.conversationId === command.conversationId);
  if (hides && documents.some((document) => document.pending)) throw new Error("Confirm pending delivery before settling this thread.");
  await internal.deps.client.execute(command);
  if (hides) {
    const layout = internal.snapshot().layout;
    const views = layout.documents.filter((document) => document.target.kind === "thread" && document.target.conversationId === command.conversationId);
    internal.save(views.reduce((next, document) => closeThreadDocument(next, document.id), layout));
  }
}

export async function setThreadSettlement(internal: ThreadWorkspaceInternals, target: ThreadSettlementTarget, settled: boolean): Promise<void> {
  const conversationId = target.kind === "external"
    ? await adoptExternalSession(internal.deps, internal.snapshot().boot, target.entry.workspaceId, target.entry.session)
    : target.conversationId;
  await applyThreadSettlement(internal, { kind: settled ? "archive" : "unarchive", conversationId, commandId: internal.deps.nextId() });
}

/** Settles and retires a direct chat so the bot's next message starts a fresh one; its old history stays as a settled thread. */
export async function resetDirectChat(internal: ThreadWorkspaceInternals, conversationId: string): Promise<void> {
  await applyThreadSettlement(internal, { kind: "reset-direct", conversationId, commandId: internal.deps.nextId() });
}
