import { resolveTaskCompletionTogglePath } from "@/components/app/logic/appUtils";
import { WorkspaceWorkspaceActionsMenuItems } from "@/components/app/sidebar/workspace-sidebar/WorkspaceWorkspaceActionsMenuItems";
import type { WorkspaceSidebarContextMenusProps } from "@/components/app/types/workspaceSidebarContextMenus.types";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { ExternalLink, FileText, FolderKanban, Pencil, RefreshCcw, TerminalSquare, Trash2 } from "lucide-react";
import { useCanonicalAppSnapshot } from "@/components/app/hooks/useAppDomainState";

export const WorkspaceSidebarContextMenus = ({
  workspaceGroups,
  focusedProjectId,
  terminalShells,
  preferredShellId,
  terminalQuickLaunchDefaults,
  runnableGlobalTerminalPresets,
  activeTaskMenu,
  activeSpecMenu,
  activeNoteMenu,
  activeWorkspaceMenu,
  activeAgentMenu,
  activeTerminalMenu,
  taskMenuRef,
  specMenuRef,
  noteMenuRef,
  workspaceMenuRef,
  agentMenuRef,
  terminalMenuRef,
  setActiveTaskMenu,
  setActiveSpecMenu,
  setActiveNoteMenu,
  setActiveWorkspaceMenu,
  setActiveAgentMenu,
  setActiveTerminalMenu,
  onToggleTaskComplete,
  onDeleteTask,
  onGenerateTasksFromSpec,
  onDeleteSpec,
  onDeleteNote,
  onOpenCreateAgent,
  onFocusWorkspace,
  onOpenWorkspaceBrowser,
  onLaunchWorkspaceTerminal,
  onOpenCreateTerminal,
  onOpenWorkspaceTerminalPresets,
  onCreateTask,
  onCreateSpec,
  onRemoveProject,
  onFocusAgent,
  onFocusWorkspaceAgent,
  onRestartAgent,
  onDestroyAgentRequest,
  onRenameTerminal,
  onDestroyTerminal
}: WorkspaceSidebarContextMenusProps) => {
  const snapshot = useCanonicalAppSnapshot();
  if (!snapshot) {
    return null;
  }

  const activeWorkspaceMenuWorkspace =
    activeWorkspaceMenu !== null
      ? (workspaceGroups.find((workspace) => workspace.project.id === activeWorkspaceMenu.workspaceId) ?? null)
      : null;

  return (
    <>
      {activeTaskMenu ? (
        <div
          ref={taskMenuRef}
          className="fixed z-20 w-56 rounded-[4px] border border-border/70 bg-popover/95 p-1 shadow-2xl backdrop-blur"
          style={{ top: activeTaskMenu.top, left: activeTaskMenu.left }}
        >
          <DropdownMenuItem
            onSelect={() => {
              const nextPath = resolveTaskCompletionTogglePath(activeTaskMenu.task.path, activeTaskMenu.task.completed);
              setActiveTaskMenu(null);
              void onToggleTaskComplete(activeTaskMenu.task.projectId, activeTaskMenu.task.path, nextPath);
            }}
          >
            <FileText className="size-4" />
            {activeTaskMenu.task.completed ? "Mark incomplete" : "Mark completed"}
          </DropdownMenuItem>
          <DropdownMenuItem
            destructive
            onSelect={() => {
              setActiveTaskMenu(null);
              void onDeleteTask(activeTaskMenu.task.projectId, activeTaskMenu.task.path);
            }}
          >
            <Trash2 className="size-4" />
            Delete task
          </DropdownMenuItem>
        </div>
      ) : null}
      {activeSpecMenu ? (
        <div
          ref={specMenuRef}
          className="fixed z-20 w-56 rounded-[4px] border border-border/70 bg-popover/95 p-1 shadow-2xl backdrop-blur"
          style={{ top: activeSpecMenu.top, left: activeSpecMenu.left }}
        >
          <DropdownMenuItem
            onSelect={() => {
              const { projectId, path } = activeSpecMenu.spec;
              setActiveSpecMenu(null);
              onGenerateTasksFromSpec(projectId, path);
            }}
          >
            <FolderKanban className="size-4" />
            Generate tasks
          </DropdownMenuItem>
          <DropdownMenuItem
            destructive
            onSelect={() => {
              const { projectId, path } = activeSpecMenu.spec;
              setActiveSpecMenu(null);
              void onDeleteSpec(projectId, path);
            }}
          >
            <Trash2 className="size-4" />
            Delete spec
          </DropdownMenuItem>
        </div>
      ) : null}
      {activeNoteMenu ? (
        <div
          ref={noteMenuRef}
          className="fixed z-20 w-56 rounded-[4px] border border-border/70 bg-popover/95 p-1 shadow-2xl backdrop-blur"
          style={{ top: activeNoteMenu.top, left: activeNoteMenu.left }}
        >
          <DropdownMenuItem
            destructive
            onSelect={() => {
              const { projectId, path } = activeNoteMenu.note;
              setActiveNoteMenu(null);
              void onDeleteNote(projectId, path);
            }}
          >
            <Trash2 className="size-4" />
            Delete note
          </DropdownMenuItem>
        </div>
      ) : null}
      {activeWorkspaceMenu && activeWorkspaceMenuWorkspace ? (
        <div
          ref={workspaceMenuRef}
          className="fixed z-20 w-64 rounded-[4px] border border-border/70 bg-popover/95 p-1 shadow-2xl backdrop-blur"
          style={{ top: activeWorkspaceMenu.top, left: activeWorkspaceMenu.left }}
        >
          <WorkspaceWorkspaceActionsMenuItems
            workspace={activeWorkspaceMenuWorkspace}
            focusedProjectId={focusedProjectId}
            terminalShells={terminalShells}
            preferredShellId={preferredShellId}
            terminalQuickLaunchDefaults={terminalQuickLaunchDefaults}
            runnableGlobalTerminalPresets={runnableGlobalTerminalPresets}
            onItemSelected={() => setActiveWorkspaceMenu(null)}
            onOpenCreateAgent={onOpenCreateAgent}
            onFocusWorkspace={onFocusWorkspace}
            onOpenWorkspaceBrowser={onOpenWorkspaceBrowser}
            onLaunchWorkspaceTerminal={onLaunchWorkspaceTerminal}
            onOpenCreateTerminal={onOpenCreateTerminal}
            onOpenWorkspaceTerminalPresets={onOpenWorkspaceTerminalPresets}
            onCreateTask={onCreateTask}
            onCreateSpec={onCreateSpec}
            onRemoveProject={onRemoveProject}
          />
        </div>
      ) : null}
      {activeAgentMenu ? (
        <div
          ref={agentMenuRef}
          className="fixed z-20 w-56 rounded-[4px] border border-border/70 bg-popover/95 p-1 shadow-2xl backdrop-blur"
          style={{ top: activeAgentMenu.top, left: activeAgentMenu.left }}
        >
          <DropdownMenuItem
            onSelect={() => {
              setActiveAgentMenu(null);
              if (activeAgentMenu.workspaceId === snapshot.project?.id) {
                onFocusAgent(activeAgentMenu.agentId);
              } else {
                void onFocusWorkspaceAgent(activeAgentMenu.workspaceId, activeAgentMenu.agentId);
              }
            }}
          >
            <TerminalSquare className="size-4" />
            Open agent
          </DropdownMenuItem>
          {activeAgentMenu.prWebUrl ? (
            <DropdownMenuItem
              onSelect={() => {
                const { workspaceId, prWebUrl } = activeAgentMenu;
                setActiveAgentMenu(null);
                if (prWebUrl) {
                  void onOpenWorkspaceBrowser(workspaceId, prWebUrl);
                }
              }}
            >
              <ExternalLink className="size-4" />
              Open pull request
            </DropdownMenuItem>
          ) : null}
          {activeAgentMenu.showRestart ? (
            <DropdownMenuItem
              onSelect={() => {
                const { agentId } = activeAgentMenu;
                setActiveAgentMenu(null);
                void onRestartAgent(agentId);
              }}
            >
              <RefreshCcw className="size-4" />
              Restart session
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuItem
            destructive
            onSelect={() => {
              const { agentId } = activeAgentMenu;
              setActiveAgentMenu(null);
              onDestroyAgentRequest(agentId);
            }}
          >
            <Trash2 className="size-4" />
            Destroy session
          </DropdownMenuItem>
        </div>
      ) : null}
      {activeTerminalMenu ? (
        <div
          ref={terminalMenuRef}
          className="fixed z-20 w-56 rounded-[4px] border border-border/70 bg-popover/95 p-1 shadow-2xl backdrop-blur"
          style={{ top: activeTerminalMenu.top, left: activeTerminalMenu.left }}
        >
          <DropdownMenuItem
            onSelect={() => {
              const nextName = window.prompt("Rename terminal", activeTerminalMenu.terminalName);
              setActiveTerminalMenu(null);
              if (nextName === null || nextName.trim() === activeTerminalMenu.terminalName.trim()) {
                return;
              }
              void onRenameTerminal(activeTerminalMenu.terminalId, nextName);
            }}
          >
            <Pencil className="size-4" />
            Rename terminal
          </DropdownMenuItem>
          <DropdownMenuItem
            destructive
            onSelect={() => {
              const { terminalId } = activeTerminalMenu;
              setActiveTerminalMenu(null);
              void onDestroyTerminal(terminalId);
            }}
          >
            <Trash2 className="size-4" />
            Close terminal
          </DropdownMenuItem>
        </div>
      ) : null}
    </>
  );
};
