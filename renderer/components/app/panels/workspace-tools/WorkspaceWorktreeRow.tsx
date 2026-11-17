import { Ellipsis, GitBranch, Trash2 } from "lucide-react";
import { useWorkspaceSidebarActions } from "@/components/app/context/workspaceSidebarContext";
import { useWorkspaceNavigation } from "@/components/app/hooks/useWorkspaceNavigation";
import { useStatusBar } from "@/components/app/logic/statusBarContext";
import { formatWorkspaceSidebarWorktreeLocationLabel, getWorkspaceSidebarPullRequestDotClass, workspaceSidebarHasPullRequestState } from "@/components/app/logic/workspaceSidebarPresentation";
import { canRemoveWorkspaceWorktree } from "@/components/app/logic/worktreeRemoval";
import { WorkspaceWorktreeActionsMenuItems } from "@/components/app/sidebar/workspace-sidebar/WorkspaceWorktreeActionsMenuItems";
import type { WorkspaceWorktreeRowProps } from "@/components/app/types/workspaceNavigation.types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu } from "@/components/ui/dropdown-menu";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export function WorkspaceWorktreeRow({ workspace, worktree, focused, removing, preferredShellId, pullRequestStatus }: WorkspaceWorktreeRowProps) {
  const actions = useWorkspaceSidebarActions();
  const { openTool } = useWorkspaceNavigation();
  const statusBar = useStatusBar();
  const root = worktree.path === workspace.project.rootPath || worktree.createdFromRef === "ROOT";
  const canRemove = canRemoveWorkspaceWorktree(workspace, worktree, root);
  const actionable = worktree.status === "ready" || worktree.status === "creating";
  const focus = () => { actions.onFocusWorkspaceView(worktree.id); };
  const checkout = async () => {
    const statusId = statusBar.beginStatus(`Checking out ${worktree.branch}`, true);
    try { await actions.onCheckoutWorkspaceBranch(workspace.project.id, worktree.branch); }
    finally { statusBar.endStatus(statusId); }
  };
  return <div className={cn("flex min-w-0 items-center gap-2 rounded-lg border border-border/60 p-3", focused && "bg-primary/10")}>
    <button type="button" className="flex min-w-0 flex-1 items-center gap-2 text-left" disabled={removing || !actionable} onClick={focus} title={worktree.path}>
      <GitBranch className="size-4 shrink-0 text-muted-foreground" />
      <span className="min-w-0"><span className="block truncate text-sm font-medium">{worktree.branch}</span><span className="block truncate text-xs text-muted-foreground">{formatWorkspaceSidebarWorktreeLocationLabel(worktree, workspace.project.rootPath)}</span></span>
    </button>
    {worktree.status !== "ready" && <Badge variant="outline">{worktree.status}</Badge>}
    {workspaceSidebarHasPullRequestState(pullRequestStatus?.state) && pullRequestStatus && <Tooltip content={pullRequestStatus.pullRequestNumber ? `${pullRequestStatus.label} (#${pullRequestStatus.pullRequestNumber})` : pullRequestStatus.label}>
      <span className={cn("size-2 shrink-0 rounded-full", getWorkspaceSidebarPullRequestDotClass(pullRequestStatus.state))} role="img" aria-label={`Pull request status: ${pullRequestStatus.label}`} />
    </Tooltip>}
    <Button variant="ghost" size="sm" disabled={removing || worktree.status !== "ready"} onClick={() => void checkout()} aria-label={`Check out ${worktree.branch} in root project`}>Check out</Button>
    {!root && <Button variant="ghost" size="icon" className="size-7 text-muted-foreground hover:text-destructive" disabled={removing || !canRemove} onClick={() => actions.onRemoveWorktree(workspace.project.id, worktree.id, worktree.branch)} aria-label={`Delete worktree ${worktree.branch}`} title={canRemove ? "Delete worktree" : "Remove attached agents and terminals first"}><Trash2 className="size-3.5" /></Button>}
    <DropdownMenu align="end" trigger={<Button variant="ghost" size="icon" className="size-7" disabled={removing} aria-label={`Worktree actions for ${worktree.branch}`}><Ellipsis className="size-4" /></Button>}>
      <WorkspaceWorktreeActionsMenuItems workspace={workspace} worktree={worktree} preferredShellId={preferredShellId} pullRequestStatus={pullRequestStatus} isRootWorktree={root}
        onFocusWorktree={focus} onOpenCreateAgentOnWorktree={actions.onOpenCreateAgentOnWorktree} onOpenCreateTerminalOnWorktree={actions.onOpenCreateTerminalOnWorktree}
        onLaunchQuickTerminalOnWorktree={(id, worktreeId) => { actions.onLaunchQuickTerminalOnWorktree(id, worktreeId); openTool(id, "terminals"); }} onLaunchWorktreeScript={(id, payload) => { actions.onLaunchWorktreeScript(id, payload); openTool(id, "terminals"); }} onRemoveWorktree={actions.onRemoveWorktree} onOpenPullRequest={(id, url) => { actions.onOpenWorkspaceBrowser(id, url); openTool(id, "browser"); }} />
    </DropdownMenu>
  </div>;
}
