import { useState } from "react";
import { Ellipsis, FolderX, Trash2, X } from "lucide-react";
import { isGitProject } from "@shared/projectVersionControl";
import { useWorkspaceSidebarActions, useWorkspaceSidebarRuntime } from "@/components/app/context/workspaceSidebarContext";
import { useCanonicalAppSnapshot } from "@/components/app/hooks/useAppDomainState";
import { useWorkspaceNavigation } from "@/components/app/hooks/useWorkspaceNavigation";
import { isRunnableTerminalPreset } from "@/components/app/logic/terminalPresets";
import { resolvePreferredTerminalShellId } from "@/components/app/logic/terminalShellPreferences";
import { CreateWorktreeDialog } from "@/components/app/panels/workspace-tools/worktrees/CreateWorktreeDialog";
import { WorkspaceWorkspaceActionsMenuItems } from "@/components/app/sidebar/workspace-sidebar/WorkspaceWorkspaceActionsMenuItems";
import type { WorkspaceActionsDialog, WorkspaceToolProps } from "@/components/app/types/workspaceNavigation.types";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuGroup, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { RemoveWorkspaceDialog } from "./RemoveWorkspaceDialog";
import { WorkspaceManageMenuItems } from "./WorkspaceManageMenuItems";

export function WorkspaceActions({ workspace }: WorkspaceToolProps) {
  const snapshot = useCanonicalAppSnapshot();
  const actions = useWorkspaceSidebarActions();
  const { terminalPresets, terminalQuickLaunchDefaults } = useWorkspaceSidebarRuntime();
  const { closeTool } = useWorkspaceNavigation();
  const [dialog, setDialog] = useState<WorkspaceActionsDialog>(null);
  const closeDialog = () => setDialog(null);
  return <>
    <DropdownMenu widthClassName="w-56" trigger={<Button variant="ghost" size="icon" className="size-8 shrink-0 text-muted-foreground" aria-label="Workspace actions"><Ellipsis className="size-4" aria-hidden="true" /></Button>}>
      <WorkspaceWorkspaceActionsMenuItems workspace={workspace} focusedProjectId={snapshot?.project?.id ?? null} terminalShells={snapshot?.terminalShells ?? []}
        preferredShellId={resolvePreferredTerminalShellId(snapshot?.terminalShells ?? [])} terminalQuickLaunchDefaults={terminalQuickLaunchDefaults}
        runnableGlobalTerminalPresets={terminalPresets.filter(isRunnableTerminalPreset)} onItemSelected={closeTool}
        onOpenCreateAgent={actions.onOpenCreateAgent} onFocusWorkspace={actions.onFocusWorkspace} onOpenWorkspaceBrowser={actions.onOpenWorkspaceBrowser}
        onLaunchWorkspaceTerminal={actions.onLaunchWorkspaceTerminal} onOpenCreateTerminal={actions.onOpenCreateTerminal} onOpenWorkspaceTerminalPresets={actions.onOpenWorkspaceTerminalPresets}
        onCreateTask={actions.onCreateTask} onCreateSpec={actions.onCreateSpec} onCreateNote={actions.onCreateNote}
        onCreateWorktree={isGitProject(workspace.project) ? () => setDialog("new-worktree") : undefined} />
      <WorkspaceManageMenuItems workspace={workspace} onItemSelected={closeTool} />
      <DropdownMenuGroup label="Close and remove">
        <DropdownMenuItem onSelect={() => { closeTool(); actions.onCloseProject(); }}><X className="size-4" />Close workspace</DropdownMenuItem>
        <DropdownMenuItem destructive onSelect={() => setDialog("remove-workspace")}><FolderX className="size-4" />Remove workspace…</DropdownMenuItem>
        <DropdownMenuItem destructive onSelect={actions.onResetWorkspaces}><Trash2 className="size-4" />Reset all workspaces…</DropdownMenuItem>
      </DropdownMenuGroup>
    </DropdownMenu>
    {dialog === "new-worktree" && <CreateWorktreeDialog project={workspace.project} onClose={closeDialog} />}
    {dialog === "remove-workspace" && <RemoveWorkspaceDialog workspace={workspace} onClose={closeDialog}
      onConfirm={() => { closeTool(); actions.onRemoveProject(workspace.project.rootPath); }} />}
  </>;
}
