import { useWorkspaceSidebarActions } from "@/components/app/context/workspaceSidebarContext";
import { useCanonicalAppSnapshot } from "@/components/app/hooks/useAppDomainState";
import { resolvePreferredTerminalShellId } from "@/components/app/logic/terminalShellPreferences";
import { createSetupScriptTerminalDefaults } from "@/components/app/logic/workspaceSetupScripts";
import type { WorkspaceSetupScriptMenuItemsProps } from "@/components/app/types/workspaceSetupScripts.types";
import { DropdownMenuGroup, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Wrench } from "lucide-react";

/** Runs a workspace setup script by hand: opens the new-terminal dialog prefilled with its command. */
export function WorkspaceSetupScriptMenuItems({ workspace, onItemSelected }: WorkspaceSetupScriptMenuItemsProps) {
  const snapshot = useCanonicalAppSnapshot();
  const actions = useWorkspaceSidebarActions();
  const shellId = resolvePreferredTerminalShellId(snapshot?.terminalShells ?? []);
  const scripts = workspace.project.workspaceSetupScripts ?? [];
  if (!scripts.length) return null;
  return (
    <DropdownMenuGroup label="Setup scripts">
      {scripts.map((script) => (
        <DropdownMenuItem key={script.id} disabled={!shellId} onSelect={() => {
          if (!shellId) return;
          actions.onLaunchWorkspaceScript(workspace.project.id, createSetupScriptTerminalDefaults(script, shellId));
          onItemSelected?.();
        }}>
          <Wrench className="size-4" />
          <span className="truncate">{script.name}</span>
        </DropdownMenuItem>
      ))}
    </DropdownMenuGroup>
  );
}
