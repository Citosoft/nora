import type { WorkspaceRef } from "@shared/types/conversation/contracts.types";
import type { NativeWorkspace } from "@shared/types/personalization/workspaces.types";
import type { ThreadWorkspaceSnapshot } from "@/components/app/types/thread-workspace/state.types";
import type { ThreadRequestTarget } from "@/components/app/types/threadRequests.types";

export function threadRequestTarget(target: WorkspaceRef | undefined, workspace: NativeWorkspace | undefined): Omit<ThreadRequestTarget, "conversationIds"> | null {
  if (!target || !workspace?.shellProjectId || !target.branch || target.versionControl === "none"
    || target.environmentId !== workspace.workspace.environmentId || target.projectId !== workspace.workspace.projectId
    || target.path !== workspace.workspace.path) return null;
  return { key: JSON.stringify([workspace.shellProjectId, target.branch]), projectId: workspace.shellProjectId, branch: target.branch };
}

/** One lookup per repository branch, even when several visible threads share it. */
export function threadRequestTargets(state: ThreadWorkspaceSnapshot, conversationIds: readonly string[]): ThreadRequestTarget[] {
  const visible = new Set(conversationIds);
  const targets = new Map<string, ThreadRequestTarget>();
  for (const { conversation } of state.summaries) {
    if (!visible.has(conversation.id)) continue;
    const workspace = state.boot.workspaces.find((entry) => entry.id === conversation.workspace.projectId);
    const target = threadRequestTarget(conversation.workspace, workspace);
    if (!target) continue;
    const existing = targets.get(target.key);
    if (existing) existing.conversationIds.push(conversation.id);
    else targets.set(target.key, { ...target, conversationIds: [conversation.id] });
  }
  for (const target of targets.values()) target.conversationIds.sort();
  return [...targets.values()].sort((a, b) => a.key.localeCompare(b.key));
}
