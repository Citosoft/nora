import { useCanonicalAppSnapshot } from "@/components/app/hooks/useAppDomainState";
import { useNativeRuntimePorts } from "@/components/app/hooks/useNativeRuntimePorts";
import { useStatusBar } from "@/components/app/logic/statusBarContext";
import { createQuickTerminalDialogDefaults,createQuickTerminalPayload } from "@/components/app/logic/terminalQuickLaunch";
import { setWorkspaceRelativePathDragData } from "@/components/app/logic/workspacePathDrag";
import { createScriptTerminalDefaults,formatWorkspaceScriptActionLabel,getPreferredWorkspaceScripts } from "@/components/app/logic/workspaceScripts";
import {
formatWorkspaceSidebarWorktreeLocationLabel,
getWorkspaceSidebarPullRequestDotClass,
sortWorkspaceSidebarWorktrees,
workspaceSidebarHasPullRequestState
} from "@/components/app/logic/workspaceSidebarPresentation";
import { setWorkspaceTaskDragData } from "@/components/app/logic/workspaceTaskDrag";
import { canRemoveWorkspaceWorktree } from "@/components/app/logic/worktreeRemoval";
import { ThreadNavigation } from "@/components/app/panels/threads/ThreadNavigation";
import { WorkspaceProjectIcon } from "@/components/app/shared/Tooling";
import { LoopWorkspaceSection } from "@/components/app/sidebar/workspace-sidebar/LoopWorkspaceSection";
import { WorkspaceSidebarChildSectionLabel } from "@/components/app/sidebar/workspace-sidebar/WorkspaceSidebarChildSectionLabel";
import { WorkspaceSidebarWorkspaceSessionRow } from "@/components/app/sidebar/workspace-sidebar/WorkspaceSidebarWorkspaceSessionRow";
import { WorkspaceWorkspaceActionsMenuItems } from "@/components/app/sidebar/workspace-sidebar/WorkspaceWorkspaceActionsMenuItems";
import { WorkspaceWorktreeActionsMenuItems } from "@/components/app/sidebar/workspace-sidebar/WorkspaceWorktreeActionsMenuItems";
import type { WorkspaceSidebarWorkspaceGroupProps } from "@/components/app/types/workspaceSidebarWorkspaceGroup.types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu,DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { isGitProject } from "@shared/projectVersionControl";
import {
ChevronDown,
ChevronLeft,
ChevronRight,
Ellipsis,
FileText,
FolderKanban,
GitBranch,
LoaderCircle,
Plus,
ScrollText,
StickyNote,
TerminalSquare,
Trash2
} from "lucide-react";
import { useState } from "react";

