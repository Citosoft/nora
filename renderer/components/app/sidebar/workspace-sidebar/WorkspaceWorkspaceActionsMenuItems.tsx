import { TerminalLaunchMenuItems } from "@/components/app/panels/workspace-tools/TerminalLaunchMenuItems";
import type { WorkspaceWorkspaceActionsMenuItemsProps } from "@/components/app/types/workspaceSidebarActionsMenu.types";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { FolderKanban, Globe, Plus, ScrollText, X } from "lucide-react";

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
  onRemoveProject
}: WorkspaceWorkspaceActionsMenuItemsProps) => {
  const onSelectWithClose = (action: () => void) => {
    action();
    onItemSelected?.();
  };

  return (
    <>
      <DropdownMenuItem
        onSelect={() =>
          onSelectWithClose(() =>
            workspace.project.id === focusedProjectId ? onOpenCreateAgent() : onFocusWorkspace(workspace.project.id)
          )
        }
      >
        <Plus className="size-4" />
        New agent
      </DropdownMenuItem>
      <DropdownMenuItem onSelect={() => onSelectWithClose(() => onOpenWorkspaceBrowser(workspace.project.id))}>
        <Globe className="size-4" />
        New browser
      </DropdownMenuItem>
      <TerminalLaunchMenuItems workspace={workspace} focusedProjectId={focusedProjectId} terminalShells={terminalShells} preferredShellId={preferredShellId} terminalQuickLaunchDefaults={terminalQuickLaunchDefaults} runnableGlobalTerminalPresets={runnableGlobalTerminalPresets} onItemSelected={onItemSelected} onFocusWorkspace={onFocusWorkspace} onLaunchWorkspaceTerminal={onLaunchWorkspaceTerminal} onOpenCreateTerminal={onOpenCreateTerminal} onOpenWorkspaceTerminalPresets={onOpenWorkspaceTerminalPresets} />
      <DropdownMenuItem onSelect={() => onSelectWithClose(() => onCreateTask(workspace.project.id))}>
        <FolderKanban className="size-4" />
        New task
      </DropdownMenuItem>
      <DropdownMenuItem onSelect={() => onSelectWithClose(() => onCreateSpec(workspace.project.id))}>
        <ScrollText className="size-4" />
        New spec
      </DropdownMenuItem>
      <DropdownMenuItem destructive onSelect={() => onSelectWithClose(() => onRemoveProject(workspace.project.rootPath))}>
        <X className="size-4" />
        Remove project
      </DropdownMenuItem>
    </>
  );
};
