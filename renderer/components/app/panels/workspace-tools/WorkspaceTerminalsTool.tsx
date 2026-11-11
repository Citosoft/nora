import { useState } from "react";
import { ManualTerminal } from "@/components/app/panels/ManualTerminal";
import { useWorkspaceSidebarActions, useWorkspaceSidebarRuntime } from "@/components/app/context/workspaceSidebarContext";
import { useCanonicalAppSnapshot } from "@/components/app/hooks/useAppDomainState";
import { isRunnableTerminalPreset } from "@/components/app/logic/terminalPresets";
import { resolvePreferredTerminalShellId } from "@/components/app/logic/terminalShellPreferences";
import { TerminalLaunchMenuItems } from "@/components/app/panels/workspace-tools/TerminalLaunchMenuItems";
import { WorkspaceTerminalRow } from "@/components/app/panels/workspace-tools/WorkspaceTerminalRow";
import { WorkspaceScriptsMenu } from "@/components/app/panels/workspace-tools/WorkspaceScriptsMenu";
import type { WorkspaceToolProps } from "@/components/app/types/workspaceNavigation.types";
import { Button } from "@/components/ui/button";
import { DropdownMenu } from "@/components/ui/dropdown-menu";

export function WorkspaceTerminalsTool({ workspace }: WorkspaceToolProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = workspace.terminals.find((entry) => entry.id === selectedId);
  const snapshot = useCanonicalAppSnapshot();
  const actions = useWorkspaceSidebarActions();
  const { terminalPresets, terminalQuickLaunchDefaults } = useWorkspaceSidebarRuntime();
  if (selected) return <div className="flex h-full min-h-0 flex-col"><div className="border-b border-border/60 px-5 py-2"><Button size="sm" variant="ghost" onClick={() => setSelectedId(null)}>All terminals</Button></div><ManualTerminal terminal={selected} /></div>;
  return <div className="h-full overflow-y-auto p-5">
    <div className="mb-4 flex justify-end gap-2"><WorkspaceScriptsMenu workspace={workspace} /><DropdownMenu trigger={<Button variant="outline" size="sm">New terminal</Button>}>
      <TerminalLaunchMenuItems workspace={workspace} focusedProjectId={snapshot?.project?.id ?? null} terminalShells={snapshot?.terminalShells ?? []}
        preferredShellId={resolvePreferredTerminalShellId(snapshot?.terminalShells ?? [])} terminalQuickLaunchDefaults={terminalQuickLaunchDefaults}
        runnableGlobalTerminalPresets={terminalPresets.filter(isRunnableTerminalPreset)} onFocusWorkspace={actions.onFocusWorkspace}
        onLaunchWorkspaceTerminal={actions.onLaunchWorkspaceTerminal} onOpenCreateTerminal={actions.onOpenCreateTerminal} onOpenWorkspaceTerminalPresets={actions.onOpenWorkspaceTerminalPresets} />
    </DropdownMenu></div>
    <div className="space-y-2">{workspace.terminals.map((terminal) => <WorkspaceTerminalRow key={terminal.id} terminal={terminal} onSelect={setSelectedId} />)}</div>
    {!workspace.terminals.length && <p className="text-sm text-muted-foreground">No terminals yet.</p>}
  </div>;
}
