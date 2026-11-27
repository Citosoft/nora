import { TerminalLaunchMenuItems } from "@/components/app/panels/workspace-tools/TerminalLaunchMenuItems";
import type { WorkspaceWorkspaceActionsMenuItemsProps } from "@/components/app/types/workspaceSidebarActionsMenu.types";
import { getWorkspaceRunnableScripts, hasWorkspaceRunnableScripts } from "@/components/app/logic/workspaceScripts";
import { WorkspaceScriptMenuItems } from "@/components/app/panels/workspace-tools/WorkspaceScriptMenuItems";
import { WorkspaceSetupScriptMenuItems } from "@/components/app/panels/workspace-tools/WorkspaceSetupScriptMenuItems";
import { DropdownMenuGroup, DropdownMenuItem, DropdownMenuSub } from "@/components/ui/dropdown-menu";
import { FolderKanban, GitBranch, Globe, MessageSquarePlus, Play, ScrollText, StickyNote } from "lucide-react";

/** Create and Terminal sections of the workspace actions menu; scripts pop out from Terminal. */
export const WorkspaceWorkspaceActionsMenuItems = ({
  workspace,
  focusedProjectId,
  terminalShells,
  preferredShellId,
  terminalQuickLaunchDefaults,
  runnableGlobalTerminalPresets,
  onItemSelected,
  onOpenCreateAgent,
  onFocusWorkspace,
  onOpenWorkspaceBrowser,
  onLaunchWorkspaceTerminal,
  onOpenCreateTerminal,
  onOpenWorkspaceTerminalPresets,
  onCreateTask,
  onCreateSpec,
  onCreateNote,
  onCreateWorktree
}: WorkspaceWorkspaceActionsMenuItemsProps) => {
  const projectId = workspace.project.id;
  const scripts = getWorkspaceRunnableScripts(workspace);
  const onSelectWithClose = (action: () => void) => {
    action();
    onItemSelected?.();
  };

  return (
    <>
      <DropdownMenuGroup label="Create">
        <DropdownMenuItem
          onSelect={() =>
            onSelectWithClose(() => (projectId === focusedProjectId ? onOpenCreateAgent() : onFocusWorkspace(projectId)))
          }
        >
          <MessageSquarePlus className="size-4" />
          New thread
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onSelectWithClose(() => onCreateTask(projectId))}>
          <FolderKanban className="size-4" />
          New task
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onSelectWithClose(() => onCreateSpec(projectId))}>
          <ScrollText className="size-4" />
          New spec
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onSelectWithClose(() => onCreateNote(projectId))}>
          <StickyNote className="size-4" />
          New note
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onSelectWithClose(() => onOpenWorkspaceBrowser(projectId))}>
          <Globe className="size-4" />
          New browser
        </DropdownMenuItem>
        {onCreateWorktree && (
          <DropdownMenuItem onSelect={() => onSelectWithClose(onCreateWorktree)}>
            <GitBranch className="size-4" />
            New worktree…
          </DropdownMenuItem>
        )}
      </DropdownMenuGroup>
      <TerminalLaunchMenuItems workspace={workspace} focusedProjectId={focusedProjectId} terminalShells={terminalShells} preferredShellId={preferredShellId} terminalQuickLaunchDefaults={terminalQuickLaunchDefaults} runnableGlobalTerminalPresets={runnableGlobalTerminalPresets} onItemSelected={onItemSelected} onFocusWorkspace={onFocusWorkspace} onLaunchWorkspaceTerminal={onLaunchWorkspaceTerminal} onOpenCreateTerminal={onOpenCreateTerminal} onOpenWorkspaceTerminalPresets={onOpenWorkspaceTerminalPresets}>
        {hasWorkspaceRunnableScripts(scripts) && (
          <DropdownMenuSub label="Run script" icon={<Play className="size-4" />}>
            <WorkspaceScriptMenuItems workspace={workspace} scripts={scripts.packageScripts} onItemSelected={onItemSelected} />
            <WorkspaceSetupScriptMenuItems workspace={workspace} onItemSelected={onItemSelected} />
          </DropdownMenuSub>
        )}
      </TerminalLaunchMenuItems>
    </>
  );
};
