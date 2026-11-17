import type { NativeWorkspace } from "@shared/types/personalization/workspaces.types";
import type { WorkspaceRef } from "@shared/types/conversation/contracts.types";

/** Every checkout a thread in this workspace can run in: the primary checkout first, then its worktrees. */
export function workspaceCheckouts(workspace: NativeWorkspace): WorkspaceRef[] {
  return [workspace.workspace, ...(workspace.checkouts ?? [])];
}

/**
 * The workspace as a thread sees it: an existing thread keeps the checkout it was created in, and a draft uses its chosen
 * checkout while that is still registered. Identity (id, roles, bots) always stays the workspace's own.
 */
export function workspaceForThread(workspace: NativeWorkspace, selection: { checkoutId?: string; conversationWorkspace?: WorkspaceRef }): NativeWorkspace {
  const pinned = selection.conversationWorkspace;
  if (pinned && pinned.projectId === workspace.id) return { ...workspace, workspace: pinned };
  const checkout = selection.checkoutId ? workspace.checkouts?.find((entry) => entry.checkoutId === selection.checkoutId) : undefined;
  return checkout ? { ...workspace, workspace: checkout } : workspace;
}
