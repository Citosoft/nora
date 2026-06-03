import { createScriptTerminalDefaults, formatWorkspaceScriptActionLabel } from "@/components/app/logic/workspaceScripts";
import type { WorkspaceWorktreeActionsMenuItemsProps } from "@/components/app/types/workspaceSidebarWorktreeActionsMenu.types";
import { noraSystemClient } from "@/components/app/clients/noraSystemClient";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Bot, Copy, ExternalLink, FolderOpen, GitBranch, TerminalSquare, Trash2 } from "lucide-react";

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
  const attachedAgentCount = workspace.agents.filter((agent) => agent.worktreeId === worktree.id).length;
  const attachedTerminalCount = workspace.terminals.filter((terminal) => terminal.worktreeId === worktree.id).length;
  const canRemoveWorktree =
    !isRootWorktree &&
    worktree.status !== "removing" &&
    attachedAgentCount === 0 &&
    attachedTerminalCount === 0;

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
        Focus worktree
      </DropdownMenuItem>
      <DropdownMenuItem
        disabled={!isActionable}
        onSelect={() =>
          onSelectWithClose(() => onOpenCreateAgentOnWorktree(workspace.project.id, worktree.id))
        }
      >
        <Bot className="size-4" />
        New agent
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
        <>
          <div className="px-3 pb-1 pt-1.5">
            <div className="border-t border-border/60 pt-2 text-[12px] font-medium text-muted-foreground">Scripts</div>
          </div>
          {worktree.scripts.map((script) => (
            <DropdownMenuItem
              key={script.id}
              disabled={!isActionable || !preferredShellId}
              onSelect={() =>
                onSelectWithClose(() => {
                  if (!preferredShellId) {
                    return;
                  }
                  onLaunchWorktreeScript(workspace.project.id, {
                    ...createScriptTerminalDefaults(script, preferredShellId),
                    target: { kind: "existing", worktreeId: worktree.id }
                  });
                })
              }
            >
              <TerminalSquare className="ml-4 size-4" />
              <span className="truncate">{formatWorkspaceScriptActionLabel(script)}</span>
            </DropdownMenuItem>
          ))}
        </>
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
          <div className="px-3 pb-1 pt-1.5">
            <div className="border-t border-border/60 pt-2" />
          </div>
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
