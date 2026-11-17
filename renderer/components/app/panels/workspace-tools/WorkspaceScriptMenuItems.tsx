import { Play } from "lucide-react";
import { useWorkspaceSidebarActions } from "@/components/app/context/workspaceSidebarContext";
import { useCanonicalAppSnapshot } from "@/components/app/hooks/useAppDomainState";
import { resolvePreferredTerminalShellId } from "@/components/app/logic/terminalShellPreferences";
import { createScriptTerminalDefaults, formatWorkspaceScriptActionLabel } from "@/components/app/logic/workspaceScripts";
import type { WorkspaceScriptMenuItemsProps } from "@/components/app/types/workspaceNavigation.types";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";

/** One menu item per workspace script; each opens a terminal running it in the preferred shell. */
export function WorkspaceScriptMenuItems({ workspace, scripts, onItemSelected }: WorkspaceScriptMenuItemsProps) {
  const snapshot = useCanonicalAppSnapshot();
  const actions = useWorkspaceSidebarActions();
  const shellId = resolvePreferredTerminalShellId(snapshot?.terminalShells ?? []);
  return <>
    {scripts.map((script) => <DropdownMenuItem key={script.id} disabled={!shellId} onSelect={() => {
      if (!shellId) return;
      actions.onLaunchWorkspaceScript(workspace.project.id, createScriptTerminalDefaults(script, shellId));
      onItemSelected?.();
    }}><Play className="size-4" /><span className="truncate">{formatWorkspaceScriptActionLabel(script)}</span></DropdownMenuItem>)}
  </>;
}
