import { setWorkspaceSplitViewItemDragData } from "@/components/app/logic/workspaceSplitViewDrag";
import { isAgentBusyAt } from "@/components/app/logic/agentBusy";
import {
  formatWorkspaceSessionTimestamp,
  getWorkspaceSidebarPullRequestDotClass,
  workspaceSidebarHasPullRequestState
} from "@/components/app/logic/workspaceSidebarPresentation";
import { BusyIndicator } from "@/components/app/shared/BusyIndicator";
import { AgentToolIcon } from "@/components/app/shared/Tooling";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { AgentSession, ForgeBranchPullRequestStatus, TerminalSession } from "@shared/appTypes";
import { TerminalSquare } from "lucide-react";
import type { Dispatch, KeyboardEvent, MouseEvent, SetStateAction } from "react";

export type WorkspaceSidebarWorkspaceSessionEntry =
  | { kind: "agent"; item: AgentSession }
  | { kind: "terminal"; item: TerminalSession };

export type WorkspaceSidebarWorkspaceSessionRowProps = {
  workspaceId: string;
  focusedProjectId: string | null;
  entry: WorkspaceSidebarWorkspaceSessionEntry;
  now: number;
  pullRequestStatusByWorkspaceBranch: Record<string, ForgeBranchPullRequestStatus | null>;
  agentsNeedingAttention: Record<string, boolean>;
  focusedAgent: AgentSession | null;
  focusedTerminal: TerminalSession | null;
  focusedAiChatTabId: string | null;
  focusedBrowserTabId: string | null;
  focusedForgeViewerTabId: string | null;
  activeWorkspaceContentTab: "file" | "diff" | null;
  isTaskBoardOpen: boolean;
  isSpecBrowserOpen: boolean;
  isNoteBrowserOpen: boolean;
  activeSessionPopoverId: string | null;
  setActiveSessionPopoverId: Dispatch<SetStateAction<string | null>>;
  openSessionPopover: (sessionId: string) => void;
  scheduleSessionPopoverClose: () => void;
  openAgentSessionMenu: (workspaceId: string, agent: AgentSession, pullRequestWebUrl: string | null, event: MouseEvent<Element>) => void;
  openTerminalSessionMenu: (workspaceId: string, terminal: TerminalSession, event: MouseEvent<Element>) => void;
  onFocusAgent: (agentId: string) => void;
  onFocusTerminal: (terminalId: string) => void;
  onFocusWorkspaceAgent: (workspaceId: string, agentId: string) => void;
  onFocusWorkspaceTerminal: (workspaceId: string, terminalId: string) => void;
  editingTerminalSessionId: string | null;
  editingTerminalNameDraft: string;
  onEditingTerminalNameDraftChange: (nextName: string) => void;
  onSubmitTerminalRename: (sessionId: string, currentName: string) => void;
  onCancelTerminalRename: () => void;
};