export const WorkspaceSidebarWorkspaceGroup = ({
  workspace,
  collapsedWorkspaceIds,
  removingWorkspaceRootSet,
  projectFaviconUrlByProjectId,
  onCollapsedWorkspaceIdsChange,
  collapsedWorkspaceWorktreeSectionIds,
  collapsedWorkspaceAgentSectionIds,
  collapsedWorkspaceTerminalSectionIds,
  collapsedWorkspaceAiChatSectionIds,
  collapsedWorkspaceNoteSectionIds,
  collapsedWorkspaceSpecSectionIds,
  collapsedWorkspaceTaskSectionIds,
  toggleWorkspaceWorktreeSection,
  toggleWorkspaceTerminalSection,
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
  onFocusWorkspaceWorktree,
  onOpenWorkflowRunChangeRequest,
  onOpenCreateAgentOnWorktree,
  onOpenCreateTerminalOnWorktree,
  onOpenCreateWorktree,
  onLaunchQuickTerminalOnWorktree,
  onCheckoutWorkspaceBranch,
  onLaunchWorktreeScript,
  onRemoveWorktree,
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
  onRemoveProject
}: WorkspaceSidebarWorkspaceGroupProps) => {
  const snapshot = useCanonicalAppSnapshot();
  const native = useNativeRuntimePorts();
  const statusBar = useStatusBar();
  const [threadError, setThreadError] = useState<string | null>(null);
  const nativeWorkspace = native.boot.workspaces.find((entry) => entry.shellProjectId === workspace.project.id);
  const openThread = (): void => {
    setThreadError(null);
    void native.launch({ projectId: workspace.project.id }).catch((cause: unknown) => setThreadError(cause instanceof Error ? cause.message : "Thread could not be opened."));
  };
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
    const isGitWorkspace = isGitProject(workspace.project);
    const directSshLabel = directSshLocation
      ? `${directSshLocation.user}@${directSshLocation.host}${directSshLocation.port ? `:${directSshLocation.port}` : ""}`
      : null;
    const isGroupCollapsed = collapsedWorkspaceIds[workspace.project.id] ?? false;
    const isWorktreeSectionCollapsed = collapsedWorkspaceWorktreeSectionIds[workspace.project.id] ?? true;
    const isTerminalSectionCollapsed = collapsedWorkspaceTerminalSectionIds[workspace.project.id] ?? true;
    const isTaskSectionCollapsed = collapsedWorkspaceTaskSectionIds[workspace.project.id] ?? true;
    const isSpecSectionCollapsed = collapsedWorkspaceSpecSectionIds[workspace.project.id] ?? true;
    const isNoteSectionCollapsed = collapsedWorkspaceNoteSectionIds[workspace.project.id] ?? true;
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
    const workspaceWorktreeEntries = sortWorkspaceSidebarWorktrees(workspace.worktrees, workspace.project.rootPath);
    const focusedWorktreeId =
      isFocused
        ? snapshot.sessions.find((session) => session.id === snapshot.currentSessionId)?.focusedWorktreeId ??
          snapshot.worktrees.find((worktree) => worktree.path === snapshot.changesRoot)?.id ??
          null
        : null;
    const scripts = getPreferredWorkspaceScripts(workspace);
    const quickLaunchAgentLabel = "New thread";

    return (
      <div
        key={workspace.project.id}
        className="px-2 py-0.5"
      >
        <div
          className="group relative flex items-stretch rounded-[4px] transition hover:bg-accent/40"
          onContextMenu={(event) => {
            if (isRemoving) {
              return;
            }
            openWorkspaceMenu(workspace.project.id, event);
          }}
        >
          {isFocused ? (
            <span aria-hidden className="pointer-events-none absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-full bg-primary" />
          ) : null}
          <button
            type="button"
            aria-current={isFocused ? "true" : undefined}
            onClick={() =>
              isFocused && workspaceViewWorktreeId
                ? onFocusWorkspaceView(workspaceViewWorktreeId)
                : onFocusWorkspace(workspace.project.id)
            }
            className="min-w-0 flex-1 rounded-[4px] px-2 py-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-inset"
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
                  <div className={cn("truncate text-sm", isFocused ? "font-semibold text-foreground" : "font-medium text-foreground/85")}>
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
            <div className="flex items-center opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
              <Tooltip content={quickLaunchAgentLabel}>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 shrink-0 rounded-[4px] self-center"
                  aria-label={`${quickLaunchAgentLabel} in ${workspace.project.name}`}
                  disabled={isRemoving}
                  onClick={openThread}
                >
                  <Plus className="size-4" />
                </Button>
              </Tooltip>
              {scripts.length && preferredShellId ? (
                <DropdownMenu
                  align="end"
                  widthClassName="w-56"
                  trigger={(
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 shrink-0 rounded-[4px] self-center"
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
                    className="size-8 shrink-0 rounded-[4px] self-center"
                    aria-label={`Project actions for ${workspace.project.name}`}
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
            </div>
            {/* Count sits beside the fixed-width chevron so optional hover actions never shift it. */}
            <Badge variant="outline">{sessionCount}</Badge>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 shrink-0 rounded-[4px] self-center"
              onClick={() =>
                onCollapsedWorkspaceIdsChange((current) => ({
                  ...current,
                  [workspace.project.id]: !isGroupCollapsed
                }))
              }
              aria-label={isGroupCollapsed ? "Expand project group" : "Collapse project group"}
              disabled={isRemoving}
            >
              {isGroupCollapsed ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4 rotate-[-90deg]" />}
            </Button>
          </div>
        </div>
        {isGroupCollapsed ? null : (
          <div className="pb-1">
            {threadError && <p role="alert" className="px-4 py-2 text-xs text-destructive">{threadError}</p>}
            <ThreadNavigation workspaceId={nativeWorkspace?.id ?? `unregistered:${workspace.project.id}`} onNew={openThread} />
            {isGitWorkspace ? (
              <div className="py-1.5 pl-5 pr-4">
                <div className="flex items-center justify-between gap-3">
                  <WorkspaceSidebarChildSectionLabel
                    icon={<GitBranch className="size-3.5" />}
                    label="Worktrees"
                    count={workspaceWorktreeEntries.length}
                  />
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      aria-label={`Create worktree for ${workspace.project.name}`}
                      onClick={() => onOpenCreateWorktree(workspace.project.id)}
                      disabled={isRemoving}
                    >
                      <Plus className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      onClick={() => toggleWorkspaceWorktreeSection(workspace.project.id)}
                      aria-label={isWorktreeSectionCollapsed ? "Expand worktrees section" : "Collapse worktrees section"}
                    >
                      {isWorktreeSectionCollapsed ? <ChevronRight className="size-4" /> : <ChevronDown className="size-4" />}
                    </Button>
                  </div>
                </div>
                {isWorktreeSectionCollapsed ? null : workspaceWorktreeEntries.length ? (
                  <div className="mt-1 space-y-0.5">
                    {workspaceWorktreeEntries.map((worktree) => {
                      const locationLabel = formatWorkspaceSidebarWorktreeLocationLabel(worktree, workspace.project.rootPath);
                      const pullRequestStatus =
                        pullRequestStatusByWorkspaceBranch[`${workspace.project.id}:${worktree.branch.trim()}`] ?? null;
                      const hasPullRequest = workspaceSidebarHasPullRequestState(pullRequestStatus?.state);
                      const isFocusedWorktree = focusedWorktreeId === worktree.id;
                      const isRootWorktree =
                        worktree.path === workspace.project.rootPath || worktree.createdFromRef === "ROOT";
                      const canRemoveWorktree = canRemoveWorkspaceWorktree(workspace, worktree, isRootWorktree);
                      const handleCheckoutBranch = async () => {
                        const statusId = statusBar.beginStatus(`Checking out ${worktree.branch}`, true);
                        try {
                          await onCheckoutWorkspaceBranch(workspace.project.id, worktree.branch);
                        } finally {
                          statusBar.endStatus(statusId);
                        }
                      };
                      return (
                        <div
                          key={worktree.id}
                          className="group/worktree flex min-w-0 items-center gap-0.5 rounded-[4px] pr-1 transition hover:bg-accent/40"
                        >
                          <div
                            role="button"
                            tabIndex={0}
                            onClick={() =>
                              isFocused
                                ? onFocusWorkspaceView(worktree.id)
                                : void onFocusWorkspaceWorktree(workspace.project.id, worktree.id)
                            }
                            onKeyDown={(event) => {
                              if (event.key !== "Enter" && event.key !== " ") {
                                return;
                              }
                              event.preventDefault();
                              void (isFocused
                                ? onFocusWorkspaceView(worktree.id)
                                : onFocusWorkspaceWorktree(workspace.project.id, worktree.id));
                            }}
                            className={cn(
                              "flex min-w-0 flex-1 items-center gap-2 rounded-[4px] px-2 py-1 text-left transition",
                              isFocusedWorktree ? "bg-primary/10" : "hover:bg-accent/40"
                            )}
                            title={`${worktree.branch}\n${worktree.path}`}
                          >
                            {renderSubitemStatusDot(isFocusedWorktree ? "bg-primary" : "bg-muted-foreground/45")}
                            <div className="min-w-0 flex-1 truncate text-[12px] leading-tight">
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  void handleCheckoutBranch();
                                }}
                                className={cn(
                                  "font-medium text-foreground underline-offset-2 transition hover:underline",
                                  worktree.status !== "ready" && "cursor-not-allowed opacity-70"
                                )}
                                disabled={worktree.status !== "ready"}
                                title={`Check out ${worktree.branch} in the root project`}
                              >
                                {worktree.branch}
                              </button>
                              <span className="text-muted-foreground"> · {locationLabel}</span>
                            </div>
                            {worktree.status === "creating" ? (
                              <Badge variant="outline" className="h-5 shrink-0 px-1.5 text-[10px]">
                                Creating
                              </Badge>
                            ) : null}
                            {worktree.status === "error" ? (
                              <Badge variant="outline" className="h-5 shrink-0 px-1.5 text-[10px] text-destructive">
                                Error
                              </Badge>
                            ) : null}
                            {hasPullRequest && pullRequestStatus ? (
                              <Tooltip
                                content={
                                  pullRequestStatus.pullRequestNumber
                                    ? `PR status: ${pullRequestStatus.label} (#${pullRequestStatus.pullRequestNumber})`
                                    : `PR status: ${pullRequestStatus.label}`
                                }
                                side="right"
                              >
                                <span
                                  className={cn(
                                    "inline-flex size-1.5 shrink-0 rounded-full",
                                    getWorkspaceSidebarPullRequestDotClass(pullRequestStatus.state)
                                  )}
                                  aria-label={`Pull request status: ${pullRequestStatus.label}`}
                                />
                              </Tooltip>
                            ) : null}
                          </div>
                          {!isRootWorktree ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-7 shrink-0 text-muted-foreground hover:text-destructive disabled:opacity-30"
                              aria-label={`Delete worktree ${worktree.branch}`}
                              title={
                                canRemoveWorktree
                                  ? `Delete worktree ${worktree.branch}`
                                  : "Remove attached agents and terminals before deleting this worktree"
                              }
                              disabled={isRemoving || !canRemoveWorktree}
                              onClick={() =>
                                onRemoveWorktree(workspace.project.id, worktree.id, worktree.branch)
                              }
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          ) : null}
                          <DropdownMenu
                            align="end"
                            widthClassName="w-56"
                            trigger={(
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-7 shrink-0 opacity-0 transition-opacity group-hover/worktree:opacity-100 group-focus-within/worktree:opacity-100"
                                aria-label={`Worktree actions for ${worktree.branch}`}
                                disabled={isRemoving}
                              >
                                <Ellipsis className="size-4" />
                              </Button>
                            )}
                          >
                            <WorkspaceWorktreeActionsMenuItems
                              workspace={workspace}
                              worktree={worktree}
                              preferredShellId={preferredShellId}
                              pullRequestStatus={pullRequestStatus}
                              isRootWorktree={isRootWorktree}
                              onFocusWorktree={() =>
                                isFocused
                                  ? onFocusWorkspaceView(worktree.id)
                                  : void onFocusWorkspaceWorktree(workspace.project.id, worktree.id)
                              }
                              onOpenCreateAgentOnWorktree={onOpenCreateAgentOnWorktree}
                              onOpenCreateTerminalOnWorktree={onOpenCreateTerminalOnWorktree}
                              onLaunchQuickTerminalOnWorktree={onLaunchQuickTerminalOnWorktree}
                              onLaunchWorktreeScript={onLaunchWorktreeScript}
                              onRemoveWorktree={onRemoveWorktree}
                              onOpenPullRequest={onOpenWorkspaceBrowser}
                            />
                          </DropdownMenu>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="mt-1 rounded-[4px] border border-dashed border-border/60 bg-background/30 px-3 py-2 text-sm text-muted-foreground">
                    No worktrees detected yet.
                  </div>
                )}
              </div>
            ) : null}
            <LoopWorkspaceSection
              workspace={workspace}
              agentCatalog={snapshot.agentCatalog}
              onCreateChangeRequest={(run) => {
                if (!run.worktreeId) {
                  return Promise.reject(new Error("This workflow run does not have a managed worktree."));
                }
                return onOpenWorkflowRunChangeRequest(run.projectId, run.worktreeId);
              }}
            />
            <div className="py-1.5 pl-5 pr-4">
              <div className="flex items-center justify-between gap-3">
                <WorkspaceSidebarChildSectionLabel
                  icon={<TerminalSquare className="size-3.5" />}
                  label="Terminals"
                  count={workspace.terminals.length}
                />
                <div className="flex items-center gap-1">
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
            <div className="py-1.5 pl-5 pr-4">
              <div className="flex items-center justify-between gap-3">
                <WorkspaceSidebarChildSectionLabel
                  icon={<FolderKanban className="size-3.5" />}
                  label="Tasks"
                  count={workspaceTaskEntries.length}
                  onOpenCenter={() => {
                    onFocusWorkspace(workspace.project.id);
                    onOpenTaskBoard();
                  }}
                  openCenterAriaLabel={`Open task center for ${workspace.project.name}`}
                />
                <div className="flex items-center gap-1">
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
                              "truncate text-[13px] font-medium",
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
                    No tasks yet for this project.
                  </div>
                )}
              </div>
              )}
            </div>
            <div className="py-1.5 pl-5 pr-4">
              <div className="flex items-center justify-between gap-3">
                <WorkspaceSidebarChildSectionLabel
                  icon={<ScrollText className="size-3.5" />}
                  label="Specs"
                  count={workspaceSpecEntries.length}
                  onOpenCenter={() => {
                    onFocusWorkspace(workspace.project.id);
                    onOpenSpecBrowser();
                  }}
                  openCenterAriaLabel={`Open spec center for ${workspace.project.name}`}
                />
                <div className="flex items-center gap-1">
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
                          <div className="truncate text-[13px] font-medium text-foreground">{spec.title}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-[4px] border border-dashed border-border/60 bg-background/30 px-3 py-2 text-sm text-muted-foreground">
                    No specs yet for this project.
                  </div>
                )}
              </div>
              )}
            </div>
            <div className="py-1.5 pl-5 pr-4">
              <div className="flex items-center justify-between gap-3">
                <WorkspaceSidebarChildSectionLabel
                  icon={<StickyNote className="size-3.5" />}
                  label="Notes"
                  count={workspaceNoteEntries.length}
                  onOpenCenter={() => {
                    onFocusWorkspace(workspace.project.id);
                    onOpenNoteBrowser();
                  }}
                  openCenterAriaLabel={`Open notes center for ${workspace.project.name}`}
                />
                <div className="flex items-center gap-1">
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
                          <div className="truncate text-[13px] font-medium text-foreground">{note.title}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-[4px] border border-dashed border-border/60 bg-background/30 px-3 py-2 text-sm text-muted-foreground">
                    No notes yet for this project.
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
