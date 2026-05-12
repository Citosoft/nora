import { createQuickTerminalDialogDefaults, createQuickTerminalPayload } from "@/components/app/logic/terminalQuickLaunch";
import { setWorkspaceRelativePathDragData } from "@/components/app/logic/workspacePathDrag";
import { createScriptTerminalDefaults, formatWorkspaceScriptActionLabel, getPreferredWorkspaceScripts } from "@/components/app/logic/workspaceScripts";
import { setWorkspaceTaskDragData } from "@/components/app/logic/workspaceTaskDrag";
import { WorkspaceProjectIcon } from "@/components/app/shared/Tooling";
import { WorkspaceSidebarChildSectionLabel } from "@/components/app/sidebar/workspace-sidebar/WorkspaceSidebarChildSectionLabel";
import { WorkspaceSidebarWorkspaceSessionRow } from "@/components/app/sidebar/workspace-sidebar/WorkspaceSidebarWorkspaceSessionRow";
import { WorkspaceWorkspaceActionsMenuItems } from "@/components/app/sidebar/workspace-sidebar/WorkspaceWorkspaceActionsMenuItems";
import type { WorkspaceSidebarWorkspaceGroupProps } from "@/components/app/types/workspaceSidebarWorkspaceGroup.types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  Bot,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Ellipsis,
  FileText,
  FolderKanban,
  LoaderCircle,
  Plus,
  ScrollText,
  Sparkles,
  StickyNote,
  TerminalSquare
} from "lucide-react";
import { useCanonicalAppSnapshot } from "@/components/app/hooks/useAppDomainState";

