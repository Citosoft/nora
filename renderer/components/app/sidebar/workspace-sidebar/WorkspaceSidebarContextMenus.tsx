import { useCanonicalAppSnapshot } from "@/components/app/hooks/useAppDomainState";
import { resolveTaskCompletionTogglePath } from "@/components/app/logic/appUtils";
import { WorkspaceWorkspaceActionsMenuItems } from "@/components/app/sidebar/workspace-sidebar/WorkspaceWorkspaceActionsMenuItems";
import type { WorkspaceSidebarContextMenusProps } from "@/components/app/types/workspaceSidebarContextMenus.types";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "@/components/ui/context-menu";
import { ExternalLink, FileText, FolderKanban, Pencil, RefreshCcw, TerminalSquare, Trash2 } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";

type MenuPosition = { top: number; left: number };

function FixedPointContextMenu({
  position,
  onClose,
  widthClassName,
  children
}: {
  position: MenuPosition;
  onClose: () => void;
  widthClassName: string;
  children: ReactNode;
}) {
  const triggerRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const trigger = triggerRef.current;
    if (!trigger) {
      return;
    }
    trigger.dispatchEvent(
      new MouseEvent("contextmenu", {
        bubbles: true,
        cancelable: true,
        button: 2,
        clientX: position.left,
        clientY: position.top
      })
    );
  }, [position.left, position.top]);

  return (
    <ContextMenu onOpenChange={(open) => {
      if (!open) {
        onClose();
      }
    }}>
      <ContextMenuTrigger asChild>
        <span
          ref={triggerRef}
          aria-hidden="true"
          className="fixed h-px w-px"
          style={{
            left: position.left,
            top: position.top
          }}
        />
      </ContextMenuTrigger>
      <ContextMenuContent className={widthClassName}>{children}</ContextMenuContent>
    </ContextMenu>
  );
}

