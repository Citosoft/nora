import { Ellipsis, Plus, RefreshCcw, StickyNote, Trash2, X } from "lucide-react";
import { useWorkspaceSidebarActions, useWorkspaceSidebarRuntime } from "@/components/app/context/workspaceSidebarContext";
import { useCanonicalAppSnapshot } from "@/components/app/hooks/useAppDomainState";
import { useWorkspaceNavigation } from "@/components/app/hooks/useWorkspaceNavigation";
import { isRunnableTerminalPreset } from "@/components/app/logic/terminalPresets";
import { resolvePreferredTerminalShellId } from "@/components/app/logic/terminalShellPreferences";
import { WorkspaceWorkspaceActionsMenuItems } from "@/components/app/sidebar/workspace-sidebar/WorkspaceWorkspaceActionsMenuItems";
import type { WorkspaceToolProps } from "@/components/app/types/workspaceNavigation.types";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuItem } from "@/components/ui/dropdown-menu";

export function WorkspaceActions({ workspace }: WorkspaceToolProps) {
  const snapshot = useCanonicalAppSnapshot();
  const actions = useWorkspaceSidebarActions();
  const { terminalPresets, terminalQuickLaunchDefaults } = useWorkspaceSidebarRuntime();
  const { closeTool } = useWorkspaceNavigation();
  return <DropdownMenu trigger={<Button variant="ghost" size="icon" className="size-8 shrink-0 text-muted-foreground" aria-label="Workspace actions"><Ellipsis className="size-4" aria-hidden="true" /></Button>}>
    <WorkspaceWorkspaceActionsMenuItems workspace={workspace} focusedProjectId={snapshot?.project?.id ?? null} terminalShells={snapshot?.terminalShells ?? []}
      preferredShellId={resolvePreferredTerminalShellId(snapshot?.terminalShells ?? [])} terminalQuickLaunchDefaults={terminalQuickLaunchDefaults}
      runnableGlobalTerminalPresets={terminalPresets.filter(isRunnableTerminalPreset)} onItemSelected={closeTool}
      onOpenCreateAgent={actions.onOpenCreateAgent} onFocusWorkspace={actions.onFocusWorkspace} onOpenWorkspaceBrowser={actions.onOpenWorkspaceBrowser}
      onLaunchWorkspaceTerminal={actions.onLaunchWorkspaceTerminal} onOpenCreateTerminal={actions.onOpenCreateTerminal} onOpenWorkspaceTerminalPresets={actions.onOpenWorkspaceTerminalPresets}
      onCreateTask={actions.onCreateTask} onCreateSpec={actions.onCreateSpec} onRemoveProject={actions.onRemoveProject} />
    <DropdownMenuItem onSelect={() => { closeTool(); actions.onCreateNote(workspace.project.id); }}><StickyNote className="size-4" />New note</DropdownMenuItem>
    <DropdownMenuItem onSelect={actions.onChooseProject}><Plus className="size-4" />Add workspace</DropdownMenuItem>
    <DropdownMenuItem onSelect={actions.onRefresh}><RefreshCcw className="size-4" />Refresh workspace</DropdownMenuItem>
    <DropdownMenuItem onSelect={() => { closeTool(); actions.onCloseProject(); }}><X className="size-4" />Close workspace</DropdownMenuItem>
    <DropdownMenuItem destructive onSelect={actions.onResetWorkspaces}><Trash2 className="size-4" />Reset workspaces…</DropdownMenuItem>
  </DropdownMenu>;
}
