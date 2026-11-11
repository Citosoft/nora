import { createTerminalPresetPayload, isRunnableTerminalPreset, resolveTerminalPresetShell } from "@/components/app/logic/terminalPresets";
import { createQuickTerminalDialogDefaults, createQuickTerminalPayload } from "@/components/app/logic/terminalQuickLaunch";
import type { TerminalLaunchMenuProps } from "@/components/app/types/workspaceNavigation.types";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { TerminalSquare, Wrench } from "lucide-react";

export function TerminalLaunchMenuItems({ workspace, focusedProjectId, terminalShells, preferredShellId, terminalQuickLaunchDefaults, runnableGlobalTerminalPresets, onItemSelected, onFocusWorkspace, onLaunchWorkspaceTerminal, onOpenCreateTerminal, onOpenWorkspaceTerminalPresets }: TerminalLaunchMenuProps) {
  const runnableWorkspaceTerminalPresets = (workspace.project.workspaceTerminalPresets ?? []).filter((preset) =>
    isRunnableTerminalPreset(preset)
  );
  const hasAnyRunnableTerminalPresets =
    runnableWorkspaceTerminalPresets.length > 0 || runnableGlobalTerminalPresets.length > 0;

  const onSelectWithClose = (action: () => void) => {
    action();
    onItemSelected?.();
  };

return <>
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
        <div className="px-3 pb-1 pt-0.5 text-[12px] font-medium text-muted-foreground">Project presets</div>
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
</>;
}
