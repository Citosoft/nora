import { useWorkspaceSidebarActions } from "@/components/app/context/workspaceSidebarContext";
import { useCanonicalAppSnapshot } from "@/components/app/hooks/useAppDomainState";
import { resolvePreferredTerminalShellId } from "@/components/app/logic/terminalShellPreferences";
import { createScriptTerminalDefaults, formatWorkspaceScriptActionLabel, getPreferredWorkspaceScripts } from "@/components/app/logic/workspaceScripts";
import type { WorkspaceToolProps } from "@/components/app/types/workspaceNavigation.types";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuItem } from "@/components/ui/dropdown-menu";

export function WorkspaceScriptsMenu({ workspace }: WorkspaceToolProps) {
  const snapshot = useCanonicalAppSnapshot();
  const actions = useWorkspaceSidebarActions();
  const shellId = resolvePreferredTerminalShellId(snapshot?.terminalShells ?? []);
  const scripts = getPreferredWorkspaceScripts(workspace);
  if (!scripts.length) return null;
  return <DropdownMenu trigger={<Button variant="outline" size="sm">Scripts</Button>}>
    {scripts.map((script) => <DropdownMenuItem key={script.id} disabled={!shellId} onSelect={() => { if (shellId) actions.onLaunchWorkspaceScript(workspace.project.id, createScriptTerminalDefaults(script, shellId)); }}>{formatWorkspaceScriptActionLabel(script)}</DropdownMenuItem>)}
  </DropdownMenu>;
}
