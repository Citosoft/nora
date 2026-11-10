import { effectiveRole } from "@shared/personalization/profiles";
import type { NativeBoot } from "@shared/ipc/types/personalizationGateway.types";
import type { ThreadDocument, ThreadLayout, OpenThreadDraft } from "@/components/app/types/thread-workspace/state.types";
import type { ConversationSummary } from "@shared/types/conversation/queries.types";

export function focusThreadDocument(layout: ThreadLayout, document: ThreadDocument): ThreadLayout {
  return { ...layout, focusedWorkspaceId: document.workspaceId, activeId: document.id,
    openIds: layout.openIds.includes(document.id) ? layout.openIds : [...layout.openIds, document.id] };
}

export function createThreadDraft(boot: NativeBoot, input: OpenThreadDraft, id: string, now: string): ThreadDocument {
  const workspace = boot.workspaces.find((entry) => entry.id === input.workspaceId);
  if (!workspace || workspace.workspace.environmentId !== boot.environmentId) throw new Error("Choose a workspace on the owning execution host.");
  const role = effectiveRole(boot.personalization, workspace.id);
  if (!role) throw new Error("Choose your role before starting a thread.");
  return { id, ...(input.source ? { source: input.source } : {}), workspaceId: workspace.id, target: { kind: "draft" }, role, text: input.text ?? "", provider: input.provider ?? null, pending: null, updatedAt: now };
}

export function openThreadDocument(summary: ConversationSummary, id: string): ThreadDocument {
  const { conversation } = summary;
  return { id, ...(conversation.source ? { source: conversation.source } : {}), workspaceId: conversation.workspace.projectId, target: { kind: "thread", conversationId: conversation.id },
    role: conversation.role?.selection ?? null, text: "", provider: conversation.provider, pending: null, updatedAt: conversation.updatedAt };
}

export function closeThreadDocument(layout: ThreadLayout, documentId: string): ThreadLayout {
  const index = layout.openIds.indexOf(documentId);
  const openIds = layout.openIds.filter((id) => id !== documentId);
  if (layout.activeId !== documentId) return { ...layout, openIds };
  const workspaceIds = openIds.filter((id) => layout.documents.find((entry) => entry.id === id)?.workspaceId === layout.focusedWorkspaceId);
  const right = layout.openIds.slice(index + 1).find((id) => workspaceIds.includes(id));
  return { ...layout, openIds, activeId: right ?? workspaceIds.at(-1) ?? null };
}

export function threadDocumentTitle(document: ThreadDocument, summaries: readonly ConversationSummary[]): string {
  if (document.target.kind === "thread") {
    const conversationId = document.target.conversationId;
    return summaries.find((entry) => entry.conversation.id === conversationId)?.conversation.title ?? "Thread";
  }
  return document.text.trim().split("\n")[0]?.slice(0, 70) || "New thread";
}
