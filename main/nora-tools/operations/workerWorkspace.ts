import { isGitProject } from "@shared/projectVersionControl";
import type { Conversation, WorkspaceRef } from "@shared/types/conversation/contracts.types";
import type { NoraWorkerWorkspaces } from "@main/types/nora-tools/workerWorkspaces.types";
import type { StartWorkerToolInput } from "@main/types/nora-tools/noraTools.types";

/** Git writers get their own checkout by default; readers and non-Git work stay in the caller's folder. */
export async function workerWorkspace(input: StartWorkerToolInput, parent: Conversation, access: WorkspaceRef["access"], workspaces: NoraWorkerWorkspaces | undefined): Promise<WorkspaceRef> {
  const workspace = { ...parent.workspace, access };
  const isolation = input.isolation ?? (access === "write" && isGitProject(workspace) ? "worktree" : "shared");
  if (isolation === "shared") return workspace;
  if (access !== "write") throw new Error("Read-only workers share the caller's checkout. Use isolation shared with read access.");
  if (!isGitProject(workspace)) throw new Error("This workspace is not a Git repository. Use read access, or isolation shared after its current writer finishes.");
  if (!workspaces) throw new Error("Worker worktrees are unavailable here. Use read access, or isolation shared after its current writer finishes.");
  const isolated = await workspaces.isolate(workspace, input.title);
  if (isolated.environmentId !== workspace.environmentId || isolated.projectId !== workspace.projectId
    || isolated.checkoutId === workspace.checkoutId || isolated.path === workspace.path || isolated.access !== "write") {
    throw new Error("The worker worktree did not resolve to a separate writable checkout in this workspace.");
  }
  return isolated;
}
