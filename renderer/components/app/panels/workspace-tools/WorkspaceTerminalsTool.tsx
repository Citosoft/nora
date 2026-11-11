import { useEffect, useRef } from "react";
import { TerminalSquare } from "lucide-react";
import { ManualTerminal } from "@/components/app/panels/ManualTerminal";
import { useWorkspaceSidebarActions, useWorkspaceSidebarRuntime } from "@/components/app/context/workspaceSidebarContext";
import { useCanonicalAppSnapshot } from "@/components/app/hooks/useAppDomainState";
import { useWorkspaceView } from "@/components/app/hooks/useWorkspaceView";
import { isRunnableTerminalPreset } from "@/components/app/logic/terminalPresets";
import { resolvePreferredTerminalShellId } from "@/components/app/logic/terminalShellPreferences";
import { SessionTabPane, SessionTabStack } from "@/components/app/panels/SessionTabStack";
import { TerminalLaunchMenuItems } from "./TerminalLaunchMenuItems";
import { WorkspaceTerminalTab } from "./WorkspaceTerminalTab";
import { WorkspaceScriptsMenu } from "./WorkspaceScriptsMenu";
import { WorkspacePortsMenu } from "./WorkspacePortsMenu";
import type { WorkspaceToolProps } from "@/components/app/types/workspaceNavigation.types";
import { Button } from "@/components/ui/button";
import { DropdownMenu } from "@/components/ui/dropdown-menu";
import { Tabs, TabsList } from "@/components/ui/tabs";

export function WorkspaceTerminalsTool({ workspace }: WorkspaceToolProps) {
  const projectId = workspace.project.id;
  const { view, updateView } = useWorkspaceView(projectId);
  const knownIds = useRef(new Set(workspace.terminals.map((terminal) => terminal.id)));
  const selected = workspace.terminals.find((terminal) => terminal.id === view.terminalId) ?? workspace.terminals.at(-1);
  const snapshot = useCanonicalAppSnapshot();
  const actions = useWorkspaceSidebarActions();
  const { terminalPresets, terminalQuickLaunchDefaults } = useWorkspaceSidebarRuntime();
  useEffect(() => {
    const added = workspace.terminals.filter((terminal) => !knownIds.current.has(terminal.id));
    knownIds.current = new Set(workspace.terminals.map((terminal) => terminal.id));
    const next = added.at(-1) ?? selected;
    if (next && next.id !== view.terminalId) updateView({ terminalId: next.id });
  }, [workspace.terminals, selected?.id, view.terminalId, updateView]);
  const select = (terminalId: string) => updateView({ terminalId });
  return <Tabs value={selected?.id ?? ""} onValueChange={select} className="flex h-full min-h-0 flex-col gap-0">
    <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border/60 px-3 py-1.5">
      <TabsList aria-label="Workspace terminals" className="min-w-0 flex-1 justify-start gap-1 overflow-x-auto border-0 bg-transparent p-0">
        {workspace.terminals.map((terminal) => <WorkspaceTerminalTab key={terminal.id} terminal={terminal} selected={selected?.id === terminal.id} />)}
      </TabsList>
      <WorkspaceScriptsMenu workspace={workspace} />
      <WorkspacePortsMenu projectId={projectId} terminalId={selected?.id} />
      <DropdownMenu trigger={<Button variant="outline" size="sm" className="h-8 text-xs">New terminal</Button>}>
        <TerminalLaunchMenuItems workspace={workspace} focusedProjectId={snapshot?.project?.id ?? null} terminalShells={snapshot?.terminalShells ?? []}
          preferredShellId={resolvePreferredTerminalShellId(snapshot?.terminalShells ?? [])} terminalQuickLaunchDefaults={terminalQuickLaunchDefaults}
          runnableGlobalTerminalPresets={terminalPresets.filter(isRunnableTerminalPreset)} onFocusWorkspace={actions.onFocusWorkspace}
          onLaunchWorkspaceTerminal={actions.onLaunchWorkspaceTerminal} onOpenCreateTerminal={actions.onOpenCreateTerminal} onOpenWorkspaceTerminalPresets={actions.onOpenWorkspaceTerminalPresets} />
      </DropdownMenu>
    </div>
    <SessionTabStack>{workspace.terminals.map((terminal) => <SessionTabPane key={terminal.id} visible={selected?.id === terminal.id}><ManualTerminal terminal={terminal} /></SessionTabPane>)}
      {!selected && <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center"><TerminalSquare className="size-8 text-muted-foreground" aria-hidden="true" /><h3 className="text-sm font-medium">Terminal for {workspace.project.name}</h3><p className="max-w-sm text-xs text-muted-foreground">Use New terminal to open a shell in this workspace, or run a script. Sessions keep running while you work elsewhere.</p></div>}
    </SessionTabStack>
  </Tabs>;
}
