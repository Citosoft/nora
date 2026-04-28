import { createTerminalPresetPayload, isRunnableTerminalPreset, resolveTerminalPresetShell } from "@/components/app/logic/terminalPresets";
import { createQuickTerminalDialogDefaults, createQuickTerminalPayload } from "@/components/app/logic/terminalQuickLaunch";
import type { WorkspaceWorkspaceActionsMenuItemsProps } from "@/components/app/types/workspaceSidebarActionsMenu.types";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { FolderKanban, Globe, Plus, ScrollText, TerminalSquare, Wrench, X } from "lucide-react";

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
  const runnableWorkspaceTerminalPresets = (workspace.project.workspaceTerminalPresets ?? []).filter((preset) =>
    isRunnableTerminalPreset(preset)
  );
  const hasAnyRunnableTerminalPresets =
    runnableWorkspaceTerminalPresets.length > 0 || runnableGlobalTerminalPresets.length > 0;

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
      <DropdownMenuItem
        onSelect={() =>
          onSelectWithClose(() =>
            preferredShellId
              ? onLaunchWorkspaceTerminal(
                  workspace.project.id,
                  createQuickTerminalPayload(preferredShellId, terminalQuickLaunchDefaults)
                )
              : workspace.project.id === focusedProjectId
                ? undefined
                : onFocusWorkspace(workspace.project.id)
          )
        }
      >
        <TerminalSquare className="size-4" />
        New Terminal (Defaults)
      </DropdownMenuItem>
      <DropdownMenuItem
        onSelect={() =>
          onSelectWithClose(() =>
            workspace.project.id === focusedProjectId
              ? onOpenCreateTerminal(createQuickTerminalDialogDefaults(preferredShellId, terminalQuickLaunchDefaults))
              : onFocusWorkspace(workspace.project.id)
          )
        }
      >
        <TerminalSquare className="size-4" />
        New Terminal
      </DropdownMenuItem>
      <DropdownMenuItem onSelect={() => onSelectWithClose(() => onOpenWorkspaceTerminalPresets(workspace.project.id))}>
        <Wrench className="size-4" />
        Configure terminal presets
      </DropdownMenuItem>
      {hasAnyRunnableTerminalPresets ? (
        <div className="px-3 pb-1 pt-1.5">
          <div className="border-t border-border/60 pt-2 text-[12px] font-medium text-muted-foreground">Terminal presets</div>
        </div>
      ) : null}
      {runnableWorkspaceTerminalPresets.length > 0 ? (
        <div className="px-3 pb-1 pt-0.5 text-[12px] font-medium text-muted-foreground">Workspace presets</div>
      ) : null}
      {runnableWorkspaceTerminalPresets.map((preset) => (
        <DropdownMenuItem
          key={preset.id}
          onSelect={() =>
            onSelectWithClose(() => {
              const shell = resolveTerminalPresetShell(preset, terminalShells, preferredShellId);
              if (!shell) {
                return;
              }
              onLaunchWorkspaceTerminal(workspace.project.id, createTerminalPresetPayload(preset, shell));
            })
          }
        >
          <TerminalSquare className="ml-4 size-4" />
          <span className="truncate">{preset.name}</span>
        </DropdownMenuItem>
      ))}
      {runnableGlobalTerminalPresets.length > 0 ? (
        <div className="px-3 pb-1 pt-0.5 text-[12px] font-medium text-muted-foreground">Global presets</div>
      ) : null}
      {runnableGlobalTerminalPresets.map((preset) => (
        <DropdownMenuItem
          key={preset.id}
          onSelect={() =>
            onSelectWithClose(() => {
              const shell = resolveTerminalPresetShell(preset, terminalShells, preferredShellId);
              if (!shell) {
                return;
              }
              onLaunchWorkspaceTerminal(workspace.project.id, createTerminalPresetPayload(preset, shell));
            })
          }
        >
          <TerminalSquare className="ml-4 size-4" />
          <span className="truncate">{preset.name}</span>
        </DropdownMenuItem>
      ))}
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
        Remove workspace
      </DropdownMenuItem>
    </>
  );
};
