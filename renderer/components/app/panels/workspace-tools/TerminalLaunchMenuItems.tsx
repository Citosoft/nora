import { createTerminalPresetPayload, isRunnableTerminalPreset, resolveTerminalPresetShell } from "@/components/app/logic/terminalPresets";
import { createQuickTerminalDialogDefaults, createQuickTerminalPayload } from "@/components/app/logic/terminalQuickLaunch";
import type { TerminalLaunchMenuProps } from "@/components/app/types/workspaceNavigation.types";
import { DropdownMenuGroup, DropdownMenuItem, DropdownMenuSub } from "@/components/ui/dropdown-menu";
import type { TerminalPreset } from "@shared/appTypes";
import { Layers, TerminalSquare, Wrench } from "lucide-react";

export function TerminalLaunchMenuItems({ workspace, focusedProjectId, terminalShells, preferredShellId, terminalQuickLaunchDefaults, runnableGlobalTerminalPresets, onItemSelected, onFocusWorkspace, onLaunchWorkspaceTerminal, onOpenCreateTerminal, onOpenWorkspaceTerminalPresets, children }: TerminalLaunchMenuProps) {
  const runnableWorkspaceTerminalPresets = (workspace.project.workspaceTerminalPresets ?? []).filter((preset) =>
    isRunnableTerminalPreset(preset)
  );

  const hasRunnablePresets = runnableWorkspaceTerminalPresets.length > 0 || runnableGlobalTerminalPresets.length > 0;

  const onSelectWithClose = (action: () => void) => {
    action();
    onItemSelected?.();
  };

  const launchPreset = (preset: TerminalPreset) => {
    const shell = resolveTerminalPresetShell(preset, terminalShells, preferredShellId);
    if (shell) {
      onLaunchWorkspaceTerminal(workspace.project.id, createTerminalPresetPayload(preset, shell));
    }
  };

  const renderPresetGroup = (label: string, presets: TerminalPreset[]) =>
    presets.length > 0 ? (
      <DropdownMenuGroup label={label}>
        {presets.map((preset) => (
          <DropdownMenuItem key={preset.id} onSelect={() => onSelectWithClose(() => launchPreset(preset))}>
            <TerminalSquare className="size-4" />
            <span className="truncate">{preset.name}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuGroup>
    ) : null;

  return (
    <DropdownMenuGroup label="Terminal">
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
        New terminal (defaults)
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
        New terminal…
      </DropdownMenuItem>
      {children}
      {/* Presets pop out so a long preset list doesn't stretch the menu; configuring them lives there too. */}
      <DropdownMenuSub label="Terminal presets" icon={<Layers className="size-4" />}>
        {renderPresetGroup("Workspace presets", runnableWorkspaceTerminalPresets)}
        {renderPresetGroup("Global presets", runnableGlobalTerminalPresets)}
        <div className={hasRunnablePresets ? "mt-1 border-t border-border/60 pt-1" : undefined}>
          <DropdownMenuItem onSelect={() => onSelectWithClose(() => onOpenWorkspaceTerminalPresets(workspace.project.id))}>
            <Wrench className="size-4" />
            Presets &amp; setup scripts…
          </DropdownMenuItem>
        </div>
      </DropdownMenuSub>
    </DropdownMenuGroup>
  );
}