export const WorkspaceSidebarWorkspaceGroup = ({
  workspace,
  removingWorkspaceRootSet,
  projectFaviconUrlByProjectId,
  collapsedWorkspaceIds,
  onCollapsedWorkspaceIdsChange,
  collapsedWorkspaceAgentSectionIds,
  collapsedWorkspaceTerminalSectionIds,
  collapsedWorkspaceAiChatSectionIds,
  collapsedWorkspaceNoteSectionIds,
  collapsedWorkspaceSpecSectionIds,
  collapsedWorkspaceTaskSectionIds,
  toggleWorkspaceAgentSection,
  toggleWorkspaceTerminalSection,
  toggleWorkspaceAiChatSection,
  toggleWorkspaceNoteSection,
  toggleWorkspaceSpecSection,
  toggleWorkspaceTaskSection,
  workspaceTasks,
  workspaceSpecs,
  workspaceNotes,
  aiChatTabs,
  focusedAiChatTabId,
  focusedBrowserTabId,
  focusedForgeViewerTabId,
  activeWorkspaceContentTab,
  isTaskBoardOpen,
  isSpecBrowserOpen,
  isNoteBrowserOpen,
  isCreatingTask,
  isCreatingSpec,
  isCreatingNote,
  pullRequestStatusByWorkspaceBranch,
  agentsNeedingAttention,
  now,
  focusedAgent,
  focusedTerminal,
  preferredShellId,
  terminalQuickLaunchDefaults,
  runnableGlobalTerminalPresets,
  activeSessionPopoverId,
  setActiveSessionPopoverId,
  openSessionPopover,
  scheduleSessionPopoverClose,
  openAgentSessionMenu,
  openTerminalSessionMenu,
  openTaskMenu,
  openSpecMenu,
  openNoteMenu,
  openWorkspaceMenu,
  onFocusWorkspace,
  onFocusWorkspaceView,
  onOpenCreateAgent,
  onOpenCreateTerminal,
  onLaunchWorkspaceTerminal,
  onLaunchWorkspaceScript,
  onOpenWorkspaceTerminalPresets,
  onOpenWorkspaceBrowser,
  onFocusAgent,
  onFocusTerminal,
  onFocusWorkspaceAgent,
  onFocusWorkspaceTerminal,
  editingTerminalSessionId,
  editingTerminalNameDraft,
  onEditingTerminalNameDraftChange,
  onSubmitTerminalRename,
  onCancelTerminalRename,
  onOpenTask,
  onCreateTask,
  onOpenTaskBoard,
  onOpenSpec,
  onCreateSpec,
  onOpenSpecBrowser,
  onOpenNote,
  onCreateNote,
  onOpenNoteBrowser,
  onFocusWorkspaceAiChatTab,
  onOpenAiChatFromSidebar,
  onRemoveProject
}: WorkspaceSidebarWorkspaceGroupProps) => {
  const snapshot = useCanonicalAppSnapshot();
  if (!snapshot) {
    return null;
  }

  const isRemoving = removingWorkspaceRootSet.has(workspace.project.rootPath);
  const isFocused = snapshot.project?.id === workspace.project.id;
  const renderSubitemStatusDot = (className?: string) => (
    <span
      className={cn("mt-1 inline-flex size-2.5 shrink-0 rounded-full border border-background/80 bg-muted-foreground/45", className)}
      aria-hidden="true"
    />
  );
    const directSshLocation = workspace.project.location?.kind === "ssh" ? workspace.project.location : null;
    const isDirectSshWorkspace = directSshLocation !== null;
    const directSshLabel = directSshLocation
      ? `${directSshLocation.user}@${directSshLocation.host}${directSshLocation.port ? `:${directSshLocation.port}` : ""}`
      : null;
    const isGroupCollapsed = collapsedWorkspaceIds[workspace.project.id] ?? false;
    const isAgentSectionCollapsed = collapsedWorkspaceAgentSectionIds[workspace.project.id] ?? true;
    const isTerminalSectionCollapsed = collapsedWorkspaceTerminalSectionIds[workspace.project.id] ?? true;
    const isTaskSectionCollapsed = collapsedWorkspaceTaskSectionIds[workspace.project.id] ?? true;
    const isSpecSectionCollapsed = collapsedWorkspaceSpecSectionIds[workspace.project.id] ?? true;
    const isNoteSectionCollapsed = collapsedWorkspaceNoteSectionIds[workspace.project.id] ?? true;
    const isAiChatSectionCollapsed = collapsedWorkspaceAiChatSectionIds[workspace.project.id] ?? true;
    const workspaceViewWorktreeId =
      workspace.sessions[0]?.focusedWorktreeId ||
      workspace.worktrees[0]?.id ||
      null;
    const sessionCount = workspace.agents.length + workspace.terminals.length;
    const sessionRowSharedProps = {
      workspaceId: workspace.project.id,
      focusedProjectId: snapshot.project?.id ?? null,
      now,
      pullRequestStatusByWorkspaceBranch,
      agentsNeedingAttention,
      focusedAgent,
      focusedTerminal,
      focusedAiChatTabId,
      focusedBrowserTabId,
      focusedForgeViewerTabId,
      activeWorkspaceContentTab,
      isTaskBoardOpen,
      isSpecBrowserOpen,
      isNoteBrowserOpen,
      activeSessionPopoverId,
      setActiveSessionPopoverId,
      openSessionPopover,
      scheduleSessionPopoverClose,
      openAgentSessionMenu,
      openTerminalSessionMenu,
      onFocusAgent,
      onFocusTerminal,
      onFocusWorkspaceAgent,
      onFocusWorkspaceTerminal,
      editingTerminalSessionId,
      editingTerminalNameDraft,
      onEditingTerminalNameDraftChange,
      onSubmitTerminalRename,
      onCancelTerminalRename
    };
    const workspaceTaskEntries = workspaceTasks.filter((task) => task.projectId === workspace.project.id);
    const workspaceSpecEntries = workspaceSpecs.filter((spec) => spec.projectId === workspace.project.id);
    const workspaceNoteEntries = workspaceNotes.filter((note) => note.projectId === workspace.project.id);
    const workspaceAiChatEntries = aiChatTabs.filter((tab) => tab.projectId === workspace.project.id);
    const scripts = getPreferredWorkspaceScripts(workspace);

    return (
      <div
        key={workspace.project.id}
        className={cn(
          "border-b border-border/60",
          "bg-background/30"
        )}
      >
        <div
          className={cn(
            "flex items-stretch border-l-2",
            isFocused ? "border-primary bg-primary/5" : "border-transparent"
          )}
          onContextMenu={(event) => {
            if (isRemoving) {
              return;
            }
            openWorkspaceMenu(workspace.project.id, event);
          }}
        >
          <button
            type="button"
            onClick={() =>
              isFocused && workspaceViewWorktreeId
                ? onFocusWorkspaceView(workspaceViewWorktreeId)
                : onFocusWorkspace(workspace.project.id)
            }
            className="min-w-0 flex-1 px-4 py-3 text-left transition hover:bg-accent/30"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <WorkspaceProjectIcon
                  framework={workspace.project.framework}
                  projectFaviconUrl={projectFaviconUrlByProjectId[workspace.project.id] ?? null}
                  label={workspace.project.name}
                  className="size-5 shrink-0"
                  imageClassName="size-3.5"
                />
                <Tooltip content={directSshLabel ? `${directSshLabel}\n${workspace.project.rootPath}` : workspace.project.rootPath}>
                  <div className="truncate text-sm font-medium">
                    {workspace.project.name}
                  </div>
                </Tooltip>
                {isRemoving ? (
                  <Badge variant="outline" className="shrink-0 text-[11px]">
                    Removing
                  </Badge>
                ) : null}
                {isDirectSshWorkspace ? (
                  <Badge variant="outline" className="shrink-0 text-[11px]">
                    Ssh
                  </Badge>
                ) : null}
              </div>
            </div>
          </button>
          <div className="flex items-center pr-2">
            <Badge variant="outline">{sessionCount}</Badge>
            {scripts.length && preferredShellId ? (
              <DropdownMenu
                align="end"
                widthClassName="w-56"
                trigger={(
                  <Button
                    variant="ghost"
                    size="icon"
                  className="size-8 shrink-0 rounded-none self-center"
                  aria-label={`Run scripts for ${workspace.project.name}`}
                  disabled={isRemoving}
                >
                    <TerminalSquare className="size-4" />
                  </Button>
                )}
              >
                {scripts.map((script) => (
                  <DropdownMenuItem
                    key={script.id}
                    onSelect={() =>
                      onLaunchWorkspaceScript(
                        workspace.project.id,
                        createScriptTerminalDefaults(script, preferredShellId)
                      )
                    }
                  >
                    <TerminalSquare className="size-4" />
                    {formatWorkspaceScriptActionLabel(script)}
                  </DropdownMenuItem>
                ))}
              </DropdownMenu>
            ) : null}
            <DropdownMenu
              align="end"
              widthClassName="w-64"
              trigger={(
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 shrink-0 rounded-none self-center"
                  aria-label={`Workspace actions for ${workspace.project.name}`}
                  disabled={isRemoving}
                >
                  <Ellipsis className="size-4" />
                </Button>
              )}
            >
              <WorkspaceWorkspaceActionsMenuItems
                workspace={workspace}
                focusedProjectId={snapshot.project?.id ?? null}
                terminalShells={snapshot.terminalShells}
                preferredShellId={preferredShellId}
                terminalQuickLaunchDefaults={terminalQuickLaunchDefaults}
                runnableGlobalTerminalPresets={runnableGlobalTerminalPresets}
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
            </DropdownMenu>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 shrink-0 rounded-none self-center"
              onClick={() =>
                onCollapsedWorkspaceIdsChange((current) => ({
                  ...current,
                  [workspace.project.id]: !isGroupCollapsed
                }))
              }
              aria-label={isGroupCollapsed ? "Expand workspace group" : "Collapse workspace group"}
              disabled={isRemoving}
            >
              {isGroupCollapsed ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4 rotate-[-90deg]" />}
            </Button>
          </div>
        </div>
        {isGroupCollapsed ? null : (
          <div className="border-t border-border/40 bg-background/10 pl-1.5">
            <div className="py-2 pl-5 pr-4">
              <div className="flex items-center justify-between gap-3">
                <WorkspaceSidebarChildSectionLabel icon={<Bot className="size-3.5" />} label="Agents" />
                <div className="flex items-center gap-1">
                  <div className="text-xs text-muted-foreground">{workspace.agents.length}</div>
                  <DropdownMenu
                    align="end"
                    trigger={(
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        aria-label={`Create agent for ${workspace.project.name}`}
                      >
                        <Plus className="size-4" />
                      </Button>
                    )}
                  >
                    <DropdownMenuItem
                      onSelect={() =>
                        workspace.project.id === snapshot.project?.id
                          ? onOpenCreateAgent()
                          : onFocusWorkspace(workspace.project.id)
                      }
                    >
                      <Plus className="size-4" />
                      New agent
                    </DropdownMenuItem>
                  </DropdownMenu>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    onClick={() => toggleWorkspaceAgentSection(workspace.project.id)}
                    aria-label={isAgentSectionCollapsed ? "Expand agents section" : "Collapse agents section"}
                  >
                    {isAgentSectionCollapsed ? <ChevronRight className="size-4" /> : <ChevronDown className="size-4" />}
                  </Button>
                </div>
              </div>
            </div>
            {isAgentSectionCollapsed ? null : workspace.agents.length ? (
              workspace.agents.map((agent) => (
                <WorkspaceSidebarWorkspaceSessionRow
                  key={agent.id}
                  {...sessionRowSharedProps}
                  entry={{ kind: "agent", item: agent }}
                />
              ))
            ) : (
              <button
                type="button"
                onClick={() =>
                  isFocused && workspaceViewWorktreeId
                    ? onFocusWorkspaceView(workspaceViewWorktreeId)
                    : onFocusWorkspace(workspace.project.id)
                }
                className="w-full border-l-2 border-dashed border-border/60 py-2 pl-5 pr-4 text-left text-sm text-muted-foreground transition hover:bg-accent/40"
              >
                No agents yet
              </button>
            )}
            <div className="py-2 pl-5 pr-4">
              <div className="flex items-center justify-between gap-3">
                <WorkspaceSidebarChildSectionLabel icon={<TerminalSquare className="size-3.5" />} label="Terminals" />
                <div className="flex items-center gap-1">
                  <div className="text-xs text-muted-foreground">{workspace.terminals.length}</div>
                  <DropdownMenu
                    align="end"
                    trigger={(
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        aria-label={`Create terminal for ${workspace.project.name}`}
                      >
                        <Plus className="size-4" />
                      </Button>
                    )}
                  >
                    <DropdownMenuItem
                      onSelect={() =>
                        preferredShellId
                          ? onLaunchWorkspaceTerminal(
                              workspace.project.id,
                              createQuickTerminalPayload(preferredShellId, terminalQuickLaunchDefaults)
                            )
                          : workspace.project.id === snapshot.project?.id
                            ? undefined
                            : onFocusWorkspace(workspace.project.id)
                      }
                    >
                      <TerminalSquare className="size-4" />
                      New Terminal (Defaults)
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={() =>
                        workspace.project.id === snapshot.project?.id
                          ? onOpenCreateTerminal(createQuickTerminalDialogDefaults(preferredShellId, terminalQuickLaunchDefaults))
                          : onFocusWorkspace(workspace.project.id)
                      }
                    >
                      <TerminalSquare className="size-4" />
                      New Terminal
                    </DropdownMenuItem>
                  </DropdownMenu>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    onClick={() => toggleWorkspaceTerminalSection(workspace.project.id)}
                    aria-label={isTerminalSectionCollapsed ? "Expand terminals section" : "Collapse terminals section"}
                  >
                    {isTerminalSectionCollapsed ? <ChevronRight className="size-4" /> : <ChevronDown className="size-4" />}
                  </Button>
                </div>
              </div>
            </div>
            {isTerminalSectionCollapsed ? null : workspace.terminals.length ? (
              workspace.terminals.map((terminal) => (
                <WorkspaceSidebarWorkspaceSessionRow
                  key={terminal.id}
                  {...sessionRowSharedProps}
                  entry={{ kind: "terminal", item: terminal }}
                />
              ))
            ) : (
              <button
                type="button"
                onClick={() =>
                  isFocused && workspaceViewWorktreeId
                    ? onFocusWorkspaceView(workspaceViewWorktreeId)
                    : onFocusWorkspace(workspace.project.id)
                }
                className="w-full border-l-2 border-dashed border-border/60 py-2 pl-5 pr-4 text-left text-sm text-muted-foreground transition hover:bg-accent/40"
              >
                No terminals yet
              </button>
            )}
            <div className="py-2 pl-5 pr-4">
              <div className="flex items-center justify-between gap-3">
                <WorkspaceSidebarChildSectionLabel
                  icon={<FolderKanban className="size-3.5" />}
                  label="Tasks"
                  onOpenCenter={() => {
                    onFocusWorkspace(workspace.project.id);
                    onOpenTaskBoard();
                  }}
                  openCenterAriaLabel={`Open task center for ${workspace.project.name}`}
                />
                <div className="flex items-center gap-1">
                  <div className="text-xs text-muted-foreground">{workspaceTaskEntries.length}</div>
                  <Button variant="ghost" size="icon" className="size-7" onClick={onOpenTaskBoard} aria-label="Open task center">
                    <FolderKanban className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    onClick={() => onCreateTask(workspace.project.id)}
                    aria-label={`Create task for ${workspace.project.name}`}
                    disabled={isCreatingTask}
                  >
                    {isCreatingTask ? <LoaderCircle className="size-4 animate-spin" /> : <Plus className="size-4" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    onClick={() =>
                      toggleWorkspaceTaskSection(workspace.project.id)
                    }
                    aria-label={isTaskSectionCollapsed ? "Expand tasks section" : "Collapse tasks section"}
                  >
                    {isTaskSectionCollapsed ? <ChevronRight className="size-4" /> : <ChevronDown className="size-4" />}
                  </Button>
                </div>
              </div>
              {isTaskSectionCollapsed ? null : (
              <div className="mt-1">
                {workspaceTaskEntries.length ? (
                  <div className="space-y-1">
                    {workspaceTaskEntries.map((task) => (
                      <button
                        key={`${task.projectId}:${task.path}`}
                        type="button"
                        draggable
                        onClick={() => onOpenTask(task.projectId, task.path)}
                        onContextMenu={(event) => openTaskMenu(task, event)}
                        onDragStart={(event) => {
                          setWorkspaceTaskDragData(event.dataTransfer, {
                            projectRootPath: task.projectRootPath,
                            taskPath: task.path,
                            taskTitle: task.title
                          });
                          setWorkspaceRelativePathDragData(event.dataTransfer, task.path, "file");
                        }}
                        className="flex w-full min-w-0 items-start gap-2 rounded-[4px] border border-transparent px-2 py-1.5 text-left transition hover:bg-accent/40"
                        title={`${task.projectName}\n${task.path}`}
                      >
                        {renderSubitemStatusDot(task.completed ? "bg-emerald-500/90" : "bg-primary/80")}
                        <div className="min-w-0 flex-1">
                          <div
                            className={cn(
                              "truncate text-sm font-medium",
                              task.completed ? "text-emerald-600 line-through decoration-emerald-500 decoration-2" : "text-foreground"
                            )}
                          >
                            {task.title}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-[4px] border border-dashed border-border/60 bg-background/30 px-3 py-2 text-sm text-muted-foreground">
                    No tasks yet for this workspace.
                  </div>
                )}
              </div>
              )}
            </div>
            <div className="py-2 pl-5 pr-4">
              <div className="flex items-center justify-between gap-3">
                <WorkspaceSidebarChildSectionLabel
                  icon={<ScrollText className="size-3.5" />}
                  label="Specs"
                  onOpenCenter={() => {
                    onFocusWorkspace(workspace.project.id);
                    onOpenSpecBrowser();
                  }}
                  openCenterAriaLabel={`Open spec center for ${workspace.project.name}`}
                />
                <div className="flex items-center gap-1">
                  <div className="text-xs text-muted-foreground">{workspaceSpecEntries.length}</div>
                  <Button variant="ghost" size="icon" className="size-7" onClick={onOpenSpecBrowser} aria-label="Open specs browser">
                    <FileText className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    onClick={() => onCreateSpec(workspace.project.id)}
                    aria-label={`Create spec for ${workspace.project.name}`}
                    disabled={isCreatingSpec}
                  >
                    {isCreatingSpec ? <LoaderCircle className="size-4 animate-spin" /> : <Plus className="size-4" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    onClick={() =>
                      toggleWorkspaceSpecSection(workspace.project.id)
                    }
                    aria-label={isSpecSectionCollapsed ? "Expand specs section" : "Collapse specs section"}
                  >
                    {isSpecSectionCollapsed ? <ChevronRight className="size-4" /> : <ChevronDown className="size-4" />}
                  </Button>
                </div>
              </div>
              {isSpecSectionCollapsed ? null : (
              <div className="mt-1">
                {workspaceSpecEntries.length ? (
                  <div className="space-y-1">
                    {workspaceSpecEntries.map((spec) => (
                      <button
                        key={`${spec.projectId}:${spec.path}`}
                        type="button"
                        draggable
                        onClick={() => onOpenSpec(spec.projectId, spec.path)}
                        onContextMenu={(event) => openSpecMenu(spec, event)}
                        onDragStart={(event) => {
                          setWorkspaceRelativePathDragData(event.dataTransfer, spec.path, "file");
                        }}
                        className="flex w-full min-w-0 items-start gap-2 rounded-[4px] border border-transparent px-2 py-1.5 text-left transition hover:bg-accent/40"
                        title={`${spec.projectName}\n${spec.path}`}
                      >
                        {renderSubitemStatusDot("bg-primary/80")}
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium text-foreground">{spec.title}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-[4px] border border-dashed border-border/60 bg-background/30 px-3 py-2 text-sm text-muted-foreground">
                    No specs yet for this workspace.
                  </div>
                )}
              </div>
              )}
            </div>
            <div className="py-2 pl-5 pr-4">
              <div className="flex items-center justify-between gap-3">
                <WorkspaceSidebarChildSectionLabel
                  icon={<StickyNote className="size-3.5" />}
                  label="Notes"
                  onOpenCenter={() => {
                    onFocusWorkspace(workspace.project.id);
                    onOpenNoteBrowser();
                  }}
                  openCenterAriaLabel={`Open notes center for ${workspace.project.name}`}
                />
                <div className="flex items-center gap-1">
                  <div className="text-xs text-muted-foreground">{workspaceNoteEntries.length}</div>
                  <Button variant="ghost" size="icon" className="size-7" onClick={onOpenNoteBrowser} aria-label="Open notes browser">
                    <FileText className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    onClick={() => onCreateNote(workspace.project.id)}
                    aria-label={`Create note for ${workspace.project.name}`}
                    disabled={isCreatingNote}
                  >
                    {isCreatingNote ? <LoaderCircle className="size-4 animate-spin" /> : <Plus className="size-4" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    onClick={() =>
                      toggleWorkspaceNoteSection(workspace.project.id)
                    }
                    aria-label={isNoteSectionCollapsed ? "Expand notes section" : "Collapse notes section"}
                  >
                    {isNoteSectionCollapsed ? <ChevronRight className="size-4" /> : <ChevronDown className="size-4" />}
                  </Button>
                </div>
              </div>
              {isNoteSectionCollapsed ? null : (
              <div className="mt-1">
                {workspaceNoteEntries.length ? (
                  <div className="space-y-1">
                    {workspaceNoteEntries.map((note) => (
                      <button
                        key={`${note.projectId}:${note.path}`}
                        type="button"
                        draggable
                        onClick={() => onOpenNote(note.projectId, note.path)}
                        onContextMenu={(event) => openNoteMenu(note, event)}
                        onDragStart={(event) => {
                          setWorkspaceRelativePathDragData(event.dataTransfer, note.path, "file");
                        }}
                        className="flex w-full min-w-0 items-start gap-2 rounded-[4px] border border-transparent px-2 py-1.5 text-left transition hover:bg-accent/40"
                        title={`${note.projectName}\n${note.path}`}
                      >
                        {renderSubitemStatusDot("bg-primary/80")}
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium text-foreground">{note.title}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-[4px] border border-dashed border-border/60 bg-background/30 px-3 py-2 text-sm text-muted-foreground">
                    No notes yet for this workspace.
                  </div>
                )}
              </div>
              )}
            </div>
            <div className="py-2 pl-5 pr-4">
              <div className="flex items-center justify-between gap-3">
                <WorkspaceSidebarChildSectionLabel icon={<Sparkles className="size-3.5" />} label="AI chats" />
                <div className="flex items-center gap-1">
                  <div className="text-xs text-muted-foreground">{workspaceAiChatEntries.length}</div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    onClick={() => onOpenAiChatFromSidebar(workspace.project.id)}
                    aria-label={`Open AI chat for ${workspace.project.name}`}
                  >
                    <Plus className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    onClick={() =>
                      toggleWorkspaceAiChatSection(workspace.project.id)
                    }
                    aria-label={isAiChatSectionCollapsed ? "Expand AI chats section" : "Collapse AI chats section"}
                  >
                    {isAiChatSectionCollapsed ? <ChevronRight className="size-4" /> : <ChevronDown className="size-4" />}
                  </Button>
                </div>
              </div>
              {isAiChatSectionCollapsed ? null : (
              <div className="mt-1">
                {workspaceAiChatEntries.length ? (
                  <div className="space-y-1">
                    {workspaceAiChatEntries.map((chat) => {
                      const isActive =
                        workspace.project.id === snapshot.project?.id && focusedAiChatTabId === chat.id;
                      return (
                        <button
                          key={chat.id}
                          type="button"
                          onClick={() => onFocusWorkspaceAiChatTab(workspace.project.id, chat.id)}
                          className={cn(
                            "flex w-full min-w-0 items-start gap-2 rounded-[4px] border px-2 py-1.5 text-left transition",
                            isActive
                              ? "border-primary/40 bg-primary/10"
                              : "border-transparent hover:bg-accent/40"
                          )}
                          title={chat.title}
                        >
                          {renderSubitemStatusDot(isActive ? "bg-primary" : "bg-muted-foreground/45")}
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-medium text-foreground">{chat.title}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-[4px] border border-dashed border-border/60 bg-background/30 px-3 py-2 text-sm text-muted-foreground">
                    No AI chats yet. Use + to start one.
                  </div>
                )}
              </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
};
