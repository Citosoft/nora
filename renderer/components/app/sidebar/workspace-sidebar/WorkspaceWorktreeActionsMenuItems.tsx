import { createScriptTerminalDefaults, formatWorkspaceScriptActionLabel } from "@/components/app/logic/workspaceScripts";
import { canRemoveWorkspaceWorktree } from "@/components/app/logic/worktreeRemoval";
import type { WorkspaceWorktreeActionsMenuItemsProps } from "@/components/app/types/workspaceSidebarWorktreeActionsMenu.types";
import { noraSystemClient } from "@/components/app/clients/noraSystemClient";
import { DropdownMenuItem, DropdownMenuSeparator, DropdownMenuSub } from "@/components/ui/dropdown-menu";
import { Copy, ExternalLink, FolderOpen, GitBranch, MessageSquarePlus, Play, TerminalSquare, Trash2 } from "lucide-react";

export const WorkspaceWorktreeActionsMenuItems = ({
  workspace,
  worktree,
  pullRequestStatus,
  isRootWorktree,
  preferredShellId,
  onItemSelected,
  onFocusWorktree,
  onOpenCreateAgentOnWorktree,
  onOpenCreateTerminalOnWorktree,
  onLaunchQuickTerminalOnWorktree,
  onLaunchWorktreeScript,
  onOpenPullRequest,
  onRemoveWorktree
}: WorkspaceWorktreeActionsMenuItemsProps) => {
  const isActionable = worktree.status === "ready" || worktree.status === "creating";
  const pullRequestWebUrl = pullRequestStatus?.webUrl ?? null;
  const canRemoveWorktree = canRemoveWorkspaceWorktree(workspace, worktree, isRootWorktree);

  const onSelectWithClose = (action: () => void) => {
    action();
    onItemSelected?.();
  };

  return (
    <>
      <DropdownMenuItem
        disabled={!isActionable}
        onSelect={() => onSelectWithClose(onFocusWorktree)}
      >
        <GitBranch className="size-4" />
        Review worktree changes
      </DropdownMenuItem>
      <DropdownMenuItem
        disabled={!isActionable}
        onSelect={() =>
          onSelectWithClose(() => onOpenCreateAgentOnWorktree(workspace.project.id, worktree.id))
        }
      >
        <MessageSquarePlus className="size-4" />
        New thread
      </DropdownMenuItem>
      <DropdownMenuItem
        disabled={!isActionable || !preferredShellId}
        onSelect={() =>
          onSelectWithClose(() => onLaunchQuickTerminalOnWorktree(workspace.project.id, worktree.id))
        }
      >
        <TerminalSquare className="size-4" />
        New terminal (defaults)
      </DropdownMenuItem>
      <DropdownMenuItem
        disabled={!isActionable}
        onSelect={() =>
          onSelectWithClose(() => onOpenCreateTerminalOnWorktree(workspace.project.id, worktree.id))
        }
      >
        <TerminalSquare className="size-4" />
        New terminal
      </DropdownMenuItem>
      {worktree.scripts.length ? (
        <DropdownMenuSub label="Run script" icon={<Play className="size-4" />} disabled={!isActionable || !preferredShellId}>
          {worktree.scripts.map((script) => (
            <DropdownMenuItem
              key={script.id}
              disabled={!isActionable || !preferredShellId}
              onSelect={() =>
                onSelectWithClose(() => {
                  if (!preferredShellId) {
                    return;
                  }
                  const defaults = createScriptTerminalDefaults(script, preferredShellId);
                  onLaunchWorktreeScript(workspace.project.id, {
                    ...defaults,
                    name: defaults.name ?? formatWorkspaceScriptActionLabel(script),
                    target: { kind: "existing", worktreeId: worktree.id }
                  });
                })
              }
            >
              <Play className="size-4" />
              <span className="truncate">{formatWorkspaceScriptActionLabel(script)}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuSub>
      ) : null}
      {pullRequestWebUrl ? (
        <DropdownMenuItem
          onSelect={() =>
            onSelectWithClose(() => onOpenPullRequest(workspace.project.id, pullRequestWebUrl))
          }
        >
          <ExternalLink className="size-4" />
          Open pull request
        </DropdownMenuItem>
      ) : null}
      <DropdownMenuItem
        onSelect={() => onSelectWithClose(() => void noraSystemClient.copyText(worktree.path))}
      >
        <Copy className="size-4" />
        Copy path
      </DropdownMenuItem>
      {!isRootWorktree ? (
        <DropdownMenuItem
          onSelect={() => onSelectWithClose(() => void noraSystemClient.revealFileInFolder(worktree.path))}
        >
          <FolderOpen className="size-4" />
          Reveal in folder
        </DropdownMenuItem>
      ) : (
        <DropdownMenuItem
          onSelect={() => onSelectWithClose(() => void noraSystemClient.revealFileInFolder(worktree.path))}
        >
          <FolderOpen className="size-4" />
          Reveal repository
        </DropdownMenuItem>
      )}
      {!isRootWorktree ? (
        <>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            destructive
            disabled={!canRemoveWorktree}
            onSelect={() =>
              onSelectWithClose(() =>
                onRemoveWorktree(workspace.project.id, worktree.id, worktree.branch)
              )
            }
          >
            <Trash2 className="size-4" />
            Delete worktree
          </DropdownMenuItem>
        </>
      ) : null}
    </>
  );
};