export const WorkspaceSidebarContextMenus = (props: WorkspaceSidebarContextMenusProps) => {
  const snapshot = useCanonicalAppSnapshot();
  if (!snapshot) {
    return null;
  }

  const activeWorkspaceMenuWorkspace =
    props.activeWorkspaceMenu !== null
      ? (props.workspaceGroups.find((workspace) => workspace.project.id === props.activeWorkspaceMenu?.workspaceId) ?? null)
      : null;

  return (
    <>
      {props.activeTaskMenu ? (
        <FixedPointContextMenu
          position={props.activeTaskMenu}
          onClose={() => props.setActiveTaskMenu(null)}
          widthClassName="w-56"
        >
          <ContextMenuItem
            onSelect={() => {
              const taskMenu = props.activeTaskMenu;
              if (!taskMenu) {
                return;
              }
              const nextPath = resolveTaskCompletionTogglePath(taskMenu.task.path, taskMenu.task.completed);
              props.setActiveTaskMenu(null);
              void props.onToggleTaskComplete(taskMenu.task.projectId, taskMenu.task.path, nextPath);
            }}
          >
            <FileText className="size-4" />
            {props.activeTaskMenu.task.completed ? "Mark incomplete" : "Mark completed"}
          </ContextMenuItem>
          <ContextMenuItem
            destructive
            onSelect={() => {
              const taskMenu = props.activeTaskMenu;
              if (!taskMenu) {
                return;
              }
              props.setActiveTaskMenu(null);
              void props.onDeleteTask(taskMenu.task.projectId, taskMenu.task.path);
            }}
          >
            <Trash2 className="size-4" />
            Delete task
          </ContextMenuItem>
        </FixedPointContextMenu>
      ) : null}

      {props.activeSpecMenu ? (
        <FixedPointContextMenu
          position={props.activeSpecMenu}
          onClose={() => props.setActiveSpecMenu(null)}
          widthClassName="w-56"
        >
          <ContextMenuItem
            onSelect={() => {
              const specMenu = props.activeSpecMenu;
              if (!specMenu) {
                return;
              }
              const { projectId, path } = specMenu.spec;
              props.setActiveSpecMenu(null);
              props.onGenerateTasksFromSpec(projectId, path);
            }}
          >
            <FolderKanban className="size-4" />
            Generate tasks
          </ContextMenuItem>
          <ContextMenuItem
            destructive
            onSelect={() => {
              const specMenu = props.activeSpecMenu;
              if (!specMenu) {
                return;
              }
              const { projectId, path } = specMenu.spec;
              props.setActiveSpecMenu(null);
              void props.onDeleteSpec(projectId, path);
            }}
          >
            <Trash2 className="size-4" />
            Delete spec
          </ContextMenuItem>
        </FixedPointContextMenu>
      ) : null}

      {props.activeNoteMenu ? (
        <FixedPointContextMenu
          position={props.activeNoteMenu}
          onClose={() => props.setActiveNoteMenu(null)}
          widthClassName="w-56"
        >
          <ContextMenuItem
            destructive
            onSelect={() => {
              const noteMenu = props.activeNoteMenu;
              if (!noteMenu) {
                return;
              }
              const { projectId, path } = noteMenu.note;
              props.setActiveNoteMenu(null);
              void props.onDeleteNote(projectId, path);
            }}
          >
            <Trash2 className="size-4" />
            Delete note
          </ContextMenuItem>
        </FixedPointContextMenu>
      ) : null}

      {props.activeWorkspaceMenu && activeWorkspaceMenuWorkspace ? (
        <FixedPointContextMenu
          position={props.activeWorkspaceMenu}
          onClose={() => props.setActiveWorkspaceMenu(null)}
          widthClassName="w-64"
        >
          <WorkspaceWorkspaceActionsMenuItems
            workspace={activeWorkspaceMenuWorkspace}
            focusedProjectId={props.focusedProjectId}
            terminalShells={props.terminalShells}
            preferredShellId={props.preferredShellId}
            terminalQuickLaunchDefaults={props.terminalQuickLaunchDefaults}
            runnableGlobalTerminalPresets={props.runnableGlobalTerminalPresets}
            onItemSelected={() => props.setActiveWorkspaceMenu(null)}
            onOpenCreateAgent={props.onOpenCreateAgent}
            onFocusWorkspace={props.onFocusWorkspace}
            onOpenWorkspaceBrowser={props.onOpenWorkspaceBrowser}
            onLaunchWorkspaceTerminal={props.onLaunchWorkspaceTerminal}
            onOpenCreateTerminal={props.onOpenCreateTerminal}
            onOpenWorkspaceTerminalPresets={props.onOpenWorkspaceTerminalPresets}
            onCreateTask={props.onCreateTask}
            onCreateSpec={props.onCreateSpec}
            onRemoveProject={props.onRemoveProject}
          />
        </FixedPointContextMenu>
      ) : null}

      {props.activeAgentMenu ? (
        <FixedPointContextMenu
          position={props.activeAgentMenu}
          onClose={() => props.setActiveAgentMenu(null)}
          widthClassName="w-56"
        >
          <ContextMenuItem
            onSelect={() => {
              const agentMenu = props.activeAgentMenu;
              if (!agentMenu) {
                return;
              }
              props.setActiveAgentMenu(null);
              if (agentMenu.workspaceId === snapshot.project?.id) {
                props.onFocusAgent(agentMenu.agentId);
              } else {
                void props.onFocusWorkspaceAgent(agentMenu.workspaceId, agentMenu.agentId);
              }
            }}
          >
            <TerminalSquare className="size-4" />
            Open agent
          </ContextMenuItem>
          {props.activeAgentMenu.prWebUrl ? (
            <ContextMenuItem
              onSelect={() => {
                const agentMenu = props.activeAgentMenu;
                if (!agentMenu || !agentMenu.prWebUrl) {
                  return;
                }
                props.setActiveAgentMenu(null);
                void props.onOpenWorkspaceBrowser(agentMenu.workspaceId, agentMenu.prWebUrl);
              }}
            >
              <ExternalLink className="size-4" />
              Open pull request
            </ContextMenuItem>
          ) : null}
          {props.activeAgentMenu.showRestart ? (
            <ContextMenuItem
              onSelect={() => {
                const agentMenu = props.activeAgentMenu;
                if (!agentMenu) {
                  return;
                }
                props.setActiveAgentMenu(null);
                void props.onRestartAgent(agentMenu.agentId);
              }}
            >
              <RefreshCcw className="size-4" />
              Restart session
            </ContextMenuItem>
          ) : null}
          <ContextMenuItem
            destructive
            onSelect={() => {
              const agentMenu = props.activeAgentMenu;
              if (!agentMenu) {
                return;
              }
              props.setActiveAgentMenu(null);
              props.onDestroyAgentRequest(agentMenu.agentId);
            }}
          >
            <Trash2 className="size-4" />
            Destroy session
          </ContextMenuItem>
        </FixedPointContextMenu>
      ) : null}

      {props.activeTerminalMenu ? (
        <FixedPointContextMenu
          position={props.activeTerminalMenu}
          onClose={() => props.setActiveTerminalMenu(null)}
          widthClassName="w-56"
        >
          <ContextMenuItem
            onSelect={() => {
              const terminalMenu = props.activeTerminalMenu;
              if (!terminalMenu) {
                return;
              }
              props.setActiveTerminalMenu(null);
              props.onBeginTerminalRename(terminalMenu.terminalId, terminalMenu.terminalName);
            }}
          >
            <Pencil className="size-4" />
            Rename terminal
          </ContextMenuItem>
          <ContextMenuItem
            destructive
            onSelect={() => {
              const terminalMenu = props.activeTerminalMenu;
              if (!terminalMenu) {
                return;
              }
              props.setActiveTerminalMenu(null);
              void props.onDestroyTerminal(terminalMenu.terminalId);
            }}
          >
            <Trash2 className="size-4" />
            Close terminal
          </ContextMenuItem>
        </FixedPointContextMenu>
      ) : null}
    </>
  );
};
