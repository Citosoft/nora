import { Plus } from "lucide-react";
import { useWorkspaceSidebarActions, useWorkspaceSidebarRuntime } from "@/components/app/context/workspaceSidebarContext";
import { useCanonicalAppSnapshot } from "@/components/app/hooks/useAppDomainState";
import { useWorktreePullRequests } from "@/components/app/hooks/useWorktreePullRequests";
import { resolvePreferredTerminalShellId } from "@/components/app/logic/terminalShellPreferences";
import { sortWorkspaceSidebarWorktrees } from "@/components/app/logic/workspaceSidebarPresentation";
import { WorkspaceScriptsMenu } from "@/components/app/panels/workspace-tools/WorkspaceScriptsMenu";
import { WorkspaceWorktreeRow } from "@/components/app/panels/workspace-tools/WorkspaceWorktreeRow";
import type { WorkspaceToolProps } from "@/components/app/types/workspaceNavigation.types";
import { Button } from "@/components/ui/button";

export function WorkspaceDevelopmentTool({ workspace }: WorkspaceToolProps) {
  const snapshot = useCanonicalAppSnapshot();
  const actions = useWorkspaceSidebarActions();
  const { removingWorkspaceRoots } = useWorkspaceSidebarRuntime();
  const statuses = useWorktreePullRequests(workspace);
  const preferredShellId = resolvePreferredTerminalShellId(snapshot?.terminalShells ?? []);
  const removing = removingWorkspaceRoots.includes(workspace.project.rootPath);
  const worktrees = sortWorkspaceSidebarWorktrees(workspace.worktrees, workspace.project.rootPath);
  const focusedId = snapshot?.sessions.find((session) => session.id === snapshot.currentSessionId)?.focusedWorktreeId;
  return <div className="h-full overflow-y-auto p-5">
    <div className="mb-3 flex items-center gap-2">
      <h3 className="flex-1 text-sm font-medium">Worktrees</h3>
      <WorkspaceScriptsMenu workspace={workspace} />
      <Button size="sm" variant="outline" disabled={removing} onClick={() => actions.onOpenCreateWorktree(workspace.project.id)}><Plus className="size-4" />New worktree</Button>
    </div>
    <div className="space-y-2">{worktrees.map((worktree) => <WorkspaceWorktreeRow key={worktree.id} workspace={workspace} worktree={worktree}
      focused={focusedId === worktree.id} removing={removing} preferredShellId={preferredShellId}
      pullRequestStatus={statuses[`${workspace.project.id}:${worktree.branch.trim()}`] ?? null} />)}</div>
    {!worktrees.length && <p className="text-sm text-muted-foreground">No worktrees detected yet.</p>}
  </div>;
}
