import { isAgentBusyAt } from "@/components/app/logic/agentBusy";
import {
  formatWorkspaceSessionTimestamp,
  getWorkspaceSidebarPullRequestDotClass,
  workspaceSidebarHasPullRequestState
} from "@/components/app/logic/workspaceSidebarPresentation";
import { createQuickTerminalDialogDefaults, createQuickTerminalPayload } from "@/components/app/logic/terminalQuickLaunch";
import { createScriptTerminalDefaults, formatWorkspaceScriptActionLabel, getPreferredWorkspaceScripts } from "@/components/app/logic/workspaceScripts";
import { setWorkspaceTaskDragData } from "@/components/app/logic/workspaceTaskDrag";
import { BusyIndicator } from "@/components/app/shared/BusyIndicator";
import { AgentToolIcon, WorkspaceProjectIcon } from "@/components/app/shared/Tooling";
import { WorkspaceSidebarChildSectionLabel } from "@/components/app/sidebar/workspace-sidebar/WorkspaceSidebarChildSectionLabel";
import { WorkspaceWorkspaceActionsMenuItems } from "@/components/app/sidebar/workspace-sidebar/WorkspaceWorkspaceActionsMenuItems";
import type { WorkspaceSidebarWorkspaceGroupProps } from "@/components/app/types/workspaceSidebarWorkspaceGroup.types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
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
  collapsedWorkspaceAiChatSectionIds,
  collapsedWorkspaceNoteSectionIds,
  collapsedWorkspaceSpecSectionIds,
  collapsedWorkspaceTaskSectionIds,
  toggleWorkspaceAgentSection,
  toggleWorkspaceAiChatSection,
  toggleWorkspaceNoteSection,
  toggleWorkspaceSpecSection,
  toggleWorkspaceTaskSection,
  workspaceTasks,
  workspaceSpecs,
  workspaceNotes,
  aiChatTabs,
  focusedAiChatTabId,
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
    const directSshLocation = workspace.project.location?.kind === "ssh" ? workspace.project.location : null;
    const isDirectSshWorkspace = directSshLocation !== null;
    const directSshLabel = directSshLocation
      ? `${directSshLocation.user}@${directSshLocation.host}${directSshLocation.port ? `:${directSshLocation.port}` : ""}`
      : null;
    const isGroupCollapsed = collapsedWorkspaceIds[workspace.project.id] ?? false;
    const isAgentSectionCollapsed = collapsedWorkspaceAgentSectionIds[workspace.project.id] ?? true;
    const isTaskSectionCollapsed = collapsedWorkspaceTaskSectionIds[workspace.project.id] ?? true;
    const isSpecSectionCollapsed = collapsedWorkspaceSpecSectionIds[workspace.project.id] ?? true;
    const isNoteSectionCollapsed = collapsedWorkspaceNoteSectionIds[workspace.project.id] ?? true;
    const isAiChatSectionCollapsed = collapsedWorkspaceAiChatSectionIds[workspace.project.id] ?? true;
    const workspaceViewWorktreeId =
      workspace.sessions[0]?.focusedWorktreeId ||
      workspace.worktrees[0]?.id ||
      null;
    const items = [
      ...workspace.agents.map((agent) => ({ kind: "agent" as const, item: agent })),
      ...workspace.terminals.map((terminal) => ({ kind: "terminal" as const, item: terminal }))
    ];
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
            <Badge variant="outline">{items.length}</Badge>
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
          <div className="border-t border-border/40 bg-background/10">
            <div className="py-2 pl-5 pr-4">
              <div className="flex items-center justify-between gap-3">
                <WorkspaceSidebarChildSectionLabel icon={<TerminalSquare className="size-3.5" />} label="Agents" />
                <div className="flex items-center gap-1">
                  <div className="text-xs text-muted-foreground">{items.length}</div>
                  <DropdownMenu
                    align="end"
                    trigger={(
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        aria-label={`Create session for ${workspace.project.name}`}
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
                    onClick={() =>
                      toggleWorkspaceAgentSection(workspace.project.id)
                    }
                    aria-label={isAgentSectionCollapsed ? "Expand agents section" : "Collapse agents section"}
                  >
                    {isAgentSectionCollapsed ? <ChevronRight className="size-4" /> : <ChevronDown className="size-4" />}
                  </Button>
                </div>
              </div>
            </div>
            {isAgentSectionCollapsed ? null : items.length ? (
              items.map(({ kind, item }) => {
                const isAgentBusy =
                  kind === "agent" &&
                  isAgentBusyAt(item, now);
                const agentPullRequestStatus =
                  kind === "agent"
                    ? pullRequestStatusByWorkspaceBranch[`${workspace.project.id}:${item.branch.trim()}`] ?? null
                    : null;
                const showAgentPullRequestStatus =
                  kind === "agent" && workspaceSidebarHasPullRequestState(agentPullRequestStatus?.state);
                const showAgentUpdateIndicator = kind === "agent" && !isAgentBusy && !!agentsNeedingAttention[item.id];
                const sessionPopoverContent =
                  kind === "agent" ? (
                    <div>
                      <div className="rounded-[6px] border border-border/60 bg-gradient-to-br from-background to-accent/20 p-3">
                        <div className="flex items-start gap-3">
                          <AgentToolIcon toolId={item.toolId} label={item.toolLabel} className="size-10 shrink-0" imageClassName="size-6 rounded-sm" />
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-semibold">{item.name}</div>
                            <div className="mt-0.5 text-xs text-muted-foreground">{item.toolLabel} agent</div>
                            <div className="mt-2 flex flex-wrap items-center gap-1.5">
                              <Badge variant="outline">{item.mode}</Badge>
                              <Badge variant={isAgentBusy ? "default" : "outline"}>
                                {isAgentBusy ? "Busy" : item.status}
                              </Badge>
                              <Badge variant="outline">{item.branch}</Badge>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="grid gap-2 text-xs">
                        <div className="rounded-[6px] border border-border/50 bg-background/60 p-2.5">
                          <div className="mb-1 text-[11px] text-muted-foreground">Workspace</div>
                          <div className="break-all font-mono text-[11px] text-foreground/90">{item.workspace}</div>
                        </div>
                        {item.resumeSessionId ? (
                          <div className="rounded-[6px] border border-border/50 bg-background/60 p-2.5">
                            <div className="mb-1 text-[11px] text-muted-foreground">Resume ID</div>
                            <div className="break-all font-mono text-[11px] text-foreground/90">{item.resumeSessionId}</div>
                          </div>
                        ) : null}
                        {agentPullRequestStatus && workspaceSidebarHasPullRequestState(agentPullRequestStatus.state) ? (
                          <div className="rounded-[6px] border border-border/50 bg-background/60 p-2.5">
                            <div className="mb-1 text-[11px] text-muted-foreground">Pull request</div>
                            <div className="flex items-center gap-1.5 text-foreground/90">
                              <span
                                className={cn("inline-flex size-2 rounded-full", getWorkspaceSidebarPullRequestDotClass(agentPullRequestStatus.state))}
                                aria-hidden="true"
                              />
                              <span>
                                {agentPullRequestStatus.label}
                                {agentPullRequestStatus.pullRequestNumber ? ` #${agentPullRequestStatus.pullRequestNumber}` : ""}
                              </span>
                            </div>
                            {agentPullRequestStatus.webUrl ? (
                              <div className="mt-1 break-all font-mono text-[11px] text-muted-foreground">
                                {agentPullRequestStatus.webUrl}
                              </div>
                            ) : null}
                          </div>
                        ) : null}
                        <div className="rounded-[6px] border border-border/50 bg-background/60 p-2.5">
                          <div className="mb-1 text-[11px] text-muted-foreground">Task</div>
                          <div className="text-foreground/90">{item.task}</div>
                        </div>
                        {item.lastTerminalLine ? (
                          <div className="rounded-[6px] border border-border/50 bg-background/60 p-2.5">
                            <div className="mb-1 text-[11px] text-muted-foreground">Latest Output</div>
                            <div className="text-foreground/90">{item.lastTerminalLine}</div>
                          </div>
                        ) : null}
                        <div className="grid grid-cols-2 gap-2">
                          <div className="rounded-[6px] border border-border/50 bg-background/60 p-2.5">
                            <div className="mb-1 text-[11px] text-muted-foreground">Host</div>
                            <div className="text-foreground/90">{item.host}</div>
                          </div>
                          <div className="rounded-[6px] border border-border/50 bg-background/60 p-2.5">
                            <div className="mb-1 text-[11px] text-muted-foreground">Last Activity</div>
                            <div className="text-foreground/90">{formatWorkspaceSessionTimestamp(item.lastEventAt)}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="rounded-[6px] border border-border/60 bg-gradient-to-br from-background to-accent/20 p-3">
                        <div className="flex items-start gap-3">
                          <div className="grid size-10 shrink-0 place-items-center rounded-[6px] border border-border/50 bg-background/70">
                            <TerminalSquare className="size-5 text-primary" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-semibold">{item.name}</div>
                            <div className="mt-0.5 text-xs text-muted-foreground">{item.shellLabel} terminal</div>
                            <div className="mt-2 flex flex-wrap items-center gap-1.5">
                              <Badge variant={item.status === "running" ? "default" : "outline"}>{item.status}</Badge>
                              <Badge variant="outline">{item.branch}</Badge>
                              {item.detectedLocalPort ? <Badge variant="outline">:{item.detectedLocalPort}</Badge> : null}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="grid gap-2 text-xs">
                        <div className="rounded-[6px] border border-border/50 bg-background/60 p-2.5">
                          <div className="mb-1 text-[11px] text-muted-foreground">Workspace</div>
                          <div className="break-all font-mono text-[11px] text-foreground/90">{item.workspace}</div>
                        </div>
                        <div className="rounded-[6px] border border-border/50 bg-background/60 p-2.5">
                          <div className="mb-1 text-[11px] text-muted-foreground">Launch</div>
                          <div className="text-foreground/90">{item.launchConfig.label}</div>
                        </div>
                        {item.lastTerminalLine ? (
                          <div className="rounded-[6px] border border-border/50 bg-background/60 p-2.5">
                            <div className="mb-1 text-[11px] text-muted-foreground">Latest Output</div>
                            <div className="text-foreground/90">{item.lastTerminalLine}</div>
                          </div>
                        ) : null}
                        <div className="grid grid-cols-2 gap-2">
                          <div className="rounded-[6px] border border-border/50 bg-background/60 p-2.5">
                            <div className="mb-1 text-[11px] text-muted-foreground">Host</div>
                            <div className="text-foreground/90">{item.host}</div>
                          </div>
                          <div className="rounded-[6px] border border-border/50 bg-background/60 p-2.5">
                            <div className="mb-1 text-[11px] text-muted-foreground">Last Activity</div>
                            <div className="text-foreground/90">{formatWorkspaceSessionTimestamp(item.lastEventAt)}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );

                return (
                  <Popover
                    key={item.id}
                    open={activeSessionPopoverId === item.id}
                    onOpenChange={(open: boolean) => setActiveSessionPopoverId(open ? item.id : null)}
                  >
                    <PopoverTrigger asChild>
                      <button
                        onMouseEnter={() => openSessionPopover(item.id)}
                        onMouseLeave={scheduleSessionPopoverClose}
                        onFocus={() => openSessionPopover(item.id)}
                        onBlur={scheduleSessionPopoverClose}
                        onContextMenu={(event) => {
                          if (kind !== "agent") {
                            return;
                          }
                          const branchPr =
                            pullRequestStatusByWorkspaceBranch[`${workspace.project.id}:${item.branch.trim()}`] ?? null;
                          const prUrl =
                            branchPr && workspaceSidebarHasPullRequestState(branchPr.state) ? branchPr.webUrl ?? null : null;
                          openAgentSessionMenu(workspace.project.id, item, prUrl, event);
                        }}
                        onClick={() =>
                          kind === "agent"
                              ? workspace.project.id === snapshot.project?.id
                                ? onFocusAgent(item.id)
                                : void onFocusWorkspaceAgent(workspace.project.id, item.id)
                              : workspace.project.id === snapshot.project?.id
                                ? onFocusTerminal(item.id)
                                : void onFocusWorkspaceTerminal(workspace.project.id, item.id)
                        }
                        className={cn(
                          "w-full border-l-2 border-transparent py-1.5 pl-5 pr-4 text-left outline-none transition focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-inset",
                          ((kind === "agent" && focusedAgent?.id === item.id) ||
                            (kind === "terminal" && focusedTerminal?.id === item.id)) &&
                            workspace.project.id === snapshot.project?.id
                            ? "border-primary bg-primary/10"
                            : "hover:bg-accent/40"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          {kind === "agent" ? (
                            <div className="relative shrink-0">
                              <AgentToolIcon toolId={item.toolId} label={item.toolLabel} className="size-7" imageClassName="size-[18px] rounded-sm" />
                              {showAgentUpdateIndicator ? (
                                <span className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full border border-background bg-emerald-400 shadow-[0_0_10px_rgba(74,222,128,0.85)]" />
                              ) : null}
                            </div>
                          ) : (
                            <div className="grid size-7 place-items-center rounded-[4px] bg-background/60">
                              <TerminalSquare className="size-4 text-primary" />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-medium">{item.name}</div>
                            <div className="truncate text-xs text-muted-foreground">
                              {kind === "agent" && isAgentBusy && item.lastTerminalLine
                                ? item.lastTerminalLine
                                : kind === "agent"
                                  ? item.branch
                                  : item.launchConfig.label}
                            </div>
                          </div>
                          {kind === "agent" && isAgentBusy ? (
                            <BusyIndicator className="size-3.5 shrink-0" />
                          ) : null}
                          {showAgentPullRequestStatus && agentPullRequestStatus ? (
                            <Tooltip
                              content={
                                agentPullRequestStatus.pullRequestNumber
                                  ? `PR status: ${agentPullRequestStatus.label} (#${agentPullRequestStatus.pullRequestNumber})`
                                  : `PR status: ${agentPullRequestStatus.label}`
                              }
                              side="right"
                            >
                              <span
                                className={cn("inline-flex size-2 shrink-0 rounded-full", getWorkspaceSidebarPullRequestDotClass(agentPullRequestStatus.state))}
                                aria-label={`Pull request status: ${agentPullRequestStatus.label}`}
                              />
                            </Tooltip>
                          ) : null}
                          {kind === "terminal" && item.detectedLocalPort ? (
                            <div className="shrink-0 rounded-[4px] border border-border/60 bg-background/40 px-1.5 py-0.5 text-[11px] tabular-nums text-muted-foreground">
                              :{item.detectedLocalPort}
                            </div>
                          ) : null}
                          {item.changeSummary ? (
                            <div className="text-[11px] tabular-nums text-muted-foreground">
                              <span className="text-emerald-300">+{item.changeSummary.additions}</span>
                              {" / "}
                              <span className="text-rose-300">-{item.changeSummary.deletions}</span>
                            </div>
                          ) : null}
                        </div>
                      </button>
                    </PopoverTrigger>
                    <PopoverContent
                      side="right"
                      align="start"
                      className="max-w-[26rem] whitespace-normal"
                      onMouseEnter={() => openSessionPopover(item.id)}
                      onMouseLeave={scheduleSessionPopoverClose}
                      onOpenAutoFocus={(event: Event) => event.preventDefault()}
                    >
                      {sessionPopoverContent}
                    </PopoverContent>
                  </Popover>
                );
              })
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
                No sessions yet
              </button>
            )}
            <div className="py-2 pl-5 pr-4">
              <div className="flex items-center justify-between gap-3">
                <WorkspaceSidebarChildSectionLabel icon={<FolderKanban className="size-3.5" />} label="Tasks" />
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
                        }}
                        className="flex w-full min-w-0 items-start gap-2 rounded-[4px] border border-transparent px-2 py-1.5 text-left transition hover:bg-accent/40"
                        title={`${task.projectName}\n${task.path}`}
                      >
                        <FileText className="mt-0.5 size-4 shrink-0 text-primary" />
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
                <WorkspaceSidebarChildSectionLabel icon={<ScrollText className="size-3.5" />} label="Specs" />
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
                        onClick={() => onOpenSpec(spec.projectId, spec.path)}
                        onContextMenu={(event) => openSpecMenu(spec, event)}
                        className="flex w-full min-w-0 items-start gap-2 rounded-[4px] border border-transparent px-2 py-1.5 text-left transition hover:bg-accent/40"
                        title={`${spec.projectName}\n${spec.path}`}
                      >
                        <ScrollText className="mt-0.5 size-4 shrink-0 text-primary" />
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
                <WorkspaceSidebarChildSectionLabel icon={<StickyNote className="size-3.5" />} label="Notes" />
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
                        onClick={() => onOpenNote(note.projectId, note.path)}
                        onContextMenu={(event) => openNoteMenu(note, event)}
                        className="flex w-full min-w-0 items-start gap-2 rounded-[4px] border border-transparent px-2 py-1.5 text-left transition hover:bg-accent/40"
                        title={`${note.projectName}\n${note.path}`}
                      >
                        <StickyNote className="mt-0.5 size-4 shrink-0 text-primary" />
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
                          <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" />
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