export const WorkspaceSidebarWorkspaceSessionRow = ({
  workspaceId,
  focusedProjectId,
  entry,
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
}: WorkspaceSidebarWorkspaceSessionRowProps) => {
  const { kind, item } = entry;
  const isAgentBusy = kind === "agent" && isAgentBusyAt(item, now);
  const agentPullRequestStatus =
    kind === "agent" ? pullRequestStatusByWorkspaceBranch[`${workspaceId}:${item.branch.trim()}`] ?? null : null;
  const showAgentPullRequestStatus =
    kind === "agent" && workspaceSidebarHasPullRequestState(agentPullRequestStatus?.state);
  const showAgentUpdateIndicator = kind === "agent" && !isAgentBusy && !!agentsNeedingAttention[item.id];
  const isTerminalInlineRenaming = kind === "terminal" && editingTerminalSessionId === item.id;
  const hasFocusedWorkspaceContentSurface =
    activeWorkspaceContentTab !== null || isTaskBoardOpen || isSpecBrowserOpen || isNoteBrowserOpen;
  const hasFocusedNonSessionCenterTab =
    focusedBrowserTabId !== null ||
    focusedForgeViewerTabId !== null ||
    focusedAiChatTabId !== null ||
    hasFocusedWorkspaceContentSurface;
  const isAgentRowFocused = kind === "agent" && focusedAgent?.id === item.id && workspaceId === focusedProjectId;
  const isTerminalRowFocused =
    kind === "terminal" &&
    focusedTerminal?.id === item.id &&
    workspaceId === focusedProjectId &&
    focusedAgent === null &&
    !hasFocusedNonSessionCenterTab;
  const handleRenameInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (kind !== "terminal") {
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      onSubmitTerminalRename(item.id, item.name);
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      onCancelTerminalRename();
    }
  };

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
                <Badge variant={isAgentBusy ? "default" : "outline"}>{isAgentBusy ? "Busy" : item.status}</Badge>
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
                <div className="mt-1 break-all font-mono text-[11px] text-muted-foreground">{agentPullRequestStatus.webUrl}</div>
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

  const rowContent = (
    <div className="flex items-center gap-2">
      {kind === "agent" ? (
        <div className="relative shrink-0">
          <AgentToolIcon toolId={item.toolId} label={item.toolLabel} className="size-7" imageClassName="size-[18px] rounded-sm" />
          {showAgentUpdateIndicator ? (
            <span className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full border border-background bg-emerald-400 shadow-[0_0_10px_rgba(74,222,128,0.85)]" />
          ) : null}
        </div>
      ) : (
        <span
          className={cn(
            "mt-1 inline-flex size-2.5 shrink-0 rounded-full border border-background/80",
            item.status === "running" ? "bg-primary/80" : "bg-muted-foreground/45"
          )}
          aria-hidden="true"
        />
      )}
      <div className="min-w-0 flex-1">
        {isTerminalInlineRenaming ? (
          <Input
            autoFocus
            value={editingTerminalNameDraft}
            onChange={(event) => onEditingTerminalNameDraftChange(event.target.value)}
            onBlur={() => onSubmitTerminalRename(item.id, item.name)}
            onKeyDown={handleRenameInputKeyDown}
            className="h-7 rounded-[4px]"
            aria-label="Rename terminal"
          />
        ) : (
          <>
            <div className="truncate text-sm font-medium">{item.name}</div>
            <div className="truncate text-xs text-muted-foreground">
              {kind === "agent" && isAgentBusy && item.lastTerminalLine
                ? item.lastTerminalLine
                : kind === "agent"
                  ? item.branch
                  : item.launchConfig.label}
            </div>
          </>
        )}
      </div>
      {kind === "agent" && isAgentBusy ? <BusyIndicator className="size-3.5 shrink-0" /> : null}
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
  );

  return (
    <Popover
      open={activeSessionPopoverId === item.id}
      onOpenChange={(open: boolean) => setActiveSessionPopoverId(open ? item.id : null)}
    >
      <PopoverTrigger asChild>
        {isTerminalInlineRenaming ? (
          <div
            className={cn(
              "w-full border-l-2 border-transparent py-1.5 pl-5 pr-4 text-left",
              isTerminalRowFocused ? "border-primary bg-primary/10" : "bg-accent/20"
            )}
          >
            {rowContent}
          </div>
        ) : (
          <button
            type="button"
            draggable
            onMouseEnter={() => openSessionPopover(item.id)}
            onMouseLeave={scheduleSessionPopoverClose}
            onFocus={() => openSessionPopover(item.id)}
            onBlur={scheduleSessionPopoverClose}
            onDragStart={(event) => {
              setWorkspaceSplitViewItemDragData(event.dataTransfer, {
                projectId: workspaceId,
                item:
                  kind === "agent"
                    ? {
                        kind: "agent",
                        agentId: item.id,
                        sessionId: item.sessionId
                      }
                    : {
                        kind: "terminal",
                        terminalId: item.id,
                        sessionId: item.sessionId
                      }
              });
            }}
            onContextMenu={(event) => {
              if (kind === "agent") {
                const branchPr = pullRequestStatusByWorkspaceBranch[`${workspaceId}:${item.branch.trim()}`] ?? null;
                const prUrl = branchPr && workspaceSidebarHasPullRequestState(branchPr.state) ? branchPr.webUrl ?? null : null;
                openAgentSessionMenu(workspaceId, item, prUrl, event);
                return;
              }
              openTerminalSessionMenu(workspaceId, item, event);
            }}
            onClick={() =>
              kind === "agent"
                ? workspaceId === focusedProjectId
                  ? onFocusAgent(item.id)
                  : void onFocusWorkspaceAgent(workspaceId, item.id)
                : workspaceId === focusedProjectId
                  ? onFocusTerminal(item.id)
                  : void onFocusWorkspaceTerminal(workspaceId, item.id)
            }
            className={cn(
              "w-full border-l-2 border-transparent py-1.5 pl-5 pr-4 text-left outline-none transition focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-inset",
              isAgentRowFocused || isTerminalRowFocused ? "border-primary bg-primary/10" : "hover:bg-accent/40"
            )}
          >
            {rowContent}
          </button>
        )}
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
};
